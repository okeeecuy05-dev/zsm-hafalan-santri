# ZSM Hafalan Santri

Platform pelacakan hafalan Al-Qur'an (Ziadah, Sabqi, Muraja'ah): santri menyetor dalam hitungan detik,
ustadz memantau dan memvalidasi, admin mengelola data. Masuk tanpa kata sandi (Magic Link / QR).

| Fase | Isi | Status |
|------|-----|--------|
| 1 | Fondasi sistem, form input ZSM, Smart Auto-Fill | selesai |
| 2 | Gamifikasi: ZSM Streak 🔥 | selesai |
| 3 | Dasbor real-time ustadz + validasi setoran | selesai |
| 4 | Login Magic Link/QR + RBAC, prediksi khatam, peringatan melambat, lencana, profil capaian, panel admin, pengingat | **selesai (dokumen ini)** |

---

## 1. Prasyarat

| Kebutuhan | Versi | Cek |
|-----------|-------|-----|
| Python | 3.11+ | `python --version` |
| Node.js | 20+ | `node --version` |
| PostgreSQL | lokal, atau akun Supabase / Neon | `psql --version` (jika lokal) |

Gunakan **dua terminal** di VS Code: satu untuk backend, satu untuk frontend.

---

## 2. Struktur proyek

```
zsm-hafalan-santri/
├── README.md
├── backend/                          FastAPI (async) + SQLAlchemy + PostgreSQL
│   ├── requirements.txt              (+ pyjwt)
│   ├── requirements-dev.txt          (+ pytest)
│   ├── pytest.ini
│   ├── .env.example                  salin menjadi .env
│   ├── app/
│   │   ├── main.py                   startup: tabel, migrasi ringan, lencana dasar, cek keamanan
│   │   ├── core/                     config, security (token & JWT), quran_meta, waktu
│   │   ├── db/                       base, session, migrations
│   │   ├── models/                   users, halaqah, setoran_logs, santri_profiles, badges, santri_badges
│   │   ├── schemas/                  setoran, user, halaqah, streak, dashboard, auth, analytics, admin
│   │   ├── services/                 setoran, streak, dashboard, analytics, badge, pengguna, akses, santri_query
│   │   ├── api/
│   │   │   ├── deps.py               autentikasi + RBAC
│   │   │   └── routes/               auth, santri, ustadz, halaqah, setoran, streak, dashboard, analytics, admin
│   │   └── scripts/                  seed, buat_admin, seed_dashboard_demo, seed_streak_demo, seed_analytics_demo
│   └── tests/                        test_streak, test_dashboard, test_validasi, test_analytics, test_security
└── frontend/                         kode sumber Next.js (isi folder src/ disalin ke proyek Next.js)
    ├── .env.local.example            salin menjadi .env.local
    └── src/
        ├── app/
        │   ├── layout.tsx, providers.tsx, manifest.ts
        │   ├── page.tsx                      beranda santri            (/)
        │   ├── masuk/page.tsx                login Magic Link / QR     (/masuk)
        │   ├── profil/page.tsx               profil & lencana santri   (/profil)
        │   ├── ustadz/page.tsx               dasbor ustadz             (/ustadz)
        │   ├── ustadz/santri/[id]/page.tsx   detail santri             (/ustadz/santri/ID)
        │   └── admin/page.tsx                panel admin               (/admin)
        ├── components/
        │   ├── auth/       auth-guard, qr-scanner
        │   ├── layout/     app-header, mobile-shell
        │   ├── setoran/    form input, picker ayat, daftar hari ini, reminder-banner
        │   ├── streak/     kartu streak + animasi api
        │   ├── profil/     profil-capaian, progress-chart, badge-showcase, badge-celebration
        │   ├── ustadz/     dashboard, klasemen, filter, ringkasan, dialog validasi, analytics-panel
        │   ├── admin/      admin-panel, pengguna-manager, pengguna-form-dialog, halaqah-manager, tautan-dialog
        │   └── shared/     rating-stars
        ├── hooks/          use-auth, use-setoran, use-streak, use-dashboard, use-profil, use-admin, ...
        ├── lib/            api, auth, format, reminder, quran-data, session, dashboard
        ├── store/          auth-store (Zustand)
        └── types/          setoran, dashboard, auth, analytics, admin
```

---

## 3. Menjalankan (pertama kali)

### Langkah A: Database
Buat database kosong bernama `zsm_hafalan` (`createdb zsm_hafalan`, pgAdmin, atau project Supabase/Neon).

### Langkah B: Backend (terminal 1)

```bash
cd backend
python -m venv .venv
```
Aktifkan virtual environment:
- Windows (PowerShell): `.venv\Scripts\Activate.ps1`
- Windows (CMD): `.venv\Scripts\activate.bat`
- macOS / Linux: `source .venv/bin/activate`

```bash
pip install -r requirements-dev.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
```
Buka `backend/.env`, isi minimal `DATABASE_URL`, contoh:
```
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD_ANDA@localhost:5432/zsm_hafalan
```
(Untuk Supabase/Neon tempel *connection string* aslinya; awalan dan parameter SSL diubah otomatis.)

Isi data contoh, **catat tautan masuk yang tercetak**, lalu jalankan server:
```bash
python -m app.scripts.seed                  # 1 admin, 1 ustadz, 1 halaqah, 5 santri + TAUTAN MASUK masing-masing
python -m app.scripts.seed_dashboard_demo   # setoran hari ini (dasbor tidak kosong)
python -m app.scripts.seed_analytics_demo   # riwayat 40 hari: prediksi, peringatan melambat, lencana
uvicorn app.main:app --reload
```
> **Tautan masuk hanya tampil sekali** (database menyimpan hash-nya). Salin hasil `seed` ke catatan sementara.
> Jika terlewat: `python -m app.scripts.buat_admin "Admin ZSM"` mencetak tautan admin baru, lalu buat tautan
> pengguna lain dari panel admin.

Cek: <http://localhost:8000/docs> dan <http://localhost:8000/api/health>.
Semua perintah backend dijalankan dari folder `backend/` dengan venv aktif.

### Langkah C: Frontend (terminal 2)

```bash
npx create-next-app@latest frontend-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd frontend-app
npx shadcn@latest init
npx shadcn@latest add button input label badge skeleton sonner dialog textarea
npm install @tanstack/react-query zustand lucide-react qrcode jsqr
npm install -D @types/qrcode
```
Salin kode dari dalam `frontend-app/` (menimpa berkas bawaan):
- Windows: `xcopy /E /I /Y ..\frontend\src src` lalu `copy ..\frontend\.env.local.example .env.local`
- macOS / Linux: `cp -R ../frontend/src/. src/` lalu `cp ../frontend/.env.local.example .env.local`

```bash
npm run dev      # http://localhost:3000
```

### Langkah D: Coba (3 menit)
1. Buka tautan **admin** hasil `seed` di browser (`http://localhost:3000/masuk?token=...`). Anda masuk ke **/admin**.
2. Tab **Santri**: klik *Tautan* pada satu santri. Muncul tautan + **gambar QR** untuk dicetak/dikirim.
3. Buka tautan **santri** (Abdullah Hakim) di jendela penyamaran: beranda, streak, dan pop-up konfeti **lencana "Hafal 1 Juz"**. Menu *Profil* menampilkan grafik, estimasi khatam, dan etalase lencana.
4. Buka tautan **ustadz**: klasemen harian, filter, dan bagian **Prediksi Khatam & Peringatan**: *Ahmad Fauzi* tampil **melambat**. Klik *Lihat profil*.
5. Klik **Validasi** pada baris santri, beri bintang + catatan tajwid, **Tandai Terverifikasi**. Prediksi dan lencana santri ikut dihitung ulang.
6. Kembali ke admin, tab **Halaqah (Kelas)**: ubah target juz seluruh kelas.

Kamera QR di halaman `/masuk` membutuhkan **HTTPS atau localhost** dan izin kamera. Alternatifnya, pindai QR dengan
aplikasi kamera bawaan ponsel: tautan di dalam QR langsung membuka halaman dan masuk otomatis.

---

## 4. Upgrade dari Fase 3

Fase 4 menambah tabel/kolom, dependensi, dan **mewajibkan login** pada seluruh API.

**Backend**
1. Ganti folder `backend/` dengan yang baru (pertahankan `.env` Anda), lalu `pip install -r requirements-dev.txt`.
2. Tambahkan ke `.env`: `JWT_SECRET`, `FRONTEND_BASE_URL` (lihat `.env.example`).
3. Jalankan server: **migrasi otomatis**. Kolom `hafalan_awal_ayat` ditambahkan, tabel `badges` dan `santri_badges`
   dibuat, dan 7 lencana milestone dimasukkan. Data lama tidak berubah.
4. Buat admin pertama: `python -m app.scripts.buat_admin "Nama Admin"` lalu buka tautannya.
5. Dari **panel admin**, buat tautan masuk untuk ustadz dan santri yang sudah ada (tombol *Tautan*). Pengguna lama belum punya tautan.

**Frontend**
1. `npx shadcn@latest add dialog textarea` (jika belum), lalu `npm install qrcode jsqr` dan `npm install -D @types/qrcode`.
2. Salin ulang `frontend/src/` ke `frontend-app/src/`.
3. **Hapus berkas lama** yang digantikan login:
   `src/components/setoran/santri-picker.tsx`, `src/components/ustadz/ustadz-picker.tsx`,
   `src/store/santri-store.ts`, `src/store/ustadz-store.ts`.
4. Restart `npm run dev`.

---

## 5. Fitur Fase 4

### Login tanpa sandi (Magic Link / QR) dan RBAC
- Admin membuat **tautan masuk** per pengguna. Tautan = QR yang sama. Database hanya menyimpan **hash SHA-256**-nya.
- Login menukar token dengan sesi JWT (berlaku `JWT_EXPIRE_HOURS`, bawaan 30 hari). Token **tidak habis sekali pakai**,
  sehingga kartu QR santri dapat dipakai berulang.
- **Mengganti atau mencabut tautan langsung mematikan semua sesi lama** pengguna itu.
- Peran dicek di server pada setiap permintaan (bukan dari data di perangkat).

| Aksi | Santri | Ustadz | Admin |
|------|:-----:|:------:|:-----:|
| Menyetor / ubah / hapus setoran | milik sendiri | tidak | tidak |
| Melihat setoran, streak, profil | milik sendiri | santri halaqahnya | semua |
| Validasi setoran | tidak | santri halaqahnya | semua |
| Dasbor & analitik | tidak | halaqahnya | semua |
| Panel admin (CRUD, tautan, target) | tidak | tidak | ya |

### Prediksi khatam & peringatan melambat
Semua berbasis **Ziadah terverifikasi** (Sabqi/Muraja'ah adalah pengulangan).
- **Total hafalan** = hafalan awal (diisi admin) + ayat unik dari Ziadah terverifikasi (ayat yang sama dihitung sekali).
- **Target** = `target_juz` setara `ceil(6236 × juz / 30)` ayat. Proporsional, karena urutan hafalan berbeda tiap pesantren.
- **Kecepatan** = ayat *baru* per hari kalender pada 30 hari terakhir (dipendekkan untuk santri baru).
- **Estimasi khatam** = hari ini + sisa ayat / kecepatan. Tidak ditampilkan jika tak ada kemajuan atau lebih dari 100 tahun.
- **Melambat** = kecepatan 7 hari terakhir turun **lebih dari 50%** dibanding 28 hari sebelumnya; hanya untuk santri dengan
  riwayat ≥ 14 hari dan target belum tercapai. Ambang dapat diubah (`MELAMBAT_AMBANG`).
  Karena PRD tidak menetapkan tenggat target, "turun dari target" diartikan sebagai turun dari kecepatan santri itu sendiri.
- Rata-rata dan estimasi disimpan di `santri_profiles` (`avg_ayat_per_day`, `estimasi_khatam_date`).

### Lencana milestone
"Hafal 1, 5, 10, 15, 20, 25, 30 Juz". Diberikan **otomatis** saat total hafalan melewati ambang (setelah validasi ustadz atau
perubahan data oleh admin), tidak pernah dicabut. Santri melihat **pop-up konfeti** sekali, lalu lencana masuk etalase di `/profil`.

### Panel admin
Santri, Ustadz & Admin, Halaqah: tambah/ubah/hapus, tautan masuk + QR, cabut tautan, **target juz per santri**,
**target juz per kelas** (diterapkan ke semua santri halaqah), **hafalan awal** santri.
Admin tidak dapat menghapus atau mengganti tautan akunnya sendiri (mencegah terkunci).
Menghapus pengguna menghapus setoran, profil, dan lencananya.

### Pengingat setoran
Banner di beranda santri bila sesi belum disetor melewati jam pengingat (Ziadah 09.00, Muraja'ah 16.00, Sabqi 20.00;
ubah di `frontend/src/lib/reminder.ts`) plus notifikasi browser setelah santri mengizinkannya.
**Batasan:** notifikasi hanya muncul saat aplikasi sedang terbuka. Notifikasi saat aplikasi tertutup membutuhkan Web Push
(service worker + server pengirim) dan belum termasuk.

### Endpoint baru Fase 4

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/auth/login` | Tukar token Magic Link/QR dengan sesi |
| GET | `/api/auth/me` | Pengguna saat ini |
| GET | `/api/analytics/ustadz` | Prediksi khatam seluruh santri (melambat di atas) |
| GET | `/api/analytics/melambat` | Hanya santri yang melambat |
| GET | `/api/analytics/santri/{id}?hari=90` | Profil: analitik, grafik, lencana |
| GET | `/api/analytics/santri/{id}/badges` | Daftar lencana |
| POST | `/api/analytics/santri/{id}/badges/dilihat` | Tandai selebrasi sudah dilihat (santri sendiri) |
| GET/POST/PATCH/DELETE | `/api/admin/pengguna[/{id}]` | CRUD pengguna |
| POST/DELETE | `/api/admin/pengguna/{id}/magic-link` | Ganti / cabut tautan masuk |
| GET/POST/PATCH/DELETE | `/api/admin/halaqah[/{id}]` | CRUD halaqah |
| PATCH | `/api/admin/halaqah/{id}/target` | Target juz seluruh kelas |

---

## 6. Konfigurasi (`backend/.env`)

| Variabel | Bawaan | Keterangan |
|----------|--------|------------|
| `DATABASE_URL` | lokal | Koneksi PostgreSQL |
| `APP_ENV` | `development` | `production` menolak `JWT_SECRET` bawaan/lemah |
| `JWT_SECRET` | bawaan (dev) | **Wajib diganti di produksi**: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_EXPIRE_HOURS` | `720` | Lama sesi |
| `FRONTEND_BASE_URL` | `http://localhost:3000` | Dasar tautan masuk & QR |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Alamat frontend (format JSON) |
| `TIMEZONE` | `Asia/Jakarta` | Batas hari streak/dasbor |
| `ANALITIK_JENDELA_HARI` | `30` | Jendela kecepatan rata-rata |
| `MELAMBAT_AMBANG` | `0.5` | 0.5 = turun lebih dari 50% |
| `MELAMBAT_MIN_HARI_DATA` | `14` | Riwayat minimal sebelum dinilai melambat |

Frontend (`.env.local`): `NEXT_PUBLIC_API_URL=http://localhost:8000`.

---

## 7. Menuju produksi

- `APP_ENV=production` dan `JWT_SECRET` kuat; `FRONTEND_BASE_URL` = alamat situs sebenarnya (agar tautan & QR benar).
- Sajikan frontend dan backend lewat **HTTPS** (kamera pemindai QR mewajibkannya); isi `CORS_ORIGINS` dengan alamat frontend.
- Hosting yang direkomendasikan PRD: Vercel (frontend, set `NEXT_PUBLIC_API_URL`) dan Render/Railway (backend).
- Ganti `create_all` + migrasi ringan dengan **Alembic**, lalu set `AUTO_CREATE_TABLES=false`.
- Sesi disimpan di `localStorage` perangkat. Tidak ada pembatasan percobaan login; token acak 256 bit membuat tebakan tidak realistis.
- Sediakan ikon PWA `public/icons/icon-192.png` dan `icon-512.png`.

---

## 8. Menjalankan tes

```bash
cd backend
python -m pytest
```
64 tes (streak, dasbor, validasi, analitik, keamanan token/JWT). Tidak memerlukan database.

---

## 9. Pemecahan masalah

| Gejala | Penyebab / solusi |
|--------|-------------------|
| `ModuleNotFoundError: No module named 'app'` | Jalankan dari folder `backend/`. |
| `ModuleNotFoundError: No module named 'jwt'` | `pip install -r requirements-dev.txt` (butuh `pyjwt`). |
| `password authentication failed` / `connection refused` | `DATABASE_URL` salah atau PostgreSQL belum berjalan. |
| `database "zsm_hafalan" does not exist` | Buat database dulu (Langkah A). |
| Backend menolak start: `JWT_SECRET bawaan ... tidak diizinkan` | `APP_ENV=production` dengan rahasia lemah. Ganti `JWT_SECRET`. |
| Halaman `/masuk`: "Tautan atau QR tidak valid" | Tautan sudah diganti/dicabut atau salah salin. Minta tautan baru dari admin. |
| Tidak punya tautan admin | `python -m app.scripts.buat_admin "Nama Admin"` |
| Tiba-tiba kembali ke `/masuk` | Sesi berakhir atau tautan diganti admin. Masuk lagi dengan tautan baru. |
| Pemindai QR: "Kamera tidak tersedia" | Butuh HTTPS atau `localhost`, dan izin kamera. Tempel tautan manual. |
| Frontend: "Tidak dapat terhubung ke server" | Backend belum jalan, atau `NEXT_PUBLIC_API_URL` salah (restart `npm run dev` setelah mengubah `.env.local`). |
| Konsol menyebut CORS | Tambahkan alamat frontend ke `CORS_ORIGINS` (JSON), restart backend. |
| `Can't resolve '@/components/ui/dialog'` / `textarea` | `npx shadcn@latest add dialog textarea`. |
| `Can't resolve 'qrcode'` / `'jsqr'` | `npm install qrcode jsqr` dan `npm install -D @types/qrcode`. |
| Dasbor semua merah | Belum ada setoran hari ini: jalankan `seed_dashboard_demo`. |
| Prediksi "Belum ada data" | Belum ada Ziadah **terverifikasi**; validasi dulu atau jalankan `seed_analytics_demo`. |
| Port 8000 dipakai | `uvicorn app.main:app --reload --port 8001` dan ubah `NEXT_PUBLIC_API_URL`. |

---

## 10. Cakupan terhadap PRD

| PRD | Fitur | Status |
|-----|-------|--------|
| Fase 1 | Pilih sesi ZSM, Smart Auto-Fill, Konfirmasi Cepat, Streak harian | ✅ |
| Fase 1 | **Notifikasi pengingat** | ◐ banner + notifikasi browser saat aplikasi terbuka; push saat tertutup belum |
| Fase 2 | Dasbor real-time (polling 15 dtk), filter & pencarian (nama, halaqah), rating, catatan tajwid, verifikasi | ✅ |
| Fase 3 | Prediksi khatam, peringatan melambat, lencana milestone, profil capaian | ✅ |
| Fase 4 | Login Magic Link/QR, CRUD santri/ustadz/halaqah, target juz (santri & kelas), RBAC | ✅ |
| Stack | Next.js PWA mobile-first (manifest), FastAPI, PostgreSQL, Tailwind + shadcn/ui | ✅ (tanpa service worker/offline) |
| ERD | Users, Santri_Profiles, Halaqah, Setoran_Logs, Badges, Santri_Badges | ✅ (+ `hafalan_awal_ayat`, `dilihat`) |

Backlog: TASK-101–107 ✅ · 201–206 ✅ · 301–306 ✅ · 401–405 ✅ · **406 (uji lintas browser/perangkat) dilakukan manual**, lihat daftar di bawah.
Catatan implementasi: streak dihitung dari riwayat setoran (saat setoran berubah dan saat dibaca), bukan cron; "trigger lencana"
dijalankan di lapisan aplikasi setelah validasi/perubahan admin, bukan trigger database.

**Daftar uji lintas perangkat (TASK-406):** login lewat tautan dan QR (kamera ponsel + pemindai dalam aplikasi), beranda santri
di ponsel kecil, dasbor/tabel di tablet dan desktop, dialog validasi, animasi konfeti, mode hemat gerak, Chrome/Edge/Firefox/Safari.

---

## 11. Apa yang sudah diuji

- **Backend:** 64 tes unit, dan 147 pengecekan end-to-end ke PostgreSQL sungguhan, **dimulai dari database hasil Fase 3**
  (membuktikan jalur upgrade): autentikasi, seluruh matriks hak akses (santri/ustadz/admin, halaqah lain),
  pencabutan sesi, CRUD admin, cascade penghapusan, analitik, lencana otomatis, dan kode galat 401/403/404/409/422.
- **Frontend:** pengecekan tipe TypeScript, **`next build` produksi berhasil** (9 rute), dan 34 uji tampilan (React Testing Library)
  yang tersambung ke backend asli: login (Magic Link, tempel manual, token palsu), pelindung halaman per peran,
  dasbor ustadz + validasi, analitik & melambat, profil, pop-up lencana, pengingat, dan seluruh panel admin
  (termasuk pembuatan gambar QR). Pembuatan QR dan pembacaannya (jsQR) diuji saling cocok.
- **Belum diuji:** tampilan visual di browser sungguhan (CSS, animasi, responsivitas), kamera pemindai QR di perangkat nyata,
  komponen shadcn asli (pada uji dipakai pengganti sederhana), dan notifikasi di browser seluler. Mohon periksa saat pertama kali dijalankan.
