/* ============================================================
   PANCHANG ADAPTER
   Drop-in replacement for panchang.js.
   Exposes the SAME `Panchang.xxx()` API that calendar.html and
   muhurat.html already call, but every calculation is now backed
   by engine.js's real ephemeris (astronomy-engine) + Lahiri
   ayanamsha instead of the old sine-series approximations.

   LOAD ORDER (important):
     <script src="https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"></script>
     <script src="engine.js"></script>
     <script src="panchang-adapter.js"></script>
   ============================================================ */

const Panchang = (() => {

  // ---- Hindi/English name tables (unchanged from old panchang.js —
  // these are just labels, not calculations, so they were never wrong) ----
  const TITHIS_HI = ['प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पञ्चमी','षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी','एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा/अमावस्या'];
  const TITHIS_EN = ['Pratipada','Dvitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima/Amavasya'];
  const NAKSHATRAS_HI = ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपद','उत्तराभाद्रपद','रेवती'];
  const NAKSHATRAS_EN = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mool','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  const YOGAS_HI = ['विष्कुम्भ','प्रीति','आयुष्मान','सौभाग्य','शोभन','अतिगण्ड','सुकर्मा','धृति','शूल','गण्ड','वृद्धि','ध्रुव','व्याघात','हर्षण','वज्र','सिद्धि','व्यतीपात','वरीयान','परिघ','शिव','सिद्ध','साध्य','शुभ','शुक्ल','ब्रह्म','इन्द्र','वैधृति'];
  const YOGAS_EN = ['Vishkambha','Preeti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shoola','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
  const KARANS_HI = ['बव','बालव','कौलव','तैतिल','गर','वणिज','विष्टि','शकुनि','चतुष्पाद','नाग','किंस्तुघ्न'];
  const KARANS_EN = ['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti','Shakuni','Chatushpada','Naga','Kinstughna'];
  const VARS_HI = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
  const VARS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const VAR_DEITIES_HI = ['सूर्य','चन्द्र','मंगल','बुध','बृहस्पति','शुक्र','शनि'];
  const VAR_DEITIES_EN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  const RASHIS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
  const RASHIS_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const PLANETS_HI = ['सूर्य','चन्द्र','मंगल','बुध','गुरु','शुक्र','शनि','राहु','केतु'];
  const PLANETS_ORDER = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

  // ---- sanity check: engine.js must be loaded first ----
  function requireEngine(){
    if (typeof tropicalPositions !== 'function' || typeof Astronomy === 'undefined') {
      throw new Error('panchang-adapter.js requires astronomy-engine + engine.js to be loaded BEFORE this file.');
    }
  }

  function toJulianDate(date) {
    return date.getTime()/86400000 + 2440587.5;
  }

  // ---- TITHI (tropical Sun-Moon elongation; ayanamsha cancels out so this was already fine) ----
  function getTithi(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    let diff = norm360(trop.Moon - trop.Sun);
    const tithiNum = Math.floor(diff / 12);
    const paksha = tithiNum < 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
    const pakshaEn = tithiNum < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
    const idx = tithiNum % 15;
    return { nameHi: TITHIS_HI[idx], nameEn: TITHIS_EN[idx], pakshaHi: paksha, pakshaEn: pakshaEn, num: tithiNum + 1 };
  }

  // ---- NAKSHATRA (real sidereal Moon longitude via Lahiri ayanamsha) ----
  function getNakshatra(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    const moonSid = toSidereal(trop.Moon, date);
    const nak = nakshatraOf(moonSid);
    return { nameHi: NAKSHATRAS_HI[nak.idx], nameEn: NAKSHATRAS_EN[nak.idx], pada: nak.pada, idx: nak.idx };
  }

  // ---- YOGA (tropical Sun+Moon sum — ayanamsha cancels here too) ----
  function getYoga(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    const sum = norm360(trop.Sun + trop.Moon);
    const idx = Math.floor(sum / (360/27));
    return { nameHi: YOGAS_HI[idx], nameEn: YOGAS_EN[idx], idx: idx };
  }

  // ---- KARANA ----
  function getKaran(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    let diff = norm360(trop.Moon - trop.Sun);
    const karanNum = Math.floor(diff / 6);
    let idx;
    if (karanNum === 0) idx = 10;
    else if (karanNum >= 57) idx = 7 + ((karanNum - 57) % 4);
    else idx = ((karanNum - 1) % 7);
    idx = Math.min(idx, KARANS_HI.length - 1);
    return { nameHi: KARANS_HI[idx], nameEn: KARANS_EN[idx] };
  }

  // ---- VAR (weekday — uses LOCAL date, same as before) ----
  function getVar(date) {
    const d = date.getDay();
    return { nameHi: VARS_HI[d], nameEn: VARS_EN[d], deityHi: VAR_DEITIES_HI[d], deityEn: VAR_DEITIES_EN[d] };
  }

  // ---- SUN / MOON RASHI (real sidereal) ----
  function getSunRashi(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    const sid = toSidereal(trop.Sun, date);
    const idx = Math.floor(sid/30);
    return { nameHi: RASHIS_HI[idx], nameEn: RASHIS_EN[idx] };
  }
  function getMoonRashi(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    const sid = toSidereal(trop.Moon, date);
    const idx = Math.floor(sid/30);
    return { nameHi: RASHIS_HI[idx], nameEn: RASHIS_EN[idx] };
  }

  // ---- MOON PHASE ----
  function getMoonPhase(dateOrJd) {
    requireEngine();
    const date = (dateOrJd instanceof Date) ? dateOrJd : new Date((dateOrJd - 2440587.5) * 86400000);
    const trop = tropicalPositions(date);
    let diff = norm360(trop.Moon - trop.Sun);
    if (diff < 6)  return { nameHi: 'अमावस्या', nameEn: 'Amavasya', emoji: '🌑' };
    if (diff < 90) return { nameHi: 'शुक्ल पक्ष', nameEn: 'Shukla Paksha', emoji: '🌒' };
    if (diff < 186) return { nameHi: 'पूर्णिमा', nameEn: 'Purnima', emoji: '🌕' };
    return { nameHi: 'कृष्ण पक्ष', nameEn: 'Krishna Paksha', emoji: '🌘' };
  }

  // ---- REAL SUNRISE/SUNSET via Astronomy.SearchRiseSet ----
  function getSunTimes(date, lat, lon) {
    requireEngine();
    const observer = new Astronomy.Observer(lat, lon, 0);
    const riseInfo = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, new Date(date.getTime() - 43200000), 2);
    const setInfo  = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 2);
    if (!riseInfo || !setInfo) return null;
    const sunrise = riseInfo.date, sunset = setInfo.date;
    const tzOffsetHours = -date.getTimezoneOffset()/60;
    return {
      sunrise: fmtTime(sunrise, tzOffsetHours),
      sunset: fmtTime(sunset, tzOffsetHours),
      riseH: sunrise.getUTCHours() + sunrise.getUTCMinutes()/60 + tzOffsetHours,
      setH: sunset.getUTCHours() + sunset.getUTCMinutes()/60 + tzOffsetHours,
      _sunriseDate: sunrise, _sunsetDate: sunset
    };
  }

  // ---- RAHUKAAL / YAMAGANDA / GULIKA / ABHIJIT — real day-length division ----
  const RAHU_SEG = [8,2,7,5,6,4,3], YAMA_SEG=[5,4,3,2,1,7,6], GULIKA_SEG=[7,6,5,4,3,2,1];
  function getRahukaal(date, sunriseDate, sunsetDate) {
    // Accepts real Date objects for sunrise/sunset (from getSunTimes()._sunriseDate/_sunsetDate)
    requireEngine();
    const dayIndex = date.getDay();
    const dayLen = sunsetDate.getTime() - sunriseDate.getTime();
    const part = dayLen/8;
    const tzOffsetHours = -date.getTimezoneOffset()/60;
    const mkRange = (segNum) => {
      const s = new Date(sunriseDate.getTime() + (segNum-1)*part);
      const e = new Date(sunriseDate.getTime() + segNum*part);
      return { start: fmtTime(s, tzOffsetHours), end: fmtTime(e, tzOffsetHours) };
    };
    const muhurta = dayLen/15;
    const noon = new Date((sunriseDate.getTime()+sunsetDate.getTime())/2);
    return {
      rahukaal: mkRange(RAHU_SEG[dayIndex]),
      yamaganda: mkRange(YAMA_SEG[dayIndex]),
      gulika: mkRange(GULIKA_SEG[dayIndex]),
      abhijit: { start: fmtTime(new Date(noon.getTime()-muhurta/2), tzOffsetHours), end: fmtTime(new Date(noon.getTime()+muhurta/2), tzOffsetHours) }
    };
  }

  // ---- FESTIVALS (date lookup table — unchanged, not an astro calculation) ----
  const FESTIVAL_DB = [
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
  // NOTE: This fixed-date festival list is a placeholder. Real Hindu festivals (Holi, Diwali,
  // Raksha Bandhan, Janmashtami, Navratri, etc.) fall on a DIFFERENT Gregorian date every year
  // because they follow the lunisolar tithi calendar, not a fixed solar date. TODO before
  // launch: replace this with a tithi-based lookup (e.g. Diwali = Amavasya of Kartik month)
  // computed per-year from getTithi(), or an authoritative festival API/dataset per year.
  function getFestivalsForDate(date) {
    const m = date.getMonth() + 1, d = date.getDate();
    return FESTIVAL_DB.filter(f => f.month === m && f.day === d);
  }
  function getFestivalsForMonth(year, month) {
    return FESTIVAL_DB.filter(f => f.month === month);
  }

  // ---- PLANETARY POSITIONS (real ephemeris + sidereal + retrograde flags) ----
  function getPlanetaryPositions(date) {
    requireEngine();
    const trop = tropicalPositions(date);
    const retro = computeRetrograde(date);
    return PLANETS_ORDER.map((name, i) => {
      const sid = toSidereal(trop[name], date);
      const signIdx = Math.floor(sid/30);
      return {
        planet: name,
        planetHi: PLANETS_HI[i],
        lon: sid.toFixed(2),
        rashi: RASHIS_HI[signIdx],
        rashiEn: RASHIS_EN[signIdx],
        degree: (sid % 30).toFixed(1),
        retrograde: retro[name] || false
      };
    });
  }

  // ---- LAGNA (real sidereal ascendant) ----
  function getLagna(date, lat, lon) {
    requireEngine();
    const lagnaSid = computeLagna(date, lat, lon);
    const idx = Math.floor(lagnaSid/30);
    return { rashiHi: RASHIS_HI[idx], rashiEn: RASHIS_EN[idx], degree: (lagnaSid % 30).toFixed(1) };
  }

  // ---- HOUSE CUSPS (whole-sign houses from real Lagna) ----
  function getHouseCusps(date, lat, lon) {
    requireEngine();
    const lagnaSid = computeLagna(date, lat, lon);
    const lagnaIdx = Math.floor(lagnaSid/30);
    const cusps = [];
    for (let i = 0; i < 12; i++) {
      const idx = (lagnaIdx + i) % 12;
      cusps.push({ house: i+1, rashiHi: RASHIS_HI[idx], rashiEn: RASHIS_EN[idx] });
    }
    return cusps;
  }

  // ---- MUHURAT (uses real tithi/yoga now) ----
  const MUHURAT_TYPES_HI = {
    vivah:      { name:'विवाह मुहूर्त', goodYogas:['सिद्धि','शुभ','साध्य','वृद्धि'], goodTithis:[2,5,7,10,11,13,15] },
    griha:      { name:'गृह प्रवेश', goodYogas:['ध्रुव','सिद्धि','शुभ'], goodTithis:[2,3,5,7,10,11,13] },
    vyapar:     { name:'व्यापार आरम्भ', goodYogas:['सौभाग्य','शुभ','सिद्धि'], goodTithis:[2,5,7,10,11] },
    yatra:      { name:'यात्रा', goodYogas:['सिद्धि','साध्य','शुभ'], goodTithis:[2,3,5,7,10,11,12,13] },
    namakarana: { name:'नामकरण', goodYogas:['सिद्धि','शुभ','साध्य','वृद्धि'], goodTithis:[2,3,5,7,10,11] },
  };
  function getMuhuratForDay(date, lat, lon, purpose='vivah') {
    requireEngine();
    const tithi = getTithi(date);
    const yoga  = getYoga(date);
    const sunTimes = getSunTimes(date, lat, lon);
    if (!sunTimes) return [];
    const type = MUHURAT_TYPES_HI[purpose] || MUHURAT_TYPES_HI.vivah;
    const isTithiGood = type.goodTithis.includes(tithi.num % 15 || 15);
    const isYogaGood  = type.goodYogas.some(y => yoga.nameHi.includes(y) || yoga.nameEn.includes(y));
    const results = [];
    for (let h = 0; h < 24; h++) {
      const slotDate = new Date(date.getTime() + h*3600000);
      const slotYoga = getYoga(slotDate);
      const quality = isTithiGood && isYogaGood ? 'best' : (isTithiGood || isYogaGood ? 'good' : 'avoid');
      const hh = h % 12 || 12, ap = h < 12 ? 'AM' : 'PM';
      const hEnd = (h+1) % 12 || 12, apEnd = (h+1) < 12 ? 'AM' : 'PM';
      results.push({ timeRange: `${hh}:00 ${ap} – ${hEnd}:00 ${apEnd}`, quality, yogaHi: slotYoga.nameHi, yogaEn: slotYoga.nameEn });
    }
    return results.filter(r => r.quality !== 'avoid').slice(0, 8);
  }

  return {
    toJulianDate, getTithi, getNakshatra, getYoga, getKaran, getVar,
    getSunRashi, getMoonRashi, getMoonPhase, getSunTimes, getRahukaal,
    getFestivalsForDate, getFestivalsForMonth, getPlanetaryPositions,
    getLagna, getHouseCusps, getMuhuratForDay, MUHURAT_TYPES_HI,
    TITHIS_HI, TITHIS_EN, NAKSHATRAS_HI, NAKSHATRAS_EN, RASHIS_HI, RASHIS_EN
  };
})();
