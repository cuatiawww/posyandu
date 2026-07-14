# 🏥 Dashboard Monitoring Posyandu & Puskesmas

Dashboard berbasis web modern yang dirancang untuk kebutuhan pemantauan, analisis, dan tata kelola data kesehatan pada tingkat **Posyandu (Pos Pelayanan Terpadu)** dan **Puskesmas**. Aplikasi ini mempermudah monitoring status keaktifan layanan kesehatan secara berjenjang mulai dari tingkat Kabupaten/Kota, Provinsi, hingga tingkat Nasional.

---

## ✨ Fitur Utama

### 📊 1. Dashboard Interaktif (Posyandu & Kader)
Aplikasi ini menyediakan dua tampilan dashboard utama yang menyesuaikan dengan peran pengguna:
*   **Dashboard Posyandu**: Menyajikan analisis performa, tren tahunan, data funnel cakupan posyandu, dan status ketercapaian target indikator.
*   **Dashboard Kader**: Didesain khusus untuk kader kesehatan lapangan guna mempermudah pemantauan sasaran kerja, performa pelayanan, dan tugas harian.

### 🗺️ 2. Peta Interaktif Spasial (Interactive Geo-Mapping)
Integrasi dengan **React Leaflet** untuk memetakan sebaran posyandu di setiap wilayah. Peta ini dapat memvisualisasikan:
*   Pinpoint lokasi fasilitas posyandu/puskesmas.
*   Status keaktifan layanan di setiap regional secara real-time.
*   Informasi tooltip detail performa wilayah saat marker diklik.

### 🤖 3. AI Insights & Analisis Otomatis
Menggunakan integrasi API cerdas (`/api/ai-insight`) untuk menganalisis data performa wilayah secara dinamis:
*   Mendeteksi gap pelayanan terbesar di suatu daerah.
*   Memberikan rekomendasi aksi konkret bagi pengambil kebijakan secara langsung di dashboard.
*   Menyoroti wilayah-wilayah kritis (*critical provinces/kabupaten*) yang memerlukan perhatian khusus.

### 📈 4. Visualisasi Data Kaya (Rich Data Visualization)
Penyajian data statistik kesehatan menggunakan berbagai grafik modern dari **Recharts**, **ApexCharts**, dan **Chart.js**:
*   *Area & Line Chart*: Tren tahunan posyandu aktif & valid.
*   *Pie & Funnel Chart*: Distribusi status keaktifan dan tahap pemenuhan target layanan dasar.
*   *Bar Chart*: Perbandingan performa antar wilayah.

### 🏢 5. Filter Wilayah & Waktu Berjenjang
Pengguna dapat memfilter seluruh data dashboard berdasarkan:
*   **Wilayah**: Nasional ➡️ Provinsi ➡️ Kabupaten/Kota.
*   **Waktu**: Periode Tahunan, Kuartalan, atau Bulanan (termasuk pemilihan tahun berjalan seperti 2024, 2025, dan 2026).

### 🔐 6. Sistem Autentikasi Lengkap
Dilengkapi keamanan akses data menggunakan:
*   Login, Registrasi, dan Lupa Password.
*   Dukungan Single Sign-On (SSO) untuk integrasi dengan sistem kementerian/lembaga terkait.
*   Manajemen state sesi pengguna secara lokal menggunakan **Zustand**.

---

## 🛠️ Tech Stack

### Frontend & Core
*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS & Vanilla CSS
*   **State Management**: Zustand
*   **Icons**: Lucide React

### Visualisasi & Maps
*   **Charts**: Recharts, Chart.js, ApexCharts
*   **Mapping**: Leaflet & React Leaflet

### Backend & Database (Optional/Prepared)
*   **ORM**: Prisma
*   **Database**: PostgreSQL, MySQL, SQLite, Upstash Redis

---

## 🚀 Panduan Memulai (Getting Started)

### Prasyarat
Pastikan Anda sudah menginstal **Node.js** (versi 18+) di mesin Anda.

### 1. Kloning Repositori
```bash
git clone <url-repository>
cd posyandu
```

### 2. Instalasi Dependency
Instal seluruh pustaka yang diperlukan:
```bash
npm install
```

### 3. Setup Environment Variables
Buat berkas `.env.local` di root project dengan menyalin template yang ada:
```bash
cp .env.example .env.local
```
Sesuaikan konfigurasi environment, terutama URL backend API utama:
```env
SIPKK_BACKEND_BASE_URL=https://sipkk-new.mediaciptainformasi.co.id
NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL=https://sipkk-new.mediaciptainformasi.co.id
```

### 4. Jalankan Development Server
Jalankan server lokal:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat aplikasi.

### 5. Build untuk Produksi
Untuk mengompilasi dan mengoptimalkan aplikasi untuk rilis produksi:
```bash
npm run build
npm run start
```

---

## 📂 Struktur Folder Utama

```text
src/
├── app/                  # Route Next.js App Router (login, register, dashboard, api)
│   ├── api/ai-insight/   # Endpoint untuk menghasilkan analisis otomatis data
│   ├── dashboard-kader/  # Halaman dashboard khusus untuk Kader Kesehatan
│   └── dashboard-posyandu/# Halaman dashboard pemantauan Posyandu
├── components/           # Komponen UI Reusable
│   ├── layout/           # DashboardHeader, Navbar, Footer
│   └── posyandu/         # DisasterMap, PerformanceBreakdownTable, dll.
├── hooks/                # Custom React Hooks
├── lib/                  # Helper logic & Data loader mock (posyanduData, authStore)
└── types/                # Definisi TypeScript interface & types
```

---

## 📝 Catatan Migrasi & Kepatuhan Target
*   Nama package utama diarahkan ke `dashboard-puskes`.
*   Indikator performa keaktifan posyandu mengikuti standarisasi kelayakan nasional:
    *   **Target Keaktifan**: Minimal **80%** dari total Posyandu valid di wilayah tersebut.
    *   **Target Siklus Hidup**: Minimal **75%** Posyandu melayani seluruh siklus hidup keluarga.
    *   **Target Nasional tahunan**: **15%** (2024), **20%** (2025), dan **25%** (2026).
