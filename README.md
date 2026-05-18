# 🕉️ वैदिक पञ्चाङ्ग | Vedic Panchang Website

A full-featured Hindu Panchang & Vedic Astrology website built with pure HTML, CSS, and JavaScript — no backend required.

## ✨ Features

- **Daily Panchang** — Tithi, Nakshatra, Yoga, Karan, Var with real-time calculations
- **Hindu Calendar** — Monthly view with festival highlights and Tithi for each day
- **Auspicious Muhurat** — Find the best time for Vivah, Griha Pravesh, Vyapar, Yatra, Namakarana
- **Kundali / Birth Chart** — North Indian style birth chart with planetary positions
- **Bilingual** — Full Hindi & English support with one-click toggle
- **Location-aware** — Uses browser geolocation for accurate sunrise/sunset & Rahukaal
- **Sacred Design** — Cosmos-inspired dark theme with saffron & gold accents

## 🗂️ Project Structure

```
panchang-website/
├── index.html              # Daily Panchang (homepage)
├── css/
│   └── style.css           # Complete design system
├── js/
│   ├── panchang.js         # Vedic calculation engine
│   └── main.js             # Homepage controller
└── pages/
    ├── calendar.html       # Hindu Calendar
    ├── muhurat.html        # Auspicious Muhurat
    └── kundali.html        # Birth Chart / Kundali
```

## 🧮 Calculation Engine

All astronomical calculations are based on standard Vedic algorithms:
- **Tithi**: Moon–Sun longitude difference (÷12°)
- **Nakshatra**: Moon longitude (÷13°20')
- **Yoga**: Sum of Sun+Moon longitudes (÷13°20')
- **Karan**: Half-tithi based calculation
- **Sunrise/Sunset**: Based on solar declination & latitude
- **Rahukaal/Yamaganda**: Traditional weekday-based slots

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Push to a GitHub repository
2. Go to Settings → Pages
3. Source: `main` branch, `/ (root)` folder
4. Your site will be live at `https://username.github.io/repo-name`

### Local Development
Just open `index.html` in any browser — no server needed!

## 🌐 Technologies
- Pure HTML5, CSS3, Vanilla JavaScript
- Google Fonts (Tiro Devanagari Sanskrit, Crimson Pro, DM Mono)
- OpenStreetMap Nominatim for reverse geocoding
- No frameworks, no dependencies, no build step

## 🙏 Credits

Based on traditional Vedic astronomical algorithms. Calculations are approximate and for general guidance. For precise muhurat or important decisions, consult a qualified Jyotishi.

---

*ॐ सर्वे भवन्तु सुखिनः | May all be happy*
