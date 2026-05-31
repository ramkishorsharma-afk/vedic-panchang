/**
 * MAIN.JS — Vedic Panchang
 * This file is intentionally disabled.
 * All functionality has been moved into index.html inline script.
 * Keeping this file prevents 404 errors from browser cache references.
 *
 * The old code used geolocation (navigator.geolocation) which caused
 * the page to hang showing "स्थान लोड हो रहा है..." forever.
 * City search is now handled directly in index.html.
 */

// Override any cached version of initPanchang so it doesn't conflict
window.initPanchang = function() {
  console.log('main.js: initPanchang() disabled — logic moved to index.html');
};

// Prevent double DOMContentLoaded from old cached main.js
document.removeEventListener('DOMContentLoaded', window.initPanchang);
