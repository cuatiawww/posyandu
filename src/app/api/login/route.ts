import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string
      password?: string
      captcha_key?: string
      captcha_value?: string
    }

    const username = body.username?.trim() ?? ''
    const password = body.password ?? ''
    const captchaKey = body.captcha_key ?? ''
    const captchaValue = body.captcha_value?.trim() ?? ''

    if (!username || !password || !captchaKey || !captchaValue) {
      return NextResponse.json(
        { success: false, message: 'Username, password, dan captcha wajib diisi.' },
        { status: 400 },
      )
    }

    // Support multiple mock personas to test scopes:
    // 1. admin / demo12345 -> National scope
    // 2. provinsi / demo12345 -> Provincial scope (West Java)
    // 3. kabupaten / demo12345 -> Regency scope (Bogor, West Java)
    if (password === 'demo12345') {
      if (username === 'admin') {
        return NextResponse.json({
          success: true,
          message: 'Login berhasil (Akses Nasional).',
          token: 'mock-jwt-token-national-scope',
          user: {
            id_user: 1,
            username: 'admin',
            email: 'admin.pusat@kemkes.go.id',
            nama_lengkap: 'Administrator Pusat',
            level_user_id: 1,
            level_name: 'Super Administrator',
            wilayah_scope: {
              mode: 'all',
              access_label: 'Pusat pemantauan nasional fasilitas kesehatan',
              cakupan: { id: 'all', value: 'all', label: 'Nasional', locked: false },
              provinsi: { id: '', value: '', label: '', locked: false },
              kabupaten: { id: '', value: '', label: '', locked: false },
            },
          },
        }, { status: 200 })
      } else if (username === 'provinsi') {
        return NextResponse.json({
          success: true,
          message: 'Login berhasil (Akses Provinsi Jawa Barat).',
          token: 'mock-jwt-token-provinsi-scope',
          user: {
            id_user: 2,
            username: 'provinsi',
            email: 'admin.jabar@kemkes.go.id',
            nama_lengkap: 'Admin Jawa Barat',
            level_user_id: 2,
            level_name: 'Admin Provinsi',
            wilayah_scope: {
              mode: 'provinsi',
              access_label: 'Pemantauan Tingkat Provinsi Jawa Barat',
              cakupan: { id: 'provinsi', value: 'provinsi', label: 'JAWA BARAT', locked: true },
              provinsi: { id: '32', value: '32', label: 'JAWA BARAT', locked: true },
              kabupaten: { id: '', value: '', label: '', locked: false },
            },
          },
        }, { status: 200 })
      } else if (username === 'kabupaten') {
        return NextResponse.json({
          success: true,
          message: 'Login berhasil (Akses Kabupaten Bogor).',
          token: 'mock-jwt-token-kabupaten-scope',
          user: {
            id_user: 3,
            username: 'kabupaten',
            email: 'admin.bogor@kemkes.go.id',
            nama_lengkap: 'Admin Kab. Bogor',
            level_user_id: 3,
            level_name: 'Admin Kab/Kota',
            wilayah_scope: {
              mode: 'kabupaten',
              access_label: 'Pemantauan Tingkat Kabupaten Bogor',
              cakupan: { id: 'kabupaten', value: 'kabupaten', label: 'KABUPATEN BOGOR', locked: true },
              provinsi: { id: '32', value: '32', label: 'JAWA BARAT', locked: true },
              kabupaten: { id: '3201', value: '3201', label: 'KABUPATEN BOGOR', locked: true },
            },
          },
        }, { status: 200 })
      }
    }

    // Default: jika kredensial salah
    return NextResponse.json(
      { success: false, message: 'Username atau password salah. Gunakan password "demo12345" untuk akun admin/provinsi/kabupaten.' },
      { status: 401 },
    )
  } catch (error) {
    console.error('Failed to process login', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memproses permintaan login lokal.' },
      { status: 500 },
    )
  }
}
