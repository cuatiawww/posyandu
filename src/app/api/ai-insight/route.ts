import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gaps = [], stats = [], criticalProvinces = [] } = body

    // 1. Generate local realistic summary
    let summary = 'Analisis tata kelola Posyandu nasional menunjukkan kondisi keaktifan pelayanan yang cukup stabil.'
    if (criticalProvinces.length > 0) {
      summary = `Analisis Posyandu menunjukkan wilayah ${criticalProvinces.slice(0, 3).join(', ')} memerlukan penguatan kapasitas layanan segera akibat tingginya tingkat kesenjangan atau keaktifan kegiatan.`
    } else if (gaps.length > 0) {
      summary = `Analisis Posyandu mengindikasikan prioritas pemenuhan pada indikator ${gaps[0].name || 'Siklus Hidup Aktif'} guna memperkecil gap pelayanan.`
    }

    // 2. Generate local dynamic recommendations
    const recommendations: string[] = []
    
    // Add gap-based recommendations
    gaps.slice(0, 3).forEach((gap: any) => {
      recommendations.push(
        `<strong>Optimalisasi ${gap.name}</strong> - Lakukan peningkatan kapasitas dan pembinaan kader untuk memangkas gap pelayanan ${gap.pct}% dalam target waktu 3 bulan.`
      )
    })

    // Add general recommendations if needed to reach at least 4 items
    if (recommendations.length < 4) {
      recommendations.push(
        `<strong>Peningkatan Kompetensi Kader</strong> - Lakukan pelatihan berkelanjutan untuk meningkatkan jumlah kader aktif di daerah dengan tingkat partisipasi rendah.`,
        `<strong>Sistem Pemantauan Digital</strong> - Tingkatkan integrasi data kegiatan Posyandu dengan platform nasional untuk mempermudah monitoring berjenjang.`
      )
    }

    return NextResponse.json({
      summary,
      recommendations: recommendations.slice(0, 4)
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to generate mock AI insight', error)
    return NextResponse.json({
      summary: 'Analisis otomatis terkendala. Area prioritas tetap difokuskan pada penguatan keaktifan Posyandu dan pembinaan kompetensi kader.',
      recommendations: [
        '<strong>Fokus Pelayanan Dasar</strong> - Prioritaskan intervensi pada gap pelayanan dasar dengan rencana aksi terukur.',
        '<strong>Penyelarasan Logistik</strong> - Evaluasi ketersediaan PMT (Pemberian Makanan Tambahan) dan alat timbang/ukur antropometri standar.'
      ]
    }, { status: 200 })
  }
}
