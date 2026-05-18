/**
 * MAIN.JS — Homepage Controller
 */

// ---- STARS ----
function createStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  const count = 120;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      width:${Math.random()*2+1}px;
      height:${Math.random()*2+1}px;
      background:rgba(242,212,114,${Math.random()*0.7+0.2});
      border-radius:50%;
      animation:twinkle ${Math.random()*3+2}s ease-in-out infinite alternate;
      animation-delay:${Math.random()*4}s;
    `;
    container.appendChild(s);
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes twinkle {
      from { opacity: 0.2; transform: scale(1); }
      to   { opacity: 1;   transform: scale(1.3); }
    }
  `;
  document.head.appendChild(style);
}

// ---- LANG TOGGLE ----
let currentLang = 'hi';
function setupLangToggle() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    currentLang = currentLang === 'hi' ? 'en' : 'hi';
    document.body.classList.toggle('lang-en', currentLang === 'en');
    localStorage.setItem('lang', currentLang);
  });
  const saved = localStorage.getItem('lang');
  if (saved) {
    currentLang = saved;
    document.body.classList.toggle('lang-en', currentLang === 'en');
  }
}

// ---- FORMAT TIME ----
function fmtTime(h) {
  h = (h % 24 + 24) % 24;
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const ap = hh >= 12 ? 'PM' : 'AM';
  return `${((hh%12)||12).toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')} ${ap}`;
}

// ---- HERO DATE ----
function renderHeroDate(date) {
  const el = document.getElementById('heroDate');
  if (!el) return;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  el.textContent = `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ---- RENDER PANCHANG ----
function renderPanchang(lat, lon) {
  const now = new Date();
  const jd  = Panchang.toJulianDate(now);

  renderHeroDate(now);

  // Tithi
  const tithi = Panchang.getTithi(jd);
  document.getElementById('tithi-value').textContent = tithi.nameHi;
  document.getElementById('tithi-sub').textContent   = tithi.pakshaHi;

  // Nakshatra
  const nak = Panchang.getNakshatra(jd);
  document.getElementById('nakshatra-value').textContent = nak.nameHi;
  document.getElementById('nakshatra-sub').textContent   = `पाद ${nak.pada}`;

  // Yoga
  const yoga = Panchang.getYoga(jd);
  document.getElementById('yoga-value').textContent = yoga.nameHi;
  document.getElementById('yoga-sub').textContent   = yoga.nameEn;

  // Karan
  const karan = Panchang.getKaran(jd);
  document.getElementById('karan-value').textContent = karan.nameHi;
  document.getElementById('karan-sub').textContent   = karan.nameEn;

  // Var
  const varDay = Panchang.getVar(now);
  document.getElementById('var-value').textContent = varDay.nameHi;
  document.getElementById('var-sub').textContent   = varDay.deityHi;

  // Sun/Moon
  const sunTimes = Panchang.getSunTimes(now, lat, lon);
  if (sunTimes) {
    document.getElementById('sunrise').textContent  = sunTimes.sunrise;
    document.getElementById('sunset').textContent   = sunTimes.sunset;
    const dur = sunTimes.setH - sunTimes.riseH;
    const h = Math.floor(dur), m = Math.round((dur - h)*60);
    document.getElementById('dayDuration').textContent = `${h}h ${m}m`;

    // Progress bar
    const nowH = now.getHours() + now.getMinutes()/60;
    const pct = Math.max(0, Math.min(1, (nowH - sunTimes.riseH) / (sunTimes.setH - sunTimes.riseH)));
    document.querySelector('.sunrise-bar').style.setProperty('--day-pct', (pct*100)+'%');

    // Rahukaal
    const times = Panchang.getRahukaal(now, sunTimes.riseH, sunTimes.setH);
    renderTimes(times);
  }

  document.getElementById('sunSign').textContent  = Panchang.getSunRashi(jd).nameHi;
  document.getElementById('moonSign').textContent = Panchang.getMoonRashi(jd).nameHi;

  const phase = Panchang.getMoonPhase(jd);
  document.getElementById('moonPhase').textContent = phase.nameHi;
  document.getElementById('moonrise').textContent  = '—';
  document.getElementById('moonset').textContent   = '—';

  // Festivals
  renderFestivals(now);
}

// ---- TIMES ----
function renderTimes(times) {
  const grid = document.getElementById('timesGrid');
  if (!grid) return;
  const items = [
    { nameHi:'राहुकाल',    nameEn:'Rahukaal',    type:'inauspicious', time: times.rahukaal.start+' – '+times.rahukaal.end },
    { nameHi:'यमगण्ड',    nameEn:'Yamaganda',   type:'inauspicious', time: times.yamaganda.start+' – '+times.yamaganda.end },
    { nameHi:'गुलिक काल', nameEn:'Gulika Kaal', type:'inauspicious', time: times.gulika.start+' – '+times.gulika.end },
    { nameHi:'अभिजीत',    nameEn:'Abhijit',     type:'auspicious',   time: times.abhijit.start+' – '+times.abhijit.end },
    { nameHi:'ब्रह्म मुहूर्त', nameEn:'Brahma Muhurat', type:'auspicious', time:'04:24 AM – 05:12 AM' },
    { nameHi:'विजय मुहूर्त', nameEn:'Vijay Muhurat',   type:'auspicious', time:'02:15 PM – 03:00 PM' },
  ];
  grid.innerHTML = items.map(i => `
    <div class="time-card ${i.type}">
      <div class="time-card-label hi">${i.type === 'auspicious' ? '✅ शुभ काल' : '⛔ अशुभ काल'}</div>
      <div class="time-card-label en" style="display:none">${i.type === 'auspicious' ? '✅ Auspicious' : '⛔ Inauspicious'}</div>
      <div class="time-card-name hi">${i.nameHi}</div>
      <div class="time-card-name en" style="display:none">${i.nameEn}</div>
      <div class="time-card-time">${i.time}</div>
    </div>
  `).join('');
  if (document.body.classList.contains('lang-en')) {
    grid.querySelectorAll('.hi').forEach(el => el.style.display = 'none');
    grid.querySelectorAll('.en').forEach(el => el.style.display = 'block');
  }
}

// ---- FESTIVALS ----
function renderFestivals(date) {
  const list = document.getElementById('festivalList');
  if (!list) return;
  const festivals = Panchang.getFestivalsForDate(date);
  if (festivals.length === 0) {
    list.innerHTML = `<div class="festival-item">
      <div class="festival-icon">🕉️</div>
      <div>
        <div class="festival-name hi">आज कोई विशेष पर्व नहीं</div>
        <div class="festival-name en" style="display:none">No special festival today</div>
        <div class="festival-desc hi">नित्य पूजा करें, ईश्वर की कृपा प्राप्त करें</div>
        <div class="festival-desc en" style="display:none">Perform daily worship, receive divine blessings</div>
      </div>
    </div>`;
    return;
  }
  list.innerHTML = festivals.map((f, i) => `
    <div class="festival-item" style="animation-delay:${i*0.1}s">
      <div class="festival-icon">${f.icon}</div>
      <div>
        <div class="festival-name hi">${f.nameHi}</div>
        <div class="festival-name en" style="display:none">${f.nameEn}</div>
      </div>
      <span class="festival-tag">${f.type === 'national' ? 'राष्ट्रीय' : 'हिन्दू पर्व'}</span>
    </div>
  `).join('');
}

// ---- GEOLOCATION ----
function initPanchang() {
  createStars();
  setupLangToggle();

  const defaultLat = 28.6139, defaultLon = 77.2090; // Delhi default

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // Reverse geocode
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then(r => r.json())
          .then(data => {
            const city = data.address.city || data.address.town || data.address.village || 'आपका स्थान';
            const state = data.address.state || '';
            const locEl = document.getElementById('heroLocation');
            if (locEl) locEl.textContent = `📍 ${city}, ${state}`;
          })
          .catch(() => {});
        renderPanchang(lat, lon);
      },
      () => {
        const locEl = document.getElementById('heroLocation');
        if (locEl) locEl.textContent = '📍 नई दिल्ली, भारत';
        renderPanchang(defaultLat, defaultLon);
      }
    );
  } else {
    renderPanchang(defaultLat, defaultLon);
  }
}

document.addEventListener('DOMContentLoaded', initPanchang);
