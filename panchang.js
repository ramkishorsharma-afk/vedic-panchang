/**
 * VEDIC PANCHANG CALCULATION ENGINE
 * Based on traditional Indian astronomical algorithms
 */

const Panchang = (() => {

  // ---- CONSTANTS ----
  const TITHIS_HI = [
    'प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पञ्चमी',
    'षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी',
    'एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा/अमावस्या'
  ];
  const TITHIS_EN = [
    'Pratipada','Dvitiya','Tritiya','Chaturthi','Panchami',
    'Shashthi','Saptami','Ashtami','Navami','Dashami',
    'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima/Amavasya'
  ];

  const NAKSHATRAS_HI = [
    'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा',
    'पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी',
    'हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा',
    'मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा','शतभिषा',
    'पूर्वाभाद्रपद','उत्तराभाद्रपद','रेवती'
  ];
  const NAKSHATRAS_EN = [
    'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
    'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
    'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
    'Mool','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
    'Purva Bhadrapada','Uttara Bhadrapada','Revati'
  ];

  const YOGAS_HI = [
    'विष्कुम्भ','प्रीति','आयुष्मान','सौभाग्य','शोभन',
    'अतिगण्ड','सुकर्मा','धृति','शूल','गण्ड',
    'वृद्धि','ध्रुव','व्याघात','हर्षण','वज्र',
    'सिद्धि','व्यतीपात','वरीयान','परिघ','शिव',
    'सिद्ध','साध्य','शुभ','शुक्ल','ब्रह्म',
    'इन्द्र','वैधृति'
  ];
  const YOGAS_EN = [
    'Vishkambha','Preeti','Ayushman','Saubhagya','Shobhana',
    'Atiganda','Sukarma','Dhriti','Shoola','Ganda',
    'Vriddhi','Dhruva','Vyaghata','Harshana','Vajra',
    'Siddhi','Vyatipata','Variyan','Parigha','Shiva',
    'Siddha','Sadhya','Shubha','Shukla','Brahma',
    'Indra','Vaidhriti'
  ];

  const KARANS_HI = [
    'बव','बालव','कौलव','तैतिल','गर','वणिज','विष्टि','शकुनि','चतुष्पाद','नाग','किंस्तुघ्न'
  ];
  const KARANS_EN = [
    'Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti','Shakuni','Chatushpada','Naga','Kinstughna'
  ];

  const VARS_HI = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
  const VARS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const VAR_DEITIES_HI = ['सूर्य','चन्द्र','मंगल','बुध','बृहस्पति','शुक्र','शनि'];
  const VAR_DEITIES_EN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

  const RASHIS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
  const RASHIS_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  const MOON_PHASES_HI = ['अमावस्या','शुक्ल पक्ष','पूर्णिमा','कृष्ण पक्ष'];
  const MOON_PHASES_EN = ['Amavasya','Shukla Paksha','Purnima','Krishna Paksha'];

  // ---- JULIAN DATE ----
  function toJulianDate(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate() + (date.getHours() + date.getMinutes()/60 + date.getSeconds()/3600) / 24;
    let jd = 367*y - Math.floor(7*(y+Math.floor((m+9)/12))/4)
             + Math.floor(275*m/9) + d + 1721013.5;
    return jd;
  }

  // ---- SUN LONGITUDE (approximate) ----
  function sunLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
    const lambda = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2*g);
    return ((lambda % 360) + 360) % 360;
  }

  // ---- MOON LONGITUDE (approximate) ----
  function moonLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (218.316 + 13.176396 * n) % 360;
    const M = ((134.963 + 13.064993 * n) % 360) * Math.PI / 180;
    const F = ((93.272  + 13.229350 * n) % 360) * Math.PI / 180;
    const lambda = L + 6.289 * Math.sin(M) - 1.274 * Math.sin(2*F - M) + 0.658 * Math.sin(2*F);
    return ((lambda % 360) + 360) % 360;
  }

  // ---- TITHI ----
  function getTithi(jd) {
    const sunLon  = sunLongitude(jd);
    const moonLon = moonLongitude(jd);
    let diff = moonLon - sunLon;
    if (diff < 0) diff += 360;
    const tithiNum = Math.floor(diff / 12); // 0-29
    const paksha = tithiNum < 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
    const pakshaEn = tithiNum < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
    const idx = tithiNum % 15;
    return {
      nameHi: TITHIS_HI[idx],
      nameEn: TITHIS_EN[idx],
      pakshaHi: paksha,
      pakshaEn: pakshaEn,
      num: tithiNum + 1
    };
  }

  // ---- NAKSHATRA ----
  function getNakshatra(jd) {
    const moonLon = moonLongitude(jd);
    const idx = Math.floor(moonLon / (360/27));
    const pada = Math.floor((moonLon % (360/27)) / (360/27/4)) + 1;
    return {
      nameHi: NAKSHATRAS_HI[idx],
      nameEn: NAKSHATRAS_EN[idx],
      pada: pada,
      idx: idx
    };
  }

  // ---- YOGA ----
  function getYoga(jd) {
    const sunLon  = sunLongitude(jd);
    const moonLon = moonLongitude(jd);
    const sum = (sunLon + moonLon) % 360;
    const idx = Math.floor(sum / (360/27));
    return {
      nameHi: YOGAS_HI[idx],
      nameEn: YOGAS_EN[idx],
      idx: idx
    };
  }

  // ---- KARAN ----
  function getKaran(jd) {
    const sunLon  = sunLongitude(jd);
    const moonLon = moonLongitude(jd);
    let diff = moonLon - sunLon;
    if (diff < 0) diff += 360;
    const karanNum = Math.floor(diff / 6);
    let idx;
    if (karanNum === 0) idx = 10; // Kinstughna
    else if (karanNum >= 57) idx = 7 + ((karanNum - 57) % 4);
    else idx = ((karanNum - 1) % 7);
    idx = Math.min(idx, KARANS_HI.length - 1);
    return {
      nameHi: KARANS_HI[idx],
      nameEn: KARANS_EN[idx]
    };
  }

  // ---- VAR (weekday) ----
  function getVar(date) {
    const d = date.getDay();
    return {
      nameHi: VARS_HI[d],
      nameEn: VARS_EN[d],
      deityHi: VAR_DEITIES_HI[d],
      deityEn: VAR_DEITIES_EN[d]
    };
  }

  // ---- SUN RASHI ----
  function getSunRashi(jd) {
    const lon = sunLongitude(jd);
    return { nameHi: RASHIS_HI[Math.floor(lon/30)], nameEn: RASHIS_EN[Math.floor(lon/30)] };
  }

  // ---- MOON RASHI ----
  function getMoonRashi(jd) {
    const lon = moonLongitude(jd);
    return { nameHi: RASHIS_HI[Math.floor(lon/30)], nameEn: RASHIS_EN[Math.floor(lon/30)] };
  }

  // ---- MOON PHASE ----
  function getMoonPhase(jd) {
    const sunLon  = sunLongitude(jd);
    const moonLon = moonLongitude(jd);
    let diff = moonLon - sunLon;
    if (diff < 0) diff += 360;
    if (diff < 6)  return { nameHi: 'अमावस्या',   nameEn: 'Amavasya', emoji: '🌑' };
    if (diff < 90) return { nameHi: 'शुक्ल पक्ष', nameEn: 'Shukla Paksha', emoji: '🌒' };
    if (diff < 186)return { nameHi: 'पूर्णिमा',   nameEn: 'Purnima', emoji: '🌕' };
    return { nameHi: 'कृष्ण पक्ष', nameEn: 'Krishna Paksha', emoji: '🌘' };
  }

  // ---- SUNRISE / SUNSET (approx, lat/lon based) ----
  function getSunTimes(date, lat, lon) {
    const jd = toJulianDate(date);
    const n = jd - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
    const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2*g)) * Math.PI / 180;
    const sinDec = Math.sin(23.45 * Math.PI/180) * Math.sin(lambda);
    const dec = Math.asin(sinDec);
    const latR = lat * Math.PI / 180;
    const cosH = (Math.cos(90.833 * Math.PI/180) - Math.sin(latR)*Math.sin(dec))
                 / (Math.cos(latR)*Math.cos(dec));
    if (Math.abs(cosH) > 1) return null;
    const H = Math.acos(cosH) * 180 / Math.PI;
    const RA = Math.atan2(Math.cos(23.45*Math.PI/180)*Math.sin(lambda), Math.cos(lambda)) * 180/Math.PI / 15;
    const transit = 12 - (lon/15) - (RA - L/15);
    const riseUTC = transit - H/15;
    const setUTC  = transit + H/15;
    const offset  = date.getTimezoneOffset() / -60;
    const toTime  = v => {
      let h = (v + offset + 24) % 24;
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      const ampm = hh >= 12 ? 'PM' : 'AM';
      return `${((hh%12)||12).toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')} ${ampm}`;
    };
    return {
      sunrise: toTime(riseUTC),
      sunset: toTime(setUTC),
      riseH: (riseUTC + offset + 24) % 24,
      setH: (setUTC + offset + 24) % 24
    };
  }

  // ---- RAHUKAAL & SPECIAL TIMES ----
  function getRahukaal(date, sunrise, sunset) {
    const dayIndex = date.getDay(); // 0=Sun
    // Rahukaal slots by day (fractions of daytime 1-8)
    const rahuSlots = [8,2,7,5,6,4,3]; // Sun=8th part,Mon=2nd,...
    const yamaSlots = [5,4,3,2,7,6,8];
    const gulSlots  = [4,3,2,1,5,8,6];
    const riseH = sunrise; const setH = sunset;
    const dayDur = (setH - riseH) / 8;
    const fmt = h => {
      h = (h + 24) % 24;
      const hh = Math.floor(h), mm = Math.round((h-hh)*60);
      const ap = hh>=12?'PM':'AM';
      return `${((hh%12)||12).toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')} ${ap}`;
    };
    const slot = (n) => {
      const s = riseH + (n-1)*dayDur;
      return { start: fmt(s), end: fmt(s+dayDur) };
    };
    return {
      rahukaal: slot(rahuSlots[dayIndex]),
      yamaganda: slot(yamaSlots[dayIndex]),
      gulika: slot(gulSlots[dayIndex]),
      abhijit: slot(7) // ~midday
    };
  }

  // ---- FESTIVALS DB ----
  const FESTIVAL_DB = [
    // month(1-12), day
    { month:1, day:14, nameHi:'मकर संक्रांति', nameEn:'Makar Sankranti', icon:'🌞', type:'festival' },
    { month:1, day:26, nameHi:'गणतंत्र दिवस', nameEn:'Republic Day', icon:'🇮🇳', type:'national' },
    { month:2, day:14, nameHi:'बसंत पंचमी', nameEn:'Basant Panchami', icon:'🌼', type:'festival' },
    { month:3, day:17, nameHi:'होलिका दहन', nameEn:'Holika Dahan', icon:'🔥', type:'festival' },
    { month:3, day:18, nameHi:'होली', nameEn:'Holi', icon:'🎨', type:'festival' },
    { month:3, day:30, nameHi:'रामनवमी', nameEn:'Ram Navami', icon:'🏹', type:'festival' },
    { month:4, day:6, nameHi:'हनुमान जयंती', nameEn:'Hanuman Jayanti', icon:'🐒', type:'festival' },
    { month:4, day:14, nameHi:'बैसाखी', nameEn:'Baisakhi', icon:'🌾', type:'festival' },
    { month:6, day:7, nameHi:'गंगा दशहरा', nameEn:'Ganga Dussehra', icon:'🌊', type:'festival' },
    { month:7, day:7, nameHi:'गुरु पूर्णिमा', nameEn:'Guru Purnima', icon:'🧘', type:'festival' },
    { month:8, day:9, nameHi:'नाग पंचमी', nameEn:'Nag Panchami', icon:'🐍', type:'festival' },
    { month:8, day:16, nameHi:'रक्षाबंधन', nameEn:'Raksha Bandhan', icon:'🪢', type:'festival' },
    { month:8, day:26, nameHi:'जन्माष्टमी', nameEn:'Janmashtami', icon:'🦚', type:'festival' },
    { month:9, day:2, nameHi:'गणेश चतुर्थी', nameEn:'Ganesh Chaturthi', icon:'🐘', type:'festival' },
    { month:10, day:2, nameHi:'गाँधी जयंती', nameEn:'Gandhi Jayanti', icon:'🕊️', type:'national' },
    { month:10, day:12, nameHi:'नवरात्रि आरम्भ', nameEn:'Navratri Begins', icon:'🪔', type:'festival' },
    { month:10, day:24, nameHi:'दशहरा', nameEn:'Dussehra', icon:'🏹', type:'festival' },
    { month:11, day:1, nameHi:'धनतेरस', nameEn:'Dhanteras', icon:'💰', type:'festival' },
    { month:11, day:3, nameHi:'दीपावली', nameEn:'Diwali', icon:'🪔', type:'festival' },
    { month:11, day:5, nameHi:'भाई दूज', nameEn:'Bhai Dooj', icon:'👫', type:'festival' },
    { month:11, day:15, nameHi:'देव उठनी एकादशी', nameEn:'Dev Uthani Ekadashi', icon:'🌺', type:'festival' },
    { month:12, day:25, nameHi:'क्रिसमस', nameEn:'Christmas', icon:'🎄', type:'national' },
  ];

  function getFestivalsForDate(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return FESTIVAL_DB.filter(f => f.month === m && f.day === d);
  }

  function getFestivalsForMonth(year, month) {
    return FESTIVAL_DB.filter(f => f.month === month);
  }

  // ---- PLANETARY DATA ----
  const PLANETS = ['☀️ Sun','🌙 Moon','♂️ Mars','☿️ Mercury','♃ Jupiter','♀️ Venus','♄ Saturn','☊ Rahu','☋ Ketu'];
  const PLANETS_HI = ['सूर्य','चन्द्र','मंगल','बुध','गुरु','शुक्र','शनि','राहु','केतु'];

  function getPlanetaryPositions(jd) {
    const sunLon  = sunLongitude(jd);
    const moonLon = moonLongitude(jd);
    const n = jd - 2451545;
    // Approximate other planets
    const mars   = ((355.45 + 0.5240207 * n) % 360 + 360) % 360;
    const mercury= ((252.25 + 4.0923344 * n) % 360 + 360) % 360;
    const jupiter= ((34.40  + 0.0830853 * n) % 360 + 360) % 360;
    const venus  = ((181.98 + 1.6021302 * n) % 360 + 360) % 360;
    const saturn = ((50.08  + 0.0334584 * n) % 360 + 360) % 360;
    const rahu   = ((125.04 - 0.0529539 * n) % 360 + 360) % 360;
    const ketu   = (rahu + 180) % 360;
    const lons   = [sunLon, moonLon, mars, mercury, jupiter, venus, saturn, rahu, ketu];
    return lons.map((lon, i) => ({
      planet: PLANETS[i],
      planetHi: PLANETS_HI[i],
      lon: lon.toFixed(2),
      rashi: RASHIS_HI[Math.floor(lon/30)],
      rashiEn: RASHIS_EN[Math.floor(lon/30)],
      degree: (lon % 30).toFixed(1)
    }));
  }

  // ---- LAGNA (Ascendant) ----
  function getLagna(jd, lat, lon) {
    const RAMC = (280.46061837 + 360.98564736629*(jd-2451545)) % 360;
    const localST = (RAMC + lon) % 360;
    return {
      rashiHi: RASHIS_HI[Math.floor(localST/30)],
      rashiEn: RASHIS_EN[Math.floor(localST/30)],
      degree: (localST % 30).toFixed(1)
    };
  }

  // ---- KUNDALI HOUSE CUSPS ----
  function getHouseCusps(jd, lat, lon) {
    const RAMC = (280.46061837 + 360.98564736629*(jd-2451545)) % 360;
    const localST = (RAMC + lon) % 360;
    const cusps = [];
    for (let i = 0; i < 12; i++) {
      const deg = (localST + i*30) % 360;
      cusps.push({
        house: i+1,
        rashiHi: RASHIS_HI[Math.floor(deg/30)],
        rashiEn: RASHIS_EN[Math.floor(deg/30)]
      });
    }
    return cusps;
  }

  // ---- MUHURAT QUALITY ----
  const MUHURAT_TYPES_HI = {
    vivah:      { name:'विवाह मुहूर्त',      goodYogas:['सिद्धि','शुभ','साध्य','वृद्धि'], goodTithis:[2,5,7,10,11,13,15] },
    griha:      { name:'गृह प्रवेश',          goodYogas:['ध्रुव','सिद्धि','शुभ'],         goodTithis:[2,3,5,7,10,11,13] },
    vyapar:     { name:'व्यापार आरम्भ',       goodYogas:['सौभाग्य','शुभ','सिद्धि'],       goodTithis:[2,5,7,10,11] },
    yatra:      { name:'यात्रा',               goodYogas:['सिद्धि','साध्य','शुभ'],         goodTithis:[2,3,5,7,10,11,12,13] },
    namakarana: { name:'नामकरण',              goodYogas:['सिद्धि','शुभ','साध्य','वृद्धि'], goodTithis:[2,3,5,7,10,11] },
  };

  function getMuhuratForDay(date, lat, lon, purpose='vivah') {
    const jd = toJulianDate(date);
    const tithi = getTithi(jd);
    const yoga  = getYoga(jd);
    const nakshatra = getNakshatra(jd);
    const sunTimes  = getSunTimes(date, lat, lon);
    if (!sunTimes) return [];
    const type = MUHURAT_TYPES_HI[purpose] || MUHURAT_TYPES_HI.vivah;
    const isTithiGood = type.goodTithis.includes(tithi.num % 15 || 15);
    const isYogaGood  = type.goodYogas.some(y => yoga.nameHi.includes(y) || yoga.nameEn.includes(y));

    const results = [];
    // Generate hourly slots
    for (let h = 0; h < 24; h++) {
      const slotJD = jd + h/24;
      const slotYoga = getYoga(slotJD);
      const quality = isTithiGood && isYogaGood ? 'best'
                    : isTithiGood || isYogaGood  ? 'good' : 'avoid';
      const hh = h % 12 || 12;
      const ap = h < 12 ? 'AM' : 'PM';
      const hEnd = (h+1) % 12 || 12;
      const apEnd = (h+1) < 12 ? 'AM' : 'PM';
      results.push({
        timeRange: `${hh}:00 ${ap} – ${hEnd}:00 ${apEnd}`,
        quality,
        yogaHi: slotYoga.nameHi,
        yogaEn: slotYoga.nameEn
      });
    }
    return results.filter(r => r.quality !== 'avoid').slice(0, 8);
  }

  // Public API
  return {
    toJulianDate,
    getTithi,
    getNakshatra,
    getYoga,
    getKaran,
    getVar,
    getSunRashi,
    getMoonRashi,
    getMoonPhase,
    getSunTimes,
    getRahukaal,
    getFestivalsForDate,
    getFestivalsForMonth,
    getPlanetaryPositions,
    getLagna,
    getHouseCusps,
    getMuhuratForDay,
    MUHURAT_TYPES_HI,
    TITHIS_HI, TITHIS_EN,
    NAKSHATRAS_HI, NAKSHATRAS_EN,
    RASHIS_HI, RASHIS_EN
  };
})();
