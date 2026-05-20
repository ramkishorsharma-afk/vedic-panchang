/**
 * MAIN.JS — Homepage Controller
 * Location: City search input (replaces geolocation)
 */

// ---- STARS ----
function createStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  for (let i = 0; i < 120; i++) {
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
      from { opacity:0.2; transform:scale(1); }
      to   { opacity:1;   transform:scale(1.3); }
    }

    /* ---- Location Search Box ---- */
    .location-search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      margin: 8px auto 0;
      flex-wrap: wrap;
    }
    .location-search-inner {
      position: relative;
      display: flex;
      align-items: center;
    }
    #cityInput {
      background: rgba(255,255,255,0.08);
      border: 1.5px solid rgba(242,212,114,0.35);
      border-radius: 24px;
      color: #f2d472;
      font-family: inherit;
      font-size: 0.92rem;
      padding: 7px 38px 7px 16px;
      outline: none;
      width: 220px;
      transition: border-color 0.2s, background 0.2s;
    }
    #cityInput::placeholder { color: rgba(242,212,114,0.45); }
    #cityInput:focus {
      border-color: rgba(242,212,114,0.8);
      background: rgba(255,255,255,0.13);
    }
    #citySearchBtn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      padding: 0;
      color: #f2d472;
      opacity: 0.8;
      transition: opacity 0.2s, transform 0.2s;
    }
    #citySearchBtn:hover { opacity: 1; transform: scale(1.15); }

    /* Suggestions dropdown */
    #citySuggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #1a1235;
      border: 1.5px solid rgba(242,212,114,0.3);
      border-radius: 12px;
      overflow: hidden;
      z-index: 999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      max-height: 220px;
      overflow-y: auto;
    }
    #citySuggestions:empty { display: none; }
    .suggestion-item {
      padding: 9px 16px;
      font-size: 0.88rem;
      color: #e8d5a3;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      transition: background 0.15s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: rgba(242,212,114,0.12); }
    .suggestion-item .sug-icon { font-size: 0.85rem; opacity: 0.7; }

    /* Search loading spinner */
    .search-loading {
      text-align: center;
      padding: 10px;
      color: rgba(242,212,114,0.6);
      font-size: 0.82rem;
    }

    /* Hero location styling tweak */
    #heroLocation {
      cursor: default;
      min-height: 22px;
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

// ---- HERO DATE ----
function renderHeroDate(date) {
  const el = document.getElementById('heroDate');
  if (!el) return;
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  el.textContent = `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ---- RENDER PANCHANG ----
function renderPanchang(lat, lon, locationName) {
  const now = new Date();
  const jd  = Panchang.toJulianDate(now);

  renderHeroDate(now);

  // Update location label
  const locEl = document.getElementById('heroLocation');
  if (locEl && locationName) locEl.textContent = '📍 ' + locationName;

  // Save last used location
  localStorage.setItem('lastLocation', JSON.stringify({ lat, lon, name: locationName }));

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

  // Sun times
  const sunTimes = Panchang.getSunTimes(now, lat, lon);
  if (sunTimes) {
    document.getElementById('sunrise').textContent    = sunTimes.sunrise;
    document.getElementById('sunset').textContent     = sunTimes.sunset;
    const dur = sunTimes.setH - sunTimes.riseH;
    const h = Math.floor(dur), m = Math.round((dur - h) * 60);
    document.getElementById('dayDuration').textContent = `${h}h ${m}m`;

    // Sunrise progress bar
    const nowH = now.getHours() + now.getMinutes() / 60;
    const pct  = Math.max(0, Math.min(1, (nowH - sunTimes.riseH) / (sunTimes.setH - sunTimes.riseH)));
    const bar  = document.querySelector('.sunrise-bar');
    if (bar) bar.style.setProperty('--day-pct', (pct * 100) + '%');

    // Rahukaal
    const times = Panchang.getRahukaal(now, sunTimes.riseH, sunTimes.setH);
    renderTimes(times);
  }

  // Sun/Moon details
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
    { nameHi:'राहुकाल',        nameEn:'Rahukaal',       type:'inauspicious', time: times.rahukaal.start  + ' – ' + times.rahukaal.end },
    { nameHi:'यमगण्ड',        nameEn:'Yamaganda',      type:'inauspicious', time: times.yamaganda.start + ' – ' + times.yamaganda.end },
    { nameHi:'गुलिक काल',     nameEn:'Gulika Kaal',    type:'inauspicious', time: times.gulika.start    + ' – ' + times.gulika.end },
    { nameHi:'अभिजीत',        nameEn:'Abhijit',        type:'auspicious',   time: times.abhijit.start   + ' – ' + times.abhijit.end },
    { nameHi:'ब्रह्म मुहूर्त', nameEn:'Brahma Muhurat', type:'auspicious',   time: '04:24 AM – 05:12 AM' },
    { nameHi:'विजय मुहूर्त',   nameEn:'Vijay Muhurat',  type:'auspicious',   time: '02:15 PM – 03:00 PM' },
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

// ---- CITY SEARCH ----
let searchTimeout = null;

function buildSearchUI() {
  const locEl = document.getElementById('heroLocation');
  if (!locEl) return;

  // Replace the plain location text with a search input
  const wrap = document.createElement('div');
  wrap.className = 'location-search-wrap';

  wrap.innerHTML = `
    <div class="location-search-inner">
      <input
        type="text"
        id="cityInput"
        placeholder="📍 शहर खोजें / Search city..."
        autocomplete="off"
        spellcheck="false"
      />
      <button id="citySearchBtn" title="Search">🔍</button>
      <div id="citySuggestions"></div>
    </div>
  `;

  // Insert search box right after the heroLocation element
  locEl.parentNode.insertBefore(wrap, locEl.nextSibling);
  locEl.textContent = '📍 स्थान चुनें';

  const input   = document.getElementById('cityInput');
  const sugBox  = document.getElementById('citySuggestions');
  const btn     = document.getElementById('citySearchBtn');

  // Pre-fill from saved location
  const saved = localStorage.getItem('lastLocation');
  if (saved) {
    try {
      const loc = JSON.parse(saved);
      if (loc.name) input.value = loc.name;
    } catch(e) {}
  }

  // Typing → debounced autocomplete
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (q.length < 2) { sugBox.innerHTML = ''; return; }
    searchTimeout = setTimeout(() => fetchSuggestions(q, sugBox, input, locEl), 350);
  });

  // Enter key or button click → search
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(input.value.trim(), sugBox, locEl); }
    if (e.key === 'Escape') { sugBox.innerHTML = ''; input.blur(); }
  });
  btn.addEventListener('click', () => doSearch(input.value.trim(), sugBox, locEl));

  // Close suggestions on outside click
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) sugBox.innerHTML = '';
  });
}

function fetchSuggestions(query, sugBox, input, locEl) {
  sugBox.innerHTML = '<div class="search-loading">🔍 खोज रहे हैं…</div>';
  fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`)
    .then(r => r.json())
    .then(results => {
      if (!results || results.length === 0) {
        sugBox.innerHTML = '<div class="search-loading">कोई स्थान नहीं मिला</div>';
        return;
      }
      sugBox.innerHTML = results.map((r, i) => {
        const city  = r.address.city || r.address.town || r.address.village || r.address.county || r.display_name.split(',')[0];
        const state = r.address.state || '';
        const country = r.address.country || '';
        const label = [city, state, country].filter(Boolean).join(', ');
        return `<div class="suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${label}">
          <span class="sug-icon">📍</span>
          <span>${label}</span>
        </div>`;
      }).join('');

      // Click on suggestion
      sugBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat  = parseFloat(item.dataset.lat);
          const lon  = parseFloat(item.dataset.lon);
          const name = item.dataset.name;
          input.value = name;
          sugBox.innerHTML = '';
          locEl.textContent = '📍 ' + name;
          renderPanchang(lat, lon, name);
        });
      });
    })
    .catch(() => {
      sugBox.innerHTML = '<div class="search-loading">नेटवर्क त्रुटि / Network error</div>';
    });
}

function doSearch(query, sugBox, locEl) {
  if (!query) return;
  sugBox.innerHTML = '<div class="search-loading">🔍 खोज रहे हैं…</div>';
  fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`)
    .then(r => r.json())
    .then(results => {
      sugBox.innerHTML = '';
      if (!results || results.length === 0) {
        locEl.textContent = '⚠️ स्थान नहीं मिला';
        return;
      }
      const r     = results[0];
      const lat   = parseFloat(r.lat);
      const lon   = parseFloat(r.lon);
      const city  = r.address.city || r.address.town || r.address.village || r.address.county || query;
      const state = r.address.state || '';
      const country = r.address.country || '';
      const name  = [city, state, country].filter(Boolean).join(', ');
      document.getElementById('cityInput').value = name;
      locEl.textContent = '📍 ' + name;
      renderPanchang(lat, lon, name);
    })
    .catch(() => {
      sugBox.innerHTML = '';
      locEl.textContent = '⚠️ नेटवर्क त्रुटि';
    });
}

// ---- INIT ----
function initPanchang() {
  createStars();
  setupLangToggle();
  renderHeroDate(new Date());
  buildSearchUI();

  // Try to restore last saved location, otherwise use Delhi default
  const saved = localStorage.getItem('lastLocation');
  if (saved) {
    try {
      const loc = JSON.parse(saved);
      if (loc.lat && loc.lon) {
        renderPanchang(loc.lat, loc.lon, loc.name || 'आपका स्थान');
        return;
      }
    } catch(e) {}
  }

  // Default: New Delhi
  renderPanchang(28.6139, 77.2090, 'नई दिल्ली, भारत');
}

document.addEventListener('DOMContentLoaded', initPanchang);
