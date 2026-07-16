import { NextRequest, NextResponse } from 'next/server'
import { getPosyanduStats } from '@/lib/posyanduData'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const province = searchParams.get('province') || ''
    const kabupaten = searchParams.get('kabupaten') || ''
    const timeFrame = searchParams.get('timeFrame') || 'Tahunan'
    const year = searchParams.get('year') || '2026'
    const period = searchParams.get('period') || ''

    const stats = getPosyanduStats(province, kabupaten, timeFrame, year, period)

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('[posyandu-stats-api]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
