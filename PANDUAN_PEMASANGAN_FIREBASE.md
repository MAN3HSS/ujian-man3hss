# 📖 PANDUAN PEMASANGAN ONLINE — VERSI FIREBASE
### Portal Ujian Online MAN 3 Hulu Sungai Selatan
**Metode:** Browser (Firebase Console & GitHub), tanpa perlu terminal.

---

## 📑 DAFTAR ISI
1. Membuat Project di Firebase
2. Mengaktifkan Firestore Database
3. Mengaktifkan Authentication & Membuat Akun Admin
4. Memasang Firestore Security Rules
5. Mengisi Kredensial ke `config.js`
6. Mengisi Data Awal (Kelas, Siswa, Ujian) lewat Dashboard Admin
7. Upload ke GitHub & Aktifkan Hosting

---

## Langkah 1: Membuat Project di Firebase

1. Buka **[https://console.firebase.google.com](https://console.firebase.google.com)**, login pakai akun Google.
2. Klik **Add project** / **Tambahkan proyek**.
3. Beri nama, misalnya `portal-ujian-man3hss`. Google Analytics boleh dimatikan (tidak wajib).
4. Tunggu sampai project selesai dibuat.

---

## Langkah 2: Mengaktifkan Firestore Database

1. Di sidebar kiri, klik **Build > Firestore Database**.
2. Klik **Create database**.
3. Pilih **Start in production mode** (aturan keamanannya akan kita pasang manual di Langkah 4).
4. Pilih lokasi server terdekat, misalnya `asia-southeast2 (Jakarta)` atau `asia-southeast1 (Singapore)`.
5. Klik **Enable**.

---

## Langkah 3: Mengaktifkan Authentication & Membuat Akun Admin

1. Di sidebar kiri, klik **Build > Authentication** → **Get started**.
2. Pada tab **Sign-in method**, klik **Email/Password** → aktifkan (toggle) → **Save**.
3. Pindah ke tab **Users** → klik **Add user**.
4. Isi email admin, contoh: `proktor@man3hss.sch.id`, dan buat password (min. 6 karakter). Klik **Add user**.
   - Ini akan jadi akun login proktor/admin di `login.html` nantinya. Anda bisa menambah beberapa akun sekaligus di sini jika perlu.

---

## Langkah 4: Memasang Firestore Security Rules

1. Kembali ke menu **Firestore Database** → klik tab **Rules**.
2. Hapus semua isi kotak editor, lalu buka file **`firestore.rules`** dari folder aplikasi ini di Notepad, salin seluruh isinya, dan tempel ke kotak editor Firebase.
3. Klik **Publish**.

> Aturan ini membuat data ujian & kelas bisa dibaca publik (agar siswa bisa mengakses tanpa login), tapi hanya akun yang sudah login (admin) yang boleh menambah/mengubah/menghapus data master.

---

## Langkah 5: Mengisi Kredensial ke `config.js`

1. Di Firebase Console, klik ikon gerigi ⚙️ di sebelah **Project Overview** → **Project settings**.
2. Scroll ke bagian **Your apps** → klik ikon web **`</>`** untuk mendaftarkan aplikasi web baru (jika belum ada).
3. Beri nama app, misalnya `portal-ujian-web`, klik **Register app** (tidak perlu centang Firebase Hosting).
4. Firebase akan menampilkan blok kode `firebaseConfig` — salin isinya.
5. Buka file **`config.js`** di folder aplikasi ini dengan Notepad, dan ganti bagian `FIREBASE_CONFIG` dengan nilai yang baru disalin:
   ```javascript
   FIREBASE_CONFIG: {
     apiKey: "AIza...",
     authDomain: "portal-ujian-man3hss.firebaseapp.com",
     projectId: "portal-ujian-man3hss",
     storageBucket: "portal-ujian-man3hss.appspot.com",
     messagingSenderId: "123456789000",
     appId: "1:123456789000:web:abcdef123456"
   },
   ```
6. Simpan file.

> Nilai-nilai ini **aman** ditaruh di frontend/GitHub publik — bukan rahasia. Keamanan sesungguhnya diatur oleh Firestore Rules di Langkah 4, bukan oleh nilai-nilai ini.

---

## Langkah 6: Mengisi Data Awal (Kelas, Siswa, Ujian)

Berbeda dengan Supabase yang punya `seed.sql`, Firestore diisi lewat Dashboard Admin aplikasi ini secara langsung:

1. Setelah `config.js` terisi dan website sudah bisa diakses (lanjut ke Langkah 7 dulu jika belum online), buka `login.html` dan login pakai akun yang dibuat di Langkah 3.
2. Di Dashboard Admin:
   - Menu **Kelas** → klik **+ Tambah Kelas Baru** untuk menambahkan kelas satu per satu.
   - Menu **Siswa** → tambah manual atau **Import Excel** (format kolom mengikuti template yang ada di menu tersebut).
   - Menu **Ujian** → klik **+ Tambah Ujian** untuk membuat jadwal ujian, token masuk/keluar, dan link Google Form.
3. Semua data yang dimasukkan lewat dashboard ini langsung tersimpan ke Firestore dan bisa dilihat dari perangkat/browser manapun.

---

## Langkah 7: Upload ke GitHub & Aktifkan Hosting

Bagian ini **sama seperti sebelumnya** — kode tetap disimpan di GitHub, hanya database-nya yang berganti ke Firebase:

1. Buat repository baru di GitHub (Public), lalu upload **SEMUA FILE** folder aplikasi ini (drag & drop lewat "uploading an existing file").
2. Di repository → **Settings** → **Pages** → Source: `Deploy from a branch`, Branch: `main`, folder `/(root)` → **Save**.
3. Tunggu 1-2 menit, situs akan aktif di `https://username-anda.github.io/portal-ujian-man3hss/`.

*(Jika ingin domain `.web.app` dari Firebase Hosting alih-alih GitHub Pages, itu langkah terpisah yang butuh Firebase CLI/terminal — beri tahu saya jika ingin dibantu untuk itu.)*

---

## ✅ Setelah Selesai

- Login admin: `https://username-anda.github.io/portal-ujian-man3hss/login.html` — pakai email & password yang dibuat di Langkah 3 (Firebase Auth), **bukan** lagi `admin123`.
- Kredensial demo lama (`admin` / `admin123`) hanya aktif sebagai **mode cadangan offline** jika `config.js` belum diisi dengan benar.
- Data ujian, siswa, sesi, dan pelanggaran sekarang benar-benar tersimpan di cloud (Firestore) dan bisa dipantau proktor secara realtime lintas perangkat.
