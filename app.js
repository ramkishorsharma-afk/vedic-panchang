/* ============================================================
   APP: form handling, rendering, tab logic, payment funnel
   ============================================================ */

/* !!! CONFIGURE THIS BEFORE GOING LIVE !!!
   Get your Key ID from https://dashboard.razorpay.com/app/keys
   This is the PUBLIC key (starts with rzp_live_ or rzp_test_) -
   safe to expose in client code. Never put your Key SECRET here. */
var RAZORPAY_KEY_ID = "rzp_test_REPLACE_ME";
var UNLOCK_PRICE_PAISE = 4900; // Rs 49

var STATE = { chart:null, dashaSeq:null, retro:null, lat:0, lon:0, tz:5.5, birthUTC:null, name:"", unlockedDays:0 };

/* ---------------- Loader / particles / fade-in (shared) ---------------- */
function cpt(){
  var c = document.getElementById("ptcs"); if(!c) return;
  for(var i=0;i<18;i++){
    var p=document.createElement("div"); p.className="ptc";
    p.style.left=Math.random()*100+"%"; p.style.bottom="-10px";
    p.style.animationDuration=(8+Math.random()*12)+"s";
    p.style.animationDelay=(Math.random()*10)+"s";
    var sz=(1+Math.random()*2)+"px"; p.style.width=sz; p.style.height=sz;
    c.appendChild(p);
  }
}
function ofi(){
  var els = document.querySelectorAll(".fi:not(.v)");
  if(!('IntersectionObserver' in window)){
    for(var i=0;i<els.length;i++) els[i].classList.add('v');
    return;
  }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(en, i){
      if(en.isIntersecting){
        (function(el){ setTimeout(function(){ el.classList.add('v'); }, i*60); })(en.target);
        obs.unobserve(en.target);
      }
    });
  }, {threshold:0.1});
  for(var j=0;j<els.length;j++) obs.observe(els[j]);
}
function hideLoader(){ var l=document.getElementById("loader"); if(l) l.classList.add("gone"); }
function showLoader(txt){ var l=document.getElementById("loader"), t=document.getElementById("loaderText"); if(t) t.textContent=txt||"LOADING"; if(l) l.classList.remove("gone"); }

/* ---------------- Tooltip (mouse + touch) ---------------- */
function showTip(x,y,html){
  var t=document.getElementById("tip"); if(!t) return;
  t.innerHTML=html; t.style.left=(x+12)+"px"; t.style.top=(y+12)+"px"; t.classList.add("vis");
}
function hideTip(){ var t=document.getElementById("tip"); if(t) t.classList.remove("vis"); }

/* ---------------- Geocoding (Nominatim / OpenStreetMap) ---------------- */
var geocodeTimer=null;
function initGeocoding(){
  var input=document.getElementById("inPlace"), sugg=document.getElementById("placeSugg");
  if(!input) return;
  input.addEventListener("input", function(){
    var q=input.value.trim();
    clearTimeout(geocodeTimer);
    if(q.length<3){ sugg.classList.remove("on"); return; }
    geocodeTimer=setTimeout(function(){
      fetch("https://nominatim.openstreetmap.org/search?format=json&limit=6&q="+encodeURIComponent(q))
        .then(function(r){ return r.json(); })
        .then(function(list){
          sugg.innerHTML="";
          if(!list || !list.length){ sugg.classList.remove("on"); return; }
          list.forEach(function(item){
            var d=document.createElement("div");
            d.textContent=item.display_name;
            d.onclick=function(){
              input.value=item.display_name;
              document.getElementById("inLat").value=parseFloat(item.lat).toFixed(4);
              document.getElementById("inLon").value=parseFloat(item.lon).toFixed(4);
              sugg.classList.remove("on");
            };
            sugg.appendChild(d);
          });
          sugg.classList.add("on");
        })
        .catch(function(){ sugg.classList.remove("on"); });
    }, 450);
  });
  document.addEventListener("click", function(e){
    if(e.target!==input) sugg.classList.remove("on");
  });
}

/* ---------------- Form submit -> compute chart ---------------- */
function initForm(){
  document.getElementById("btnCalc").onclick = function(){
    var err=document.getElementById("formErr");
    err.style.display="none";
    var dob=document.getElementById("inDob").value;
    var tob=document.getElementById("inTob").value || "06:00";
    var lat=parseFloat(document.getElementById("inLat").value);
    var lon=parseFloat(document.getElementById("inLon").value);
    var tz=parseFloat(document.getElementById("inTz").value);
    var name=document.getElementById("inName").value.trim();

    if(!dob){ err.textContent="Please enter your date of birth."; err.style.display="block"; return; }
    if(isNaN(lat) || isNaN(lon)){ err.textContent="Please search and select your birth place (or enter latitude/longitude manually)."; err.style.display="block"; return; }
    if(isNaN(tz)){ tz=5.5; }

    var parts=dob.split("-"), tparts=tob.split(":");
    var y=+parts[0], mo=+parts[1], d=+parts[2], hh=+tparts[0], mm=+tparts[1];
    // local birth time -> UTC
    var localMs = Date.UTC(y, mo-1, d, hh, mm, 0);
    var birthUTC = new Date(localMs - tz*3600000);

    STATE.lat=lat; STATE.lon=lon; STATE.tz=tz; STATE.birthUTC=birthUTC; STATE.name=name;

    showLoader("CALCULATING YOUR KUNDLI");
    setTimeout(function(){
      try{
        computeAll();
        document.getElementById("formScreen").style.display="none";
        document.getElementById("resultsScreen").style.display="block";
        renderHeader(dob, tob, document.getElementById("inPlace").value);
        renderAllTabs();
        cpt();
      }catch(e){
        console.error("Calculation error:", e);
        err.textContent="Something went wrong calculating your chart. Please check your details and try again.";
        err.style.display="block";
      }
      hideLoader();
    }, 50);
  };

  document.getElementById("btnStartOver").onclick=function(){
    location.reload();
  };
}

function computeAll(){
  STATE.chart = computeChart(STATE.birthUTC, STATE.lat, STATE.lon);
  STATE.retro = computeRetrograde(STATE.birthUTC);
  Object.keys(STATE.retro).forEach(function(p){
    if(STATE.chart.planets[p]) STATE.chart.planets[p].rt = STATE.retro[p];
  });
  var moonLon = STATE.chart.planets.Moon.lon;
  STATE.dashaSeq = computeDashaSequence(STATE.birthUTC, moonLon);
}

/* ---------------- Header ---------------- */
function renderHeader(dob, tob, placeStr){
  var nameEl=document.getElementById("hdrName");
  nameEl.textContent = STATE.name ? (STATE.name+"'s Kundli") : "Janam Kundli";
  var dobDisp = new Date(dob+"T00:00:00").toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"});
  document.getElementById("hdrMeta").innerHTML =
    '<div><i class="fas fa-calendar-alt" style="color:var(--acc);margin-right:5px"></i>'+dobDisp+'</div>'+
    '<div><i class="fas fa-clock" style="color:var(--acc);margin-right:5px"></i>'+tob+' (UTC'+(STATE.tz>=0?'+':'')+STATE.tz+')</div>'+
    '<div><i class="fas fa-map-marker-alt" style="color:var(--acc);margin-right:5px"></i>'+(placeStr||(STATE.lat.toFixed(2)+", "+STATE.lon.toFixed(2)))+'</div>';

  var moon = STATE.chart.planets.Moon;
  var lagnaSign = STATE.chart.lagnaSign;
  var lagnaDeg = degInSign(STATE.chart.lagnaSid).toFixed(2);
  var cur = currentMahaAntar(STATE.dashaSeq, new Date());
  var balanceStr = "";
  if(STATE.dashaSeq[0]){
    var by = STATE.dashaSeq[0].y;
    var y=Math.floor(by), m=Math.floor((by-y)*12), dd=Math.round((((by-y)*12)-m)*30);
    balanceStr = STATE.dashaSeq[0].l+" "+y+"y "+m+"m "+dd+"d";
  }
  document.getElementById("hdrSummary").innerHTML =
    '<span>Lagna: <strong style="color:var(--tx)">'+lagnaSign+' '+lagnaDeg+'\u00B0</strong></span>'+
    '<span>Moon Rashi: <strong style="color:var(--tx)">'+moon.sg+' ('+moon.nk+')</strong></span>'+
    '<span>Nakshatra Lord: <strong style="color:var(--tx)">'+moon.nl+'</strong></span>'+
    '<span>Balance Dasha at Birth: <strong style="color:var(--acc)">'+balanceStr+'</strong></span>';
}

/* ---------------- Tabs ---------------- */
function initTabs(){
  var tbs=document.querySelectorAll(".tbtn");
  for(var t=0;t<tbs.length;t++){
    (function(btn){
      btn.onclick=function(){
        if(btn.classList.contains("lock") && !STATE.unlockedDays){
          switchTab(btn); renderTomorrowPaywall(); return;
        }
        switchTab(btn);
      };
    })(tbs[t]);
  }
}
function switchTab(btn){
  var all=document.querySelectorAll(".tbtn"); for(var i=0;i<all.length;i++) all[i].classList.remove("on");
  var allp=document.querySelectorAll(".tp"); for(var j=0;j<allp.length;j++) allp[j].classList.remove("on");
  btn.classList.add("on");
  var pn=document.getElementById("p-"+btn.dataset.t); pn.classList.add("on");
  var fs=pn.querySelectorAll(".fi"); for(var k=0;k<fs.length;k++){ fs[k].classList.remove("v"); void fs[k].offsetWidth; }
  ofi();
}

function safeRender(fn, label){
  try{ fn(); }catch(e){ console.error(label+" render error:", e); }
}
function renderAllTabs(){
  safeRender(rChart, "chart");
  safeRender(rDasha, "dasha");
  safeRender(rPlanets, "planets");
  safeRender(rHouses, "houses");
  safeRender(rYesterday, "yesterday");
  renderTomorrowPaywall();
  ofi();
}

/* ---------------- Chart grids (Rasi D1 + Navamsha D9) ---------------- */
var CHART_POS = {Aries:[1,3],Taurus:[1,4],Gemini:[2,4],Cancer:[3,4],Leo:[4,4],Virgo:[4,3],Libra:[4,2],Scorpio:[4,1],Sagittarius:[3,1],Capricorn:[2,1],Aquarius:[1,1],Pisces:[1,2]};

function planetsBySign(map, useNav){
  var out={};
  Object.keys(map).forEach(function(name){
    var p=map[name];
    var sg = useNav ? navamshaSign(p.lon) : p.sg;
    if(!out[sg]) out[sg]=[];
    out[sg].push({n:name, s:PLANET_SYM[name], r:p.rt});
  });
  return out;
}

function buildChartGrid(containerId, lagnaSign, byRashi){
  var g=document.getElementById(containerId); if(!g) return;
  g.innerHTML="";
  var c=document.createElement("div"); c.className="gc ctr";
  c.innerHTML='<span style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">Lagna</span><span style="font-size:18px;color:var(--acc)">'+SIGN_SYM[lagnaSign]+'</span><span style="font-size:9px;color:var(--tx2)">'+lagnaSign+'</span>';
  g.appendChild(c);
  SIGNS.forEach(function(sg){
    var pos = CHART_POS[sg];
    var cell=document.createElement("div");
    cell.className="gc"+(sg===lagnaSign?" lg":"");
    cell.style.gridRow=pos[0]; cell.style.gridColumn=pos[1];
    var pl = byRashi[sg]||[];
    var ph="";
    pl.forEach(function(item){ ph+='<span class="ps" style="color:var(--acc2)">'+item.s+(item.r?"\u211E":"")+'</span> '; });
    cell.innerHTML='<span class="ss">'+SIGN_SYM[sg]+'</span><span class="sn">'+SIGN_ABBR[sg]+'</span><div class="pi">'+ph+'</div>';
    var tipHtml = "<strong style='color:var(--acc2)'>"+SIGN_SYM[sg]+" "+sg+"</strong>";
    if(!pl.length){ tipHtml += "<div style='color:var(--tx3);margin-top:3px'>No planets</div>"; }
    else{ pl.forEach(function(item){ tipHtml += "<div style='margin-top:3px'>"+item.s+" <strong>"+item.n+"</strong>"+(item.r?" (R)":"")+"</div>"; }); }
    cell.addEventListener("mouseenter", function(ev){ showTip(ev.clientX, ev.clientY, tipHtml); });
    cell.addEventListener("mousemove", function(ev){ showTip(ev.clientX, ev.clientY, tipHtml); });
    cell.addEventListener("mouseleave", hideTip);
    cell.addEventListener("touchstart", function(ev){
      ev.preventDefault();
      var touch = ev.touches[0];
      showTip(touch.clientX, touch.clientY, tipHtml);
      setTimeout(hideTip, 2200);
    }, {passive:false});
    g.appendChild(cell);
  });
}

function rChart(){
  var p=document.getElementById("p-chart");
  var pk=Object.keys(STATE.chart.planets), lh="";
  pk.forEach(function(n){ var q=STATE.chart.planets[n]; lh+='<span style="display:flex;align-items:center;gap:4px"><span style="color:var(--acc2);font-weight:700">'+PLANET_SYM[n]+'</span> '+n+(q.rt?" (R)":"")+'</span>'; });
  p.innerHTML='<div class="cg"><div class="cw fi"><div class="ct">Rasi Chart (D1)</div><div class="grd" id="rg"></div></div><div class="cw fi"><div class="ct">Navamsha Chart (D9)</div><div class="grd" id="ng"></div></div></div><div style="margin-top:18px;background:var(--card);border:1px solid var(--bdr);border-radius:11px;padding:18px" class="fi"><h3 style="font-size:13px;color:var(--acc);margin-bottom:10px;letter-spacing:1px">Chart Legend</h3><div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px">'+lh+'</div></div>';
  buildChartGrid("rg", STATE.chart.lagnaSign, planetsBySign(STATE.chart.planets, false));
  var navLagna = navamshaSign(STATE.chart.lagnaSid);
  buildChartGrid("ng", navLagna, planetsBySign(STATE.chart.planets, true));
}

/* ---------------- Dasha tab ---------------- */
function fmtMonthYear(d){ return d.toLocaleDateString("en-US",{month:"short",year:"numeric"}); }
function daysBetween(a,b){ return Math.round((b-a)/86400000); }

function rDasha(){
  var p=document.getElementById("p-dasha"), maxYears=20;
  var now=new Date();
  var cur = currentMahaAntar(STATE.dashaSeq, now);
  var h='<div class="sh"><h2>Vimshottari Dasha</h2><div class="ln"></div></div><div style="background:var(--card);border:1px solid var(--bdr);border-radius:11px;padding:18px;margin-bottom:18px" class="fi"><div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center">';
  if(cur.maha){
    h+='<div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">Current Mahadasha</div><div style="font-size:20px;font-weight:700;color:var(--acc2);margin-top:3px">'+PLANET_SYM[cur.maha.l]+' '+cur.maha.l+'</div></div>';
    if(cur.antar){
      h+='<div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">Current Antardasha</div><div style="font-size:16px;font-weight:600;color:var(--acc2);margin-top:3px">'+cur.antar.l+'</div></div>';
      h+='<div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">Period</div><div style="font-size:12px;color:var(--tx2);margin-top:3px">'+fmtMonthYear(cur.antar.st)+' \u2014 '+fmtMonthYear(cur.antar.en)+'</div></div>';
      h+='<div><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">Remaining</div><div style="font-size:12px;color:var(--acc);margin-top:3px;font-weight:600">'+Math.max(0,daysBetween(now,cur.antar.en))+' days</div></div>';
    }
  } else {
    h+='<div style="font-size:12px;color:var(--tx2)">This life span (birth to +120 years) does not include the present date.</div>';
  }
  h+='</div></div><div class="dt fi">';
  STATE.dashaSeq.forEach(function(m, mi){
    var status = now<m.st ? "fut" : now>=m.en ? "pst" : "cur";
    var w = Math.max(7, (m.y/maxYears)*100);
    var ants = antardashasOf(m);
    var ah="";
    ants.forEach(function(a){
      var ac = (now>=a.st && now<a.en) ? "ca" : "";
      ah += '<div class="dai '+ac+'"><div class="dd" style="background:var(--acc2)"></div><span style="color:var(--acc2);font-weight:600;min-width:55px">'+a.l+'</span><span style="color:var(--tx3);font-size:9px">'+fmtMonthYear(a.st)+' \u2014 '+fmtMonthYear(a.en)+'</span></div>';
    });
    h+='<div class="dm" data-m="'+mi+'"><div class="db '+status+'" style="width:'+w+'%"><div class="fl" style="background:var(--acc)"></div><span>'+m.l+'</span><span style="margin-left:auto;color:var(--tx3);font-size:9px">'+m.y.toFixed(1)+'y</span></div><div class="da" id="a-'+mi+'">'+ah+'</div></div>';
  });
  h+='</div>'; p.innerHTML=h;
  var dms=p.querySelectorAll(".dm");
  for(var i=0;i<dms.length;i++){
    (function(el, idx){
      el.querySelector(".db").onclick=function(){
        var al=p.querySelectorAll(".da"); for(var j2=0;j2<al.length;j2++) al[j2].classList.remove("op");
        document.getElementById("a-"+idx).classList.toggle("op");
      };
    })(dms[i], i);
  }
  if(cur.maha){
    var ci = STATE.dashaSeq.indexOf(cur.maha);
    if(ci>=0){ var openEl=document.getElementById("a-"+ci); if(openEl) openEl.classList.add("op"); }
  }
}

/* ---------------- Planets tab ---------------- */
function rPlanets(){
  var p=document.getElementById("p-planets");
  var EXALT={Sun:"Aries",Moon:"Taurus",Mars:"Capricorn",Mercury:"Virgo",Jupiter:"Cancer",Venus:"Pisces",Saturn:"Libra"};
  var DEBIL={Sun:"Libra",Moon:"Scorpio",Mars:"Cancer",Mercury:"Pisces",Jupiter:"Capricorn",Venus:"Virgo",Saturn:"Aries"};
  var order=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  var rows="";
  order.forEach(function(n){
    var q=STATE.chart.planets[n]; if(!q) return;
    var sty,tx;
    if(q.rt){ sty="background:rgba(245,158,11,0.1);color:#f59e0b"; tx="Retrograde"; }
    else if(EXALT[n]===q.sg){ sty="background:rgba(74,222,128,0.1);color:#4ade80"; tx="Exalted"; }
    else if(DEBIL[n]===q.sg){ sty="background:rgba(248,113,113,0.1);color:#f87171"; tx="Debilitated"; }
    else{ sty="background:var(--card2);color:var(--tx3)"; tx="Normal"; }
    rows+='<tr><td style="color:var(--acc2);font-size:16px;font-weight:700;width:36px">'+PLANET_SYM[n]+'</td><td style="font-weight:600">'+n+'</td><td>'+SIGN_SYM[q.sg]+' '+q.sg+'</td><td>'+q.dg.toFixed(2)+'\u00B0</td><td style="font-size:11px">'+q.nk+'</td><td style="font-size:11px">'+q.nl+'</td><td>P'+q.pd+'</td><td><span class="sb" style="'+sty+'">'+tx+'</span></td></tr>';
  });
  p.innerHTML='<div class="sh"><h2>Planetary Positions</h2><div class="ln"></div></div><div style="background:var(--card);border:1px solid var(--bdr);border-radius:11px;overflow:hidden" class="fi"><div style="overflow-x:auto"><table class="tl"><thead><tr><th></th><th>Planet</th><th>Sign</th><th>Degree</th><th>Nakshatra</th><th>Nak. Lord</th><th>Pada</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

/* ---------------- Houses tab ---------------- */
var HOUSE_MEANINGS=["Self, personality, appearance, health","Wealth, family, speech, food habits","Courage, siblings, communication, short travels","Home, mother, comfort, vehicles, property","Children, intelligence, romance, creativity","Enemies, debts, diseases, daily routine","Marriage, partnership, business, foreign travel","Longevity, sudden events, hidden things","Fortune, father, higher education, spirituality","Career, fame, authority, government, karma","Gains, income, friends, social network","Losses, expenses, foreign residence, liberation"];
var SIGN_LORD={Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter"};

function rHouses(){
  var p=document.getElementById("p-houses");
  var lagnaIdx=SIGNS.indexOf(STATE.chart.lagnaSign), cs="";
  for(var i=0;i<12;i++){
    var signIdx=(lagnaIdx+i)%12, sg=SIGNS[signIdx];
    var pls=[];
    Object.keys(STATE.chart.planets).forEach(function(n){ if(STATE.chart.planets[n].hs===i+1) pls.push({n:n, s:PLANET_SYM[n]}); });
    var ph = pls.length ? pls.map(function(x){ return '<span style="background:rgba(212,149,42,0.06);color:var(--acc2);padding:2px 8px;border-radius:16px;font-size:10px;font-weight:600">'+x.s+' '+x.n+'</span>'; }).join(' ') : '<span style="font-size:10px;color:var(--tx3);font-style:italic">No planets</span>';
    cs+='<div class="pc fi"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:32px;height:32px;border-radius:7px;background:rgba(212,149,42,0.08);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--acc)">'+(i+1)+'</div><div><div style="font-size:13px;font-weight:600">'+SIGN_SYM[sg]+' '+sg+'</div><div style="font-size:10px;color:var(--tx3)">Lord: '+SIGN_LORD[sg]+'</div></div></div><p style="font-size:11px;color:var(--tx3);margin-bottom:6px">'+HOUSE_MEANINGS[i]+'</p><div style="display:flex;flex-wrap:wrap;gap:5px">'+ph+'</div></div>';
  }
  p.innerHTML='<div class="sh"><h2>Bhava Analysis \u2014 12 Houses (Whole Sign)</h2><div class="ln"></div></div><div class="pg">'+cs+'</div>';
}

/* ---------------- Personalized day reading (shared by Yesterday/Tomorrow) ---------------- */
var CAREER_HEALTH_LOVE = {
  Sun:{c:"A day of authority and recognition. Leadership qualities are noticed; favorable for government-related work.",h:"Focus on heart health and eyesight. Morning sun exposure is beneficial.",r:"Father figures play a role. Relationships benefit from warmth and directness."},
  Moon:{c:"Emotional intelligence is an asset. Good for counseling, creative work, and public relations.",h:"Pay attention to digestion and mental wellbeing. A light, nourishing diet helps.",r:"Domestic harmony highlighted. Time with family is grounding."},
  Mars:{c:"High energy \u2014 tackle challenging tasks head-on. Good for competitive or assertive situations.",h:"Watch for minor injuries; warm up before physical activity.",r:"Passion runs high. Channel it constructively; avoid needless arguments."},
  Mercury:{c:"Excellent for communication, writing, contracts, and business talks.",h:"Nervous system needs care \u2014 practice slow, deep breathing.",r:"Witty conversation strengthens bonds; good day to clear up misunderstandings."},
  Jupiter:{c:"A day of expansion and wisdom. Good for teaching, consulting, financial planning.",h:"Liver and digestion need attention. A walk in nature helps.",r:"Relationships feel supported; children and mentors bring good news."},
  Venus:{c:"Creative and financial matters are favored. Good for design, art, negotiation.",h:"Kidneys and reproductive health need care. Small indulgences are fine in moderation.",r:"Romance is highlighted. Social gatherings go well."},
  Saturn:{c:"A day for steady, disciplined work. Good for dealing with structure, rules, and older people.",h:"Joints and bones need attention; keep warm.",r:"Relationships may feel duty-bound \u2014 patience helps."}
};
var MOON_SIGN_NOTE={Aries:"Moon in Aries brings impulsiveness and courage \u2014 act decisively but think first.",Taurus:"Moon in Taurus grounds emotions \u2014 stability and patience are allies.",Gemini:"Moon in Gemini creates mental restlessness \u2014 focus on one task at a time.",Cancer:"Moon in Cancer brings emotional depth and intuition \u2014 trust your gut.",Leo:"Moon in Leo brings confidence \u2014 express yourself, but avoid ego clashes.",Virgo:"Moon in Virgo favors analysis and service \u2014 mind the details.",Libra:"Moon in Libra seeks balance and harmony \u2014 partnerships are highlighted.",Scorpio:"Moon in Scorpio intensifies emotion \u2014 transformative conversations are likely.",Sagittarius:"Moon in Sagittarius brings optimism \u2014 broaden your horizons.",Capricorn:"Moon in Capricorn brings emotional discipline \u2014 professional focus is strong.",Aquarius:"Moon in Aquarius favors unconventional thinking \u2014 innovation is favored.",Pisces:"Moon in Pisces enhances intuition and creativity \u2014 spiritual practice is powerful."};

function buildDayReading(panchang, dashaLabel){
  var ruler = panchang.weekdayLord;
  var q = CAREER_HEALTH_LOVE[ruler] || CAREER_HEALTH_LOVE.Saturn;
  var moonNote = MOON_SIGN_NOTE[panchang.moonSign] || "";
  var cd = [
    {t:"Career & Work", tx:q.c, ic:"fa-briefcase", bg:"rgba(96,165,250,0.07)", cl:"#60a5fa"},
    {t:"Health & Wellness", tx:q.h, ic:"fa-heart-pulse", bg:"rgba(74,222,128,0.07)", cl:"#4ade80"},
    {t:"Love & Relations", tx:q.r, ic:"fa-heart", bg:"rgba(244,114,182,0.07)", cl:"#f472b6"},
    {t:"Moon Transit Note", tx:moonNote, ic:"fa-moon", bg:"rgba(226,232,240,0.07)", cl:"#e2e8f0"}
  ];
  var remedies = [
    {ic:"fa-fire", t:"Chant "+ruler+" Mantra", tx:"Chant the "+ruler+" beeja mantra 108 times using a mala. This strengthens the day's ruling planet."},
    {ic:"fa-hand-holding-heart", t:"Charity (Daan)", tx:"A small act of charity or kindness on this day's ruling planet is traditionally considered auspicious."}
  ];
  return {intro: dashaLabel, cards: cd, remedies: remedies};
}

function renderPanchangBlock(panchang){
  var h='<div class="png">';
  h+='<div class="pni"><div class="lb">Tithi</div><div class="vl">'+panchang.tithi+'</div></div>';
  h+='<div class="pni"><div class="lb">Nakshatra</div><div class="vl">'+panchang.nakshatra+' P'+panchang.nakPada+'</div></div>';
  h+='<div class="pni"><div class="lb">Yoga</div><div class="vl">'+panchang.yoga+'</div></div>';
  h+='<div class="pni"><div class="lb">Karana</div><div class="vl">'+panchang.karana+'</div></div>';
  h+='<div class="pni"><div class="lb">Sunrise</div><div class="vl" style="color:var(--grn)">'+fmtTime(panchang.sunrise, STATE.tz)+'</div></div>';
  h+='<div class="pni"><div class="lb">Sunset</div><div class="vl" style="color:var(--rd)">'+fmtTime(panchang.sunset, STATE.tz)+'</div></div>';
  if(panchang.segments){
    h+='<div class="pni"><div class="lb">Rahu Kalam</div><div class="vl" style="color:var(--rd)">'+fmtTime(panchang.segments.rahu.start,STATE.tz)+' \u2013 '+fmtTime(panchang.segments.rahu.end,STATE.tz)+'</div></div>';
    h+='<div class="pni"><div class="lb">Yamaganda</div><div class="vl" style="color:var(--rd)">'+fmtTime(panchang.segments.yama.start,STATE.tz)+' \u2013 '+fmtTime(panchang.segments.yama.end,STATE.tz)+'</div></div>';
  }
  if(panchang.abhijit){
    h+='<div class="pni"><div class="lb">Abhijit Muhurta</div><div class="vl" style="color:var(--grn)">'+fmtTime(panchang.abhijit.start,STATE.tz)+' \u2013 '+fmtTime(panchang.abhijit.end,STATE.tz)+'</div></div>';
  }
  h+='</div>';
  return h;
}

/* ---------------- Yesterday tab (FREE) ---------------- */
function rYesterday(){
  var p=document.getElementById("p-yesterday");
  var yday=new Date(); yday.setUTCDate(yday.getUTCDate()-1);
  var panchang = computePanchang(yday, STATE.lat, STATE.lon);
  var cur = currentMahaAntar(STATE.dashaSeq, yday);
  var dashaLabel = cur.maha ? ("You were in <strong style='color:var(--acc2)'>"+cur.maha.l+" Mahadasha</strong>"+(cur.antar?" and <strong style='color:var(--acc2)'>"+cur.antar.l+" Antardasha</strong>":"")+" \u2014 this combination shapes how yesterday's planetary weather interacted with your chart.") : "";
  var reading = buildDayReading(panchang, dashaLabel);

  var h='<div class="sh"><h2>Yesterday\u2019s Reading</h2><div class="ln"></div></div>';
  h+='<div style="background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--bdr);border-radius:11px;padding:18px;margin-bottom:18px;text-align:center" class="fi"><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:2px">'+yday.toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+'</div><div style="font-size:26px;font-weight:900;color:var(--acc2);margin:6px 0;font-family:Cinzel,serif">'+panchang.weekday+'</div><div style="font-size:12px;color:var(--tx2)">Day Lord: <strong>'+PLANET_SYM[panchang.weekdayLord]+' '+panchang.weekdayLord+'</strong> &nbsp;|&nbsp; Moon Transit: <strong>'+SIGN_SYM[panchang.moonSign]+' '+panchang.moonSign+'</strong></div></div>';
  h+='<div style="margin-bottom:18px" class="fi"><h3 style="font-size:13px;color:var(--acc);margin-bottom:10px;letter-spacing:1px"><i class="fas fa-moon" style="margin-right:7px"></i>Panchang for Yesterday</h3>'+renderPanchangBlock(panchang)+'</div>';
  h+='<div style="background:var(--card);border:1px solid var(--bdr);border-radius:11px;padding:18px;margin-bottom:18px" class="fi"><h3 style="font-size:13px;color:var(--acc);margin-bottom:10px;letter-spacing:1px"><i class="fas fa-hourglass-half" style="margin-right:7px"></i>Your Dasha Influence</h3><p style="font-size:12px;color:var(--tx2);line-height:1.7">'+reading.intro+'</p></div>';
  h+='<div class="pg" style="margin-bottom:18px">';
  reading.cards.forEach(function(c){ h+='<div class="pc fi"><div class="ic" style="background:'+c.bg+';color:'+c.cl+'"><i class="fas '+c.ic+'"></i></div><h4>'+c.t+'</h4><p>'+c.tx+'</p></div>'; });
  h+='</div>';
  h+='<div class="paywall fi"><i class="fas fa-circle-check" style="font-size:22px;color:var(--grn)"></i><p style="font-size:13px;margin:10px 0;color:var(--tx2)">Was this an accurate reflection of your yesterday?</p><button class="btn" id="btnGoTomorrow" style="max-width:320px;margin:0 auto"><i class="fas fa-sun"></i> Yes \u2014 Show Me Tomorrow</button></div>';
  p.innerHTML=h;
  var goBtn=document.getElementById("btnGoTomorrow");
  if(goBtn) goBtn.onclick=function(){
    var tomorrowTab=document.querySelector('.tbtn[data-t="tomorrow"]');
    switchTab(tomorrowTab);
  };
}

/* ---------------- Tomorrow tab (PAID) ---------------- */
function renderTomorrowPaywall(){
  var p=document.getElementById("p-tomorrow");
  if(STATE.unlockedDays>0){ renderTomorrowContent(); return; }
  var h='<div class="sh"><h2>Tomorrow\u2019s Reading</h2><div class="ln"></div></div>';
  h+='<div class="paywall fi"><i class="fas fa-lock" style="font-size:26px;color:var(--acc)"></i><div class="pr">\u20B949</div><p style="font-size:13px;color:var(--tx2);margin-bottom:14px">Unlock your personalized Panchang and dasha-based reading for tomorrow, calculated from your real birth chart.</p><button class="btn" id="btnPay" style="max-width:320px;margin:0 auto"><i class="fas fa-unlock"></i> Unlock Tomorrow \u2014 \u20B949</button></div>';
  p.innerHTML=h;
  var payBtn=document.getElementById("btnPay");
  if(payBtn) payBtn.onclick=startPayment;
}

function startPayment(){
  if(!window.Razorpay || RAZORPAY_KEY_ID.indexOf("REPLACE_ME")>=0){
    alert("Payments are not configured yet. Add your real Razorpay Key ID in app.js (RAZORPAY_KEY_ID) before going live.");
    return;
  }
  var options = {
    key: RAZORPAY_KEY_ID,
    amount: UNLOCK_PRICE_PAISE,
    currency: "INR",
    name: "Janam Kundli",
    description: "Unlock day +" + (STATE.unlockedDays+1) + " reading",
    handler: function(response){
      STATE.unlockedDays += 1;
      renderTomorrowContent();
    },
    theme: { color: "#d4952a" }
  };
  var rzp = new Razorpay(options);
  rzp.open();
}

function renderTomorrowContent(){
  var p=document.getElementById("p-tomorrow");
  var target=new Date(); target.setUTCDate(target.getUTCDate() + STATE.unlockedDays);
  var panchang = computePanchang(target, STATE.lat, STATE.lon);
  var cur = currentMahaAntar(STATE.dashaSeq, target);
  var dashaLabel = cur.maha ? ("You will be in <strong style='color:var(--acc2)'>"+cur.maha.l+" Mahadasha</strong>"+(cur.antar?" and <strong style='color:var(--acc2)'>"+cur.antar.l+" Antardasha</strong>":"")+" \u2014 keep this combination in mind as the day unfolds.") : "";
  var reading = buildDayReading(panchang, dashaLabel);
  var dayLabel = STATE.unlockedDays===1 ? "Tomorrow" : ("Day +"+STATE.unlockedDays);

  var h='<div class="sh"><h2>'+dayLabel+'\u2019s Reading</h2><div class="ln"></div></div>';
  h+='<div style="background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--bdr);border-radius:11px;padding:18px;margin-bottom:18px;text-align:center" class="fi"><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:2px">'+target.toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+'</div><div style="font-size:26px;font-weight:900;color:var(--acc2);margin:6px 0;font-family:Cinzel,serif">'+panchang.weekday+'</div><div style="font-size:12px;color:var(--tx2)">Day Lord: <strong>'+PLANET_SYM[panchang.weekdayLord]+' '+panchang.weekdayLord+'</strong> &nbsp;|&nbsp; Moon Transit: <strong>'+SIGN_SYM[panchang.moonSign]+' '+panchang.moonSign+'</strong></div></div>';
  h+='<div style="margin-bottom:18px" class="fi"><h3 style="font-size:13px;color:var(--acc);margin-bottom:10px;letter-spacing:1px"><i class="fas fa-moon" style="margin-right:7px"></i>Panchang</h3>'+renderPanchangBlock(panchang)+'</div>';
  h+='<div style="background:var(--card);border:1px solid var(--bdr);border-radius:11px;padding:18px;margin-bottom:18px" class="fi"><h3 style="font-size:13px;color:var(--acc);margin-bottom:10px;letter-spacing:1px"><i class="fas fa-hourglass-half" style="margin-right:7px"></i>Dasha Influence</h3><p style="font-size:12px;color:var(--tx2);line-height:1.7">'+dashaLabel+'</p></div>';
  h+='<div class="pg" style="margin-bottom:18px">';
  reading.cards.forEach(function(c){ h+='<div class="pc fi"><div class="ic" style="background:'+c.bg+';color:'+c.cl+'"><i class="fas '+c.ic+'"></i></div><h4>'+c.t+'</h4><p>'+c.tx+'</p></div>'; });
  h+='</div>';
  h+='<div class="paywall fi"><i class="fas fa-circle-check" style="font-size:22px;color:var(--grn)"></i><p style="font-size:13px;margin:10px 0;color:var(--tx2)">Want to keep going?</p><button class="btn" id="btnPayNext" style="max-width:320px;margin:0 auto"><i class="fas fa-unlock"></i> Unlock Day +'+(STATE.unlockedDays+1)+' \u2014 \u20B949</button></div>';
  p.innerHTML=h;
  var lockBtn=document.querySelector('.tbtn[data-t="tomorrow"]');
  if(lockBtn){ lockBtn.classList.remove("lock"); lockBtn.innerHTML='<i class="fas fa-sun"></i>'+dayLabel; }
  var payNext=document.getElementById("btnPayNext");
  if(payNext) payNext.onclick=startPayment;
  ofi();
}

/* ---------------- INIT ---------------- */
window.addEventListener("DOMContentLoaded", function(){
  try{ initGeocoding(); }catch(e){ console.error("geocoding init error", e); }
  try{ initForm(); }catch(e){ console.error("form init error", e); }
  try{ initTabs(); }catch(e){ console.error("tabs init error", e); }
  hideLoader();
});
