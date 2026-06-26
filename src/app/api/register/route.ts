import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, captcha_value } = body

    const errors: Record<string, string> = {}

    if (username === 'admin') {
      errors.username = 'Username "admin" sudah terdaftar di sistem.'
    }
    if (email === 'admin@kemkes.go.id' || email === 'admin.pusat@kemkes.go.id') {
      errors.email = 'Alamat email ini sudah terdaftar.'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Registrasi gagal. Terdapat kesalahan input.',
        errors
      }, { status: 400 })
    }

    // Success response - moves user to OTP step
    return NextResponse.json({
      success: true,
      registration_id: 9999,
      message: 'Pendaftaran awal berhasil. Kode OTP 4 digit telah dikirimkan ke email Anda.'
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to register user', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal memproses pendaftaran akun secara lokal.'
    }, { status: 500 })
  }
}
