import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registration_id } = body

    if (!registration_id) {
      return NextResponse.json({
        success: false,
        message: 'Registration ID tidak valid.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Kode OTP baru berhasil dikirim ulang ke alamat email Anda.'
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to resend OTP', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal mengirim ulang OTP secara lokal.'
    }, { status: 500 })
  }
}
