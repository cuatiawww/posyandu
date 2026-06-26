# Dashboard Puskes

Project ini adalah dashboard berbasis Next.js untuk kebutuhan pemantauan data kesehatan. Repository ini merupakan lanjutan dan penyesuaian dari project lama yang sedang diarahkan ulang menjadi `dashboard-puskes`.

## Menjalankan Project

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Env Wajib

Buat file `.env.local` berdasarkan `.env.example`.

```env
SIPKK_BACKEND_BASE_URL=https://sipkk-new.mediaciptainformasi.co.id
NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL=https://sipkk-new.mediaciptainformasi.co.id
```

`NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL` dipakai oleh browser supaya request frontend langsung mengarah ke backend `sipkk-new`, seperti:

- `https://sipkk-new.mediaciptainformasi.co.id/api/captcha`
- `https://sipkk-new.mediaciptainformasi.co.id/api/login`
- `https://sipkk-new.mediaciptainformasi.co.id/api/register`

Jika deploy ke Vercel, pastikan `SIPKK_BACKEND_BASE_URL` juga diisi di project settings lalu lakukan redeploy.

## Catatan CAPTCHA

Halaman login utama saat ini mengambil captcha dan login langsung ke backend Yii, bukan melalui API route Vercel.

Endpoint yang dipakai halaman login:

- `GET https://sipkk-new.mediaciptainformasi.co.id/api/captcha`
- `POST https://sipkk-new.mediaciptainformasi.co.id/api/login`

Masih ada route lokal `/api/captcha`, `/api/captcha/validate`, dan `/api/login` untuk kebutuhan demo/eksperimen lama.

## Dependency CAPTCHA Demo Lokal

Install dependency berikut jika route demo lokal masih ingin dipakai:

```bash
npm install svg-captcha uuid @upstash/redis
```

## Struktur Folder CAPTCHA Demo Lokal

```text
src/
  app/
    api/
      captcha/
        route.ts
        validate/
          route.ts
      login/
        route.ts
    login/
      page.tsx
  components/
    auth/
      CaptchaWidget.tsx
  lib/
    captcha/
      config.ts
      memory-store.ts
      service.ts
      store.ts
      types.ts
      upstash-store.ts
```

## Cara Kerja Route Demo Lokal

- `GET /api/captcha` membuat CAPTCHA SVG baru dan mengembalikan `{ id, svg }`.
- `POST /api/captcha/validate` menerima `{ id, text }`, mencocokkan secara case-insensitive, lalu menghapus challenge setelah divalidasi.
- CAPTCHA berlaku selama 2 menit.
- `CaptchaWidget` adalah Client Component yang:
  - menampilkan SVG
  - refresh CAPTCHA
  - input text
  - verify via `fetch`
- Halaman login contoh memaksa CAPTCHA tervalidasi lebih dulu sebelum `POST /api/login` diproses.

## Env Demo Lokal

### Development

```env
CAPTCHA_STORE=memory
DEMO_LOGIN_USERNAME=admin
DEMO_LOGIN_PASSWORD=demo12345
```

### Production dengan Redis / Upstash

```env
CAPTCHA_STORE=upstash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
DEMO_LOGIN_USERNAME=admin
DEMO_LOGIN_PASSWORD=demo12345
```

## Best Practice Security

- TTL dibatasi 2 menit agar challenge cepat kedaluwarsa.
- Jawaban CAPTCHA dinormalisasi ke lowercase sehingga validasi case-insensitive.
- Challenge dihapus setelah divalidasi, termasuk saat gagal, supaya tidak bisa di-bruteforce berkali-kali.
- Route validasi mengatur cookie `httpOnly` sementara agar server login bisa memastikan CAPTCHA memang sudah lolos.
- Untuk production, gunakan Redis/Upstash agar state CAPTCHA tidak bergantung pada memory proses Next.js.

## Catatan Migrasi

- Nama package sudah diarahkan ke `dashboard-puskes`.
- Beberapa modul internal masih memakai penamaan lama `psc` karena masih terhubung ke struktur halaman dan endpoint existing.
- Branding dan konfigurasi dasar bisa dirapikan bertahap tanpa harus langsung mengubah seluruh route/API.
