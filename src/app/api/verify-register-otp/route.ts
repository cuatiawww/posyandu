import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registration_id, otp } = body

    if (!otp || otp.length !== 4 || isNaN(Number(otp))) {
      return NextResponse.json({
        success: false,
        message: 'Kode OTP tidak valid. Harus terdiri dari 4 digit angka.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verifikasi email berhasil! Akun pendaftaran Anda telah aktif. Silakan masuk.'
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to verify OTP', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal memproses verifikasi OTP secara lokal.'
    }, { status: 500 })
  }
}
