import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gaps = [], stats = [], criticalProvinces = [] } = body

    // 1. Generate local realistic summary
    let summary = 'Analisis risiko Puskesmas nasional menunjukkan kondisi pelayanan yang cukup stabil.'
    if (criticalProvinces.length > 0) {
      summary = `Analisis Puskesmas menunjukkan wilayah ${criticalProvinces.slice(0, 3).join(', ')} memerlukan penguatan kapasitas layanan segera akibat tingginya tingkat kesenjangan atau kepadatan kasus.`
    } else if (gaps.length > 0) {
      summary = `Analisis Puskesmas mengindikasikan prioritas pemenuhan pada indikator ${gaps[0].name || 'Peralatan Medis'} guna memperkecil gap pelayanan.`
    }

    // 2. Generate local dynamic recommendations
    const recommendations: string[] = []
    
    // Add gap-based recommendations
    gaps.slice(0, 3).forEach((gap: any) => {
      recommendations.push(
        `<strong>Optimalisasi ${gap.name}</strong> - Lakukan peningkatan kapasitas dan penambahan unit Puskesmas untuk memangkas gap pelayanan ${gap.pct}% dalam target waktu 3 bulan.`
      )
    })

    // Add general recommendations if needed to reach at least 4 items
    if (recommendations.length < 4) {
      recommendations.push(
        `<strong>Peningkatan SDM Medis</strong> - Lakukan relokasi dan pelatihan tenaga medis darurat di daerah kritis dalam waktu 30 hari ke depan.`,
        `<strong>Sistem Pemantauan Digital</strong> - Tingkatkan integrasi data Puskesmas daerah dengan platform nasional untuk deteksi dini hambatan rujukan.`
      )
    }

    return NextResponse.json({
      summary,
      recommendations: recommendations.slice(0, 4)
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to generate mock AI insight', error)
    return NextResponse.json({
      summary: 'Analisis otomatis terkendala. Area prioritas tetap difokuskan pada penguatan Puskesmas dan pemerataan kualitas pelayanan.',
      recommendations: [
        '<strong>Fokus Pelayanan Dasar</strong> - Prioritaskan intervensi pada gap layanan dasar dengan rencana aksi terukur.',
        '<strong>Penyelarasan Logistik</strong> - Evaluasi distribusi alat kesehatan dan obat-obatan darurat di Puskesmas tipe C dan D.'
      ]
    }, { status: 200 })
  }
}
