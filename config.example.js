/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Client Configuration Template (Firebase Edition)
 *
 * Instructions:
 * 1. Copy this file to `config.js`
 * 2. Buat project di https://console.firebase.google.com, lalu ambil "Firebase config"
 *    dari Project Settings > General > Your apps > SDK setup and configuration.
 * 3. Tempel nilainya ke bawah ini. Semua nilai ini AMAN untuk publik/frontend
 *    (bukan rahasia) — keamanan sesungguhnya diatur lewat Firestore Security Rules.
 */

window.APP_CONFIG = {
  // Firebase Project Credentials (dari Firebase Console > Project Settings)
  FIREBASE_CONFIG: {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx"
  },

  // Madrasah Branding Defaults
  SCHOOL_NAME: "MAN 3 HULU SUNGAI SELATAN",
  APP_NAME: "PORTAL UJIAN MAN 3 HSS",
  TAGLINE: "Sistem Ujian Online Terintegrasi",
  DEFAULT_TIMEZONE: "Asia/Makassar", // WITA (UTC+8)

  // Security Defaults
  MAX_ALLOWED_VIOLATIONS: 3
};
