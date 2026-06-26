import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Alamat email wajib diisi.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Instruksi reset kata sandi telah dikirim ke alamat email Anda.'
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to process forgot password request', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal memproses permintaan reset sandi secara lokal.'
    }, { status: 500 })
  }
}
