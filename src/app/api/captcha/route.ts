import { NextResponse } from 'next/server'
import { generateCaptcha } from '@/lib/captcha/service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const captcha = await generateCaptcha()
    const base64Svg = Buffer.from(captcha.svg).toString('base64')
    const captchaImage = `data:image/svg+xml;base64,${base64Svg}`

    return NextResponse.json({
      success: true,
      id: captcha.id,
      svg: captcha.svg,
      captcha_key: captcha.id,
      captcha_image: captchaImage,
      captcha_question: '',
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error) {
    console.error('Failed to generate local captcha', error)

    return NextResponse.json(
      { success: false, message: 'Gagal memuat CAPTCHA lokal.' },
      { status: 500 },
    )
  }
}
