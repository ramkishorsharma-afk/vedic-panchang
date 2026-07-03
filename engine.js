/* ============================================================
   VEDIC ASTROLOGY CALCULATION ENGINE
   Uses astronomy-engine (github.com/cosinekitty/astronomy) for
   real planetary ephemeris, converted to sidereal (Vedic)
   positions using the Lahiri Ayanamsha.
   ============================================================ */

var SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
var SIGN_SYM = {Aries:"\u2648",Taurus:"\u2649",Gemini:"\u264A",Cancer:"\u264B",Leo:"\u264C",Virgo:"\u264D",Libra:"\u264E",Scorpio:"\u264F",Sagittarius:"\u2650",Capricorn:"\u2651",Aquarius:"\u2652",Pisces:"\u2653"};
var SIGN_ABBR = {Aries:"Ar",Taurus:"Ta",Gemini:"Ge",Cancer:"Cn",Leo:"Le",Virgo:"Vi",Libra:"Li",Scorpio:"Sc",Sagittarius:"Sg",Capricorn:"Cp",Aquarius:"Aq",Pisces:"Pi"};
var NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
var DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
var DASHA_YEARS = {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
var PLANET_SYM = {Sun:"\u2609",Moon:"\u263D",Mars:"\u2642",Mercury:"\u263F",Jupiter:"\u2643",Venus:"\u2640",Saturn:"\u2644",Rahu:"\u260A",Ketu:"\u260B"};

function norm360(x){ x = x % 360; if(x<0) x += 360; return x; }

/* Lahiri Ayanamsha - linear approximation anchored to the standard
   1900.0 epoch value (22.4617 deg) with the IAU precession rate
   (~50.2388"/yr = 0.013955 deg/yr). Accurate to within ~1-2 arcmin
   across the last two centuries, which is standard practice for
   client-side (non Swiss-Ephemeris) Vedic calculators. */
function lahiriAyanamsha(date){
  var jd = date.getTime()/86400000 + 2440587.5;
  var yearsSince1900 = (jd - 2415020.0) / 365.25;
  return 22.4617 + 0.013955 * yearsSince1900;
}

function toSidereal(tropicalLon, date){
  return norm360(tropicalLon - lahiriAyanamsha(date));
}

function signOf(lon){ return SIGNS[Math.floor(norm360(lon)/30)]; }
function degInSign(lon){ return norm360(lon) % 30; }

function nakshatraOf(lon){
  var span = 360/27;
  var l = norm360(lon);
  var idx = Math.floor(l/span);
  if(idx>26) idx = 26;
  var posInNak = l - idx*span;
  var pada = Math.floor(posInNak/(span/4)) + 1;
  if(pada>4) pada = 4;
  var lord = DASHA_ORDER[idx % 9];
  return {name:NAKSHATRAS[idx], idx:idx, pada:pada, lord:lord, posInNak:posInNak, span:span};
}

/* Mean lunar node (Rahu), Meeus formula. Traditional Vedic software
   (paired with Lahiri ayanamsha) conventionally uses the mean node. */
function meanNodeLongitude(date){
  var jd = date.getTime()/86400000 + 2440587.5;
  var T = (jd - 2451545.0)/36525;
  var omega = 125.0445479 - 1934.1362891*T + 0.0020754*T*T + (T*T*T)/467441 - (T*T*T*T)/60616000;
  return norm360(omega);
}

function obliquity(date){
  var jd = date.getTime()/86400000 + 2440587.5;
  var T = (jd - 2451545.0)/36525;
  return 23.4392911 - 0.0130042*T;
}

/* Compute all tropical geocentric ecliptic longitudes for a given UTC Date */
function tropicalPositions(date){
  var out = {};
  out.Sun = Astronomy.SunPosition(date).elon;
  out.Moon = Astronomy.EclipticGeoMoon(date).lon;
  ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(b){
    out[b] = Astronomy.EclipticLongitude(Astronomy.Body[b], date);
  });
  out.Rahu = meanNodeLongitude(date);
  out.Ketu = norm360(out.Rahu + 180);
  return out;
}

/* Sidereal Ascendant (Lagna) for a given UTC Date + geographic lat/lon */
function computeLagna(date, lat, lon){
  var time = Astronomy.MakeTime(date);
  var gastHours = Astronomy.SiderealTime(time); // Greenwich Apparent Sidereal Time
  var lstDeg = norm360(gastHours*15 + lon);
  var eps = obliquity(date) * Math.PI/180;
  var latR = lat * Math.PI/180;
  var lstR = lstDeg * Math.PI/180;
  var ascR = Math.atan2(-Math.cos(lstR), Math.sin(eps)*Math.tan(latR) + Math.cos(eps)*Math.sin(lstR));
  var ascDeg = norm360(ascR*180/Math.PI);
  return toSidereal(ascDeg, date);
}

/* Full sidereal chart: planets + lagna, houses (whole sign from Lagna) */
function computeChart(date, lat, lon){
  var trop = tropicalPositions(date);
  var sid = {};
  Object.keys(trop).forEach(function(k){ sid[k] = toSidereal(trop[k], date); });
  var lagnaSid = computeLagna(date, lat, lon);
  var lagnaSignIdx = Math.floor(lagnaSid/30);

  var planets = {};
  Object.keys(sid).forEach(function(name){
    var lon2 = sid[name];
    var signIdx = Math.floor(lon2/30);
    var houseNum = ((signIdx - lagnaSignIdx) % 12 + 12) % 12 + 1;
    var nak = nakshatraOf(lon2);
    planets[name] = {
      lon: lon2,
      sg: SIGNS[signIdx],
      dg: degInSign(lon2),
      nk: nak.name, nkIdx: nak.idx, pd: nak.pada, nl: nak.lord,
      hs: houseNum,
      rt: false /* retrograde flagged separately via computeRetrograde */
    };
  });
  return {planets: planets, lagnaSid: lagnaSid, lagnaSign: SIGNS[lagnaSignIdx]};
}

/* Retrograde check: compare longitude now vs +1 day later for outer/inner planets */
function computeRetrograde(date){
  var d2 = new Date(date.getTime() + 86400000);
  var t1 = tropicalPositions(date), t2 = tropicalPositions(d2);
  var retro = {};
  ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(b){
    var diff = norm360(t2[b]-t1[b]);
    retro[b] = diff > 180; // moving backward in longitude
  });
  return retro;
}

/* Navamsha (D9) sign for a sidereal longitude - standard shortcut formula */
function navamshaSign(lon){
  var l = norm360(lon);
  var signIdx = Math.floor(l/30);
  var degIn = l % 30;
  var padaNum = Math.floor(degIn/(30/9));
  var navIdx = (signIdx*9 + padaNum) % 12;
  return SIGNS[navIdx];
}

/* ---------------- Vimshottari Dasha (real, from Moon's nakshatra) ---------------- */
function addYears(date, years){
  var ms = years * 365.25 * 86400000;
  return new Date(date.getTime() + ms);
}

function computeDashaSequence(birthDate, moonSiderealLon){
  var nak = nakshatraOf(moonSiderealLon);
  var startLord = nak.lord;
  var elapsedFraction = nak.posInNak / nak.span;
  var remainingFraction = 1 - elapsedFraction;
  var balanceYears = remainingFraction * DASHA_YEARS[startLord];

  var seq = [];
  var cursor = new Date(birthDate);
  seq.push({l:startLord, st:new Date(cursor), y:balanceYears, en:addYears(cursor, balanceYears)});
  cursor = addYears(cursor, balanceYears);

  var startIdx = DASHA_ORDER.indexOf(startLord);
  for(var i=1;i<=9;i++){ // full 120-year cycle beyond the starting lord
    var lord = DASHA_ORDER[(startIdx+i) % 9];
    var yrs = DASHA_YEARS[lord];
    seq.push({l:lord, st:new Date(cursor), y:yrs, en:addYears(cursor, yrs)});
    cursor = addYears(cursor, yrs);
  }
  return seq;
}

function antardashasOf(maha){
  var out = [], s = new Date(maha.st), totalMonths = maha.y*12;
  for(var i=0;i<9;i++){
    var lord = DASHA_ORDER[i];
    var months = (DASHA_YEARS[lord]/120) * totalMonths;
    var e = new Date(s.getTime() + months*30.4368*86400000);
    out.push({l:lord, st:new Date(s), en:e});
    s = e;
  }
  return out;
}

function currentMahaAntar(seq, now){
  var maha=null, antar=null;
  for(var i=0;i<seq.length;i++){ if(now>=seq[i].st && now<seq[i].en){ maha=seq[i]; break; } }
  if(maha){
    var ants = antardashasOf(maha);
    for(var j=0;j<ants.length;j++){ if(now>=ants[j].st && now<ants[j].en){ antar=ants[j]; break; } }
  }
  return {maha:maha, antar:antar};
}

/* ---------------- Panchang (real, for any date + place) ---------------- */
var TITHI_NAMES = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima/Amavasya"];
var YOGA_NAMES = ["Vishkumbha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarman","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Paridha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahman","Indra","Vaidhriti"];
var KARANA_NAMES = ["Kimstughna","Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"];
var WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var WEEKDAY_LORD = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
var RAHU_SEG = [8,2,7,5,6,4,3], YAMA_SEG=[5,4,3,2,1,7,6], GULIKA_SEG=[7,6,5,4,3,2,1];

function karanaName(idx){
  if(idx===0) return "Kimstughna";
  if(idx===58) return "Shakuni";
  if(idx===59) return "Chatushpada"; // idx 59 alt cycle handled below
  var m = (idx-1) % 7;
  return KARANA_NAMES[m+1];
}

function computePanchang(date, lat, lon){
  var trop = tropicalPositions(date);
  var sunSid = toSidereal(trop.Sun, date);
  var moonSid = toSidereal(trop.Moon, date);
  var elong = norm360(trop.Moon - trop.Sun); // tithi uses tropical difference (ayanamsha cancels out)

  var tithiIdx = Math.floor(elong/12); // 0-29
  var paksha = tithiIdx < 15 ? "Shukla" : "Krishna";
  var tithiInPaksha = tithiIdx < 15 ? tithiIdx : tithiIdx-15;
  var tithiName = tithiInPaksha===14 ? (paksha==="Shukla"?"Purnima":"Amavasya") : TITHI_NAMES[tithiInPaksha];

  var yogaSum = norm360(trop.Sun + trop.Moon);
  var yogaIdx = Math.floor(yogaSum/(360/27));

  var karanaNum = Math.floor(elong/6); // 0-59
  var kName;
  if(karanaNum===0) kName="Kimstughna";
  else if(karanaNum===57) kName="Shakuni";
  else if(karanaNum===58) kName="Chatushpada";
  else if(karanaNum===59) kName="Naga";
  else kName = KARANA_NAMES[1 + ((karanaNum-1)%7)];

  var nak = nakshatraOf(moonSid);
  var weekday = date.getUTCDay(); // note: local weekday determined by caller using local date components

  var observer = new Astronomy.Observer(lat, lon, 0);
  var sunriseInfo = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, new Date(date.getTime()-43200000), 2);
  var sunsetInfo = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 2);
  var sunrise = sunriseInfo ? sunriseInfo.date : null;
  var sunset = sunsetInfo ? sunsetInfo.date : null;

  var segments = null, abhijit = null;
  if(sunrise && sunset && sunset>sunrise){
    var dayLen = sunset.getTime() - sunrise.getTime();
    var part = dayLen/8;
    var mkRange = function(segNum){
      var s = new Date(sunrise.getTime() + (segNum-1)*part);
      var e = new Date(sunrise.getTime() + segNum*part);
      return {start:s, end:e};
    };
    segments = {rahu: mkRange(RAHU_SEG[weekday]), yama: mkRange(YAMA_SEG[weekday]), gulika: mkRange(GULIKA_SEG[weekday])};
    var muhurta = dayLen/15;
    var noon = new Date((sunrise.getTime()+sunset.getTime())/2);
    abhijit = {start:new Date(noon.getTime()-muhurta/2), end:new Date(noon.getTime()+muhurta/2)};
  }

  return {
    tithi: paksha+" "+tithiName, tithiIdx:tithiIdx,
    yoga: YOGA_NAMES[yogaIdx],
    karana: kName,
    nakshatra: nak.name, nakPada: nak.pada,
    weekday: WEEKDAYS[weekday], weekdayLord: WEEKDAY_LORD[weekday],
    moonSign: signOf(moonSid), sunSign: signOf(sunSid),
    sunrise: sunrise, sunset: sunset, segments: segments, abhijit: abhijit
  };
}

function fmtTime(d, tzOffsetHours){
  if(!d) return "--:--";
  var local = new Date(d.getTime() + tzOffsetHours*3600000);
  var h = local.getUTCHours(), m = local.getUTCMinutes();
  var ampm = h>=12 ? "PM":"AM";
  var h12 = h%12; if(h12===0) h12=12;
  return h12+":"+(m<10?"0":"")+m+" "+ampm;
}
