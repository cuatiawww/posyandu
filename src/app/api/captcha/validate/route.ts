import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import {
  CAPTCHA_COOKIE_MAX_AGE_SECONDS,
  CAPTCHA_COOKIE_NAME,
} from '@/lib/captcha/config'
import { validateCaptcha } from '@/lib/captcha/service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string; text?: string }
    const id = body.id ?? ''
    const text = body.text ?? ''
    const success = await validateCaptcha(id, text)

    const cookieStore = await cookies()

    if (success) {
      cookieStore.set(CAPTCHA_COOKIE_NAME, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: CAPTCHA_COOKIE_MAX_AGE_SECONDS,
      })
    } else {
      cookieStore.delete(CAPTCHA_COOKIE_NAME)
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('Failed to validate captcha', error)

    return NextResponse.json(
      { success: false, message: 'Payload CAPTCHA tidak valid.' },
      { status: 400 },
    )
  }
}
