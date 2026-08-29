# PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
> **Sistem Ujian Online Terintegrasi (Secure Exam Gateway • Firebase • Google Forms • PWA)**

Portal resmi asesmen dan ujian online madrasah berbasis web modern untuk **MAN 3 Hulu Sungai Selatan**. Berfungsi sebagai *Secure Exam Gateway* yang menjadi pintu masuk terverifikasi, aman, dan terpantau sebelum peserta didik mengerjakan lembar soal di Google Forms.

---

## 🏛️ 1. Identitas & Informasi Aplikasi
- **Nama Madrasah**: MAN 3 HULU SUNGAI SELATAN
- **Nama Aplikasi**: PORTAL UJIAN MAN 3 HSS
- **Tagline**: *"Sistem Ujian Online Terintegrasi"*
- **Zona Waktu**: Asia/Makassar (WITA / UTC+8)
- **Tahun Ajaran**: 2025/2026

---

## 🚀 2. Fitur Utama

1. **Secure Exam Gateway (Pintu Masuk Terverifikasi)**
   - Akses ujian menggunakan token terenkripsi (SHA-256) dengan proteksi anti brute force rate limiting (maksimal 5 kali percobaan).
   - Filter ujian otomatis sesuai jenjang dan rombel kelas peserta didik.
   - Diagnostik perangkat mandiri sebelum ujian (Jaringan, Browser, Storage, Layar Penuh).

2. **Secure Exam Mode (Proteksi Sesi Siswa)**
   - Mode layar penuh otomatis (*Fullscreen API*).
   - Deteksi perpindahan tab browser (*Page Visibility API* & `visibilitychange`).
   - Deteksi kehilangan fokus jendela (*Window Blur*).
   - Deteksi multi-tab konkuren (*BroadcastChannel API*).
   - Penonaktifan klik kanan, blok teks, dan tombol pintas pengembang (`F12`, `Ctrl+Shift+I`, `Ctrl+U`, `Ctrl+S`, dll).
   - Sistem toleransi peringatan bertingkat (3 teguran sebelum status ditandai `MENCURIGAKAN`).

3. **Smart Server-Synced Timer**
   - Waktu ujian dihitung dari timestamp server (`expires_at`), tidak dapat dimanipulasi dengan memajukan jam pada perangkat siswa.
   - Sesi refresh recovery: jika browser siswa tertutup atau refresh, sisa waktu dan sesi aktif langsung dipulihkan tanpa mereset timer.

4. **Integrasi Google Forms yang Fleksibel**
   - Menampilkan lembar soal Google Forms dalam frame aman atau gateway launcher otomatis jika kebijakan browser menerapkan restriksi *Cross-Origin Frame*.

5. **Panel Admin & Pengawasan Realtime Proktor**
   - Autentikasi aman berbasis Supabase Auth dengan *Role-Based Access Control* (Admin, Operator).
   - Dashboard KPI interaktif (Total Ujian, Ujian Aktif, Sesi Berjalan, Pelanggaran Hari Ini).
   - Pemantauan realtime status peserta didik (🟢 NORMAL, 🟡 WARNING, 🔴 SUSPICIOUS).
   - Penghentian sesi jarak jauh (*Remote Session Termination*).
   - Manajemen penuh (CRUD) Jadwal Ujian, Duplikasi Ujian Susulan / Remedial, dan Pengelolaan Kelas.
   - Generator token otomatis.
   - Ekspor data Sesi, Pelanggaran, dan Jadwal Ujian ke format CSV.

6. **Responsif & PWA (Progressive Web App)**
   - Dioptimalkan untuk semua ukuran layar (HP Android, iPhone, iPad, Tablet, Chromebook, Laptop, Desktop).
   - Tampilan *Dark Mode* dan *Light Mode*.
   - Deteksi status koneksi internet putus/tersambung secara langsung.

---

## 📂 3. Struktur File Proyek

```
portal-ujian-man3hss/
├── index.html                  # Halaman Landing & Pemilihan Kelas/Ujian Siswa
├── exam.html                   # Sesi Ujian Aktif (Secure Gateway + Google Forms)
├── login.html                  # Halaman Login Admin & Proktor
├── admin.html                  # Dashboard & Pengawasan Realtime Proktor
├── guide.html                  # Panduan Lengkap Siswa & Guru
├── manifest.json               # Konfigurasi PWA
├── service-worker.js           # PWA Service Worker (Cache Shell UI)
├── config.js                   # Konfigurasi Kredensial Frontend
├── config.example.js           # Template Konfigurasi Supabase
├── supabase-schema.sql         # Skema Database PostgreSQL, RLS & Stored Procedures
├── seed.sql                    # Data Awal / Demo (Kelas, Ujian, Setting)
├── README.md                   # Dokumentasi Teknis
│
├── css/
│   ├── variables.css           # Palet Deep Emerald, Gold, Slate & Token Tema
│   ├── global.css              # Reset, Tipografi, Header & Footer
│   ├── components.css          # Desain Card, Button, Modal, Toast & Badge
│   ├── exam.css                # Layout Khusus Ujian & Sticky Timer
│   ├── admin.css               # Layout Dashboard Admin & Tabel Monitoring
│   └── responsive.css          # Penyesuaian Mobile 320px - 1920px
│
├── js/
│   ├── utils.js                # Formatter WITA, Toasts, SHA-256 & Export CSV
│   ├── storage.js              # Safe LocalStorage & SessionStorage Manager
│   ├── supabase-client.js      # Klien Supabase & Fallback Engine Interaktif
│   ├── auth.js                 # Autentikasi Proktor & Page Guard
│   ├── classes.js              # Selektor Kelas Siswa
│   ├── exams.js                # Manajemen List Ujian & Verifikasi Token Siswa
│   ├── exam-session.js         # Pengendali Siklus Sesi Ujian (exam.html)
│   ├── timer.js                # Engine Hitung Mundur Server-Synced
│   ├── security.js             # Proteksi Layar Penuh & Anti-Copy
│   ├── violations.js           # Detektor Tab Switch & Peringatan Pelanggaran
│   ├── monitoring.js           # Pengawasan Realtime untuk Admin
│   ├── admin.js                # Kontroler CRUD & Dashboard Admin
│   └── app.js                  # Inisialisasi Beranda & Tema
│
└── assets/
    └── logo.svg                # Logo Vektor Resmi MAN 3 HSS
```

---

## ⚙️ 4. Panduan Setup Supabase (Langkah demi Langkah)

### Langkah 1: Buat Proyek Supabase
1. Masuk ke [https://supabase.com](https://supabase.com) dan buat proyek baru.
2. Pilih Region terdekat (misal: *Singapore*).

### Langkah 2: Jalankan Skema Database
1. Buka menu **SQL Editor** pada dashboard Supabase.
2. Salin isi file `supabase-schema.sql` dan klik **Run**.
3. (Opsional untuk data awal) Salin isi file `seed.sql` dan klik **Run**.

### Langkah 3: Konfigurasi Kredensial Frontend
1. Buka menu **Project Settings** > **API** di Supabase.
2. Salin **Project URL** dan **anon public key**.
3. Buka file `config.js` di direktori proyek dan masukkan kredensial:
   ```javascript
   window.APP_CONFIG = {
     SUPABASE_URL: "https://your-project-id.supabase.co",
     SUPABASE_ANON_KEY: "your-anon-public-key-here",
     SCHOOL_NAME: "MAN 3 HULU SUNGAI SELATAN",
     APP_NAME: "PORTAL UJIAN MAN 3 HSS",
     DEFAULT_TIMEZONE: "Asia/Makassar",
     MAX_ALLOWED_VIOLATIONS: 3,
     ENABLE_DEMO_FALLBACK: false // Set false untuk full cloud mode
   };
   ```

> [!CAUTION]
> **PENTING**: JANGAN PERNAH memasukkan `service_role key` ke dalam file JavaScript frontend atau repositori GitHub.

---

## 🌐 5. Deploy ke GitHub Pages

1. Inisialisasi git pada folder proyek:
   ```bash
   git init
   git add .
   git commit -m "feat: Portal Ujian MAN 3 HSS v3"
   ```
2. Buat repositori baru di GitHub (misal: `portal-ujian-man3hss`).
3. Hubungkan remote repository dan push:
   ```bash
   git remote add origin https://github.com/USERNAME/portal-ujian-man3hss.git
   git branch -M main
   git push -u origin main
   ```
4. Buka **Settings** > **Pages** di repository GitHub Anda:
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
   - Klik **Save**. Website siap diakses secara online!

---

## 🛡️ 6. Batasan Teknis & Etika Keamanan (*Security Reality*)

Aplikasi ini mengedepankan transparansi teknis:
- Konsep perlindungan yang digunakan adalah **DETER → DETECT → WARN → LOG → MONITOR**.
- Browser modern memiliki batasan sandbox keamanan; aplikasi tidak mengklaim "anti-cheat 100%" atau memata-matai kamera/mikrofon/HP kedua tanpa dasar hukum.
- Portal berfungsi sebagai gerbang pengawasan sesi yang tangguh, mencegah ketidaktertiban umum di ruang ujian dan memberikan rekam jejak digital yang jelas kepada proktor.

---

## 📞 7. Kontak & Dukungan
- **Madrasah Aliyah Negeri 3 Hulu Sungai Selatan**
- Tim Proktor & Asesmen Digital Madrasah
- Email: `proktor@man3hss.sch.id`


---

## 🔥 Catatan Migrasi ke Firebase

Versi ini menggantikan Supabase dengan **Firebase (Firestore + Firebase Auth)** sebagai database dan sistem login admin. Lihat `PANDUAN_PEMASANGAN_FIREBASE.md` untuk langkah instalasi lengkap.
