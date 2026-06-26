import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, re_password } = body

    if (!password || password.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Kata sandi baru minimal 8 karakter.'
      }, { status: 400 })
    }

    if (password !== re_password) {
      return NextResponse.json({
        success: false,
        message: 'Konfirmasi kata sandi tidak cocok.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Kata sandi Anda berhasil diperbarui. Silakan login kembali dengan sandi baru.'
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to process forgot password verification', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal memverifikasi reset kata sandi secara lokal.'
    }, { status: 500 })
  }
}
