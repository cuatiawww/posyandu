import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPosyanduStats } from '@/lib/posyanduData'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      province = '',
      kabupaten = '',
      year = '2026',
      timeFrame = 'Tahunan',
      period = '',
    } = body

    const provName = province || 'NASIONAL'
    const kabName = kabupaten || 'SEMUA KAB/KOTA'

    // 1. Periksa cache di database
    const cacheKey = {
      province: provName,
      kabupaten: kabName,
      year,
      timeFrame,
      period,
    }

    const cached = await prisma.aIInsightCache.findUnique({
      where: {
        province_kabupaten_year_timeFrame_period: cacheKey,
      },
    })

    const TTL_MS = 5 * 60 * 60 * 1000 // 5 Jam
    const now = new Date()

    if (cached && now.getTime() - cached.updatedAt.getTime() < TTL_MS) {
      console.log('AI Insight returned from database cache:', cacheKey)
      return NextResponse.json(
        {
          summary: cached.summary,
          recommendations: JSON.parse(cached.recommendations),
          detailedAnalysis: cached.detailedAnalysis,
          cached: true,
        },
        { status: 200 }
      )
    }

    // 2. Tarik data statistik untuk filter yang dipilih
    const stats = getPosyanduStats(province, kabupaten, timeFrame, year, period)
    const totalValid = stats.totalValid

    if (totalValid === 0) {
      return NextResponse.json(
        {
          summary: 'Tidak ada data Posyandu terdaftar untuk wilayah ini.',
          recommendations: [
            '<strong>Registrasi Data</strong> - Mulai lakukan pendaftaran fasilitas Posyandu di sistem informasi.',
            '<strong>Pembinaan Wilayah</strong> - Hubungi dinas kesehatan setempat untuk verifikasi wilayah kerja.'
          ],
          detailedAnalysis: '# Analisis Kinerja Layanan Posyandu\n\nTidak ada data terdaftar untuk wilayah terpilih.',
        },
        { status: 200 }
      )
    }

    const totalAktif = stats.totalAktif
    const totalSiklusHidup = stats.totalSiklusHidupAktif
    const pctAktif = Math.round((totalAktif / totalValid) * 100)
    const pctSiklusHidup = Math.round((totalSiklusHidup / totalValid) * 100)

    // Dapatkan area dengan kinerja rendah untuk ringkasan spasial
    const lowPerforming = stats.wilayahBreakdown
      .filter((w: any) => w.pctAktif < 80 || w.pctSiklusHidup < 75)
      .sort((a: any, b: any) => a.pctAktif - b.pctAktif)
      .slice(0, 5)

    const spatialSummary =
      lowPerforming.length > 0
        ? `Wilayah kritis dengan kinerja di bawah target nasional:\n` +
          lowPerforming
            .map(
              (w: any) =>
                `- ${w.nama}: Keaktifan ${w.pctAktif}%, Siklus Hidup Aktif ${w.pctSiklusHidup}%`
            )
            .join('\n')
        : 'Seluruh wilayah dalam cakupan menunjukkan status keaktifan yang memenuhi target dasar.'

    // 3. Panggil Gemini API
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey && apiKey !== 'AIzaSyYourActualKeyHereIfProvided' && apiKey.trim() !== '') {
      try {
        const regionLabel = `${provName === 'NASIONAL' ? 'Nasional' : provName}${
          kabName !== 'SEMUA KAB/KOTA' ? ` - ${kabName}` : ''
        }`

        const prompt = `
Anda adalah seorang AI Health Policy Analyst Senior untuk Kementerian Kesehatan Republik Indonesia.
Tugas Anda adalah menganalisis data kepatuhan dan keaktifan layanan Posyandu berdasarkan indikator kinerja nasional terbaru.

Berikut adalah data dashboard Posyandu saat ini:
- Wilayah Analisis: ${regionLabel}
- Tahun Analisis: ${year}
- Periode Analisis: ${timeFrame} ${period ? `(${period})` : ''}

METRIKS UTAMA:
- Jumlah Posyandu Terdaftar (Valid): ${totalValid.toLocaleString('id-ID')}
- Jumlah Posyandu Aktif Operasional Bulanan: ${totalAktif.toLocaleString('id-ID')} (${pctAktif}% dari Valid)
- Jumlah Posyandu Siklus Hidup Aktif: ${totalSiklusHidup.toLocaleString('id-ID')} (${pctSiklusHidup}% dari Valid)
- Cakupan Kunjungan Rumah: ${stats.totalKunjunganRumah.toLocaleString('id-ID')}
- Cakupan Melapor ke Pustu: ${stats.totalLaporPustu.toLocaleString('id-ID')}
- Persentase Kabupaten/Kota Memenuhi Target Keaktifan (>=80%): ${stats.pctKabKotaMemenuhi}% (Target Nasional Tahun ${year}: ${stats.targetPct}%)
- Status Ketercapaian Target Nasional: ${stats.statusTarget}

STANDAR NASIONAL KEPATUHAN:
1. Target Keaktifan: Minimal 80% dari total Posyandu valid di wilayah tersebut harus aktif operasional setiap bulannya.
2. Target Siklus Hidup: Minimal 75% dari total Posyandu harus melayani seluruh siklus hidup keluarga (ibu hamil, balita, remaja, usia produktif, lansia).
3. Target Persentase Kabupaten/Kota Memenuhi Target: Minimal ${stats.targetPct}% untuk tahun ${year}.

SEBARAN SPASIAL POSYANDU:
${spatialSummary}

Berdasarkan data di atas, tolong hasilkan analisis terperinci yang mencakup:
1. Ringkasan Singkat (summary): 3-4 kalimat ringkas mengenai status keaktifan dan pencapaian target saat ini.
2. Rekomendasi Aksi Konkret (recommendations - 4 Rekomendasi): Berikan rekomendasi spesifik untuk pemangku kebijakan setempat. Format masing-masing rekomendasi harus berupa judul singkat (diapit tag <strong>) diikuti penjelasan tindakan konkret.
3. Analisis Terperinci (detailedAnalysis): Penjelasan mendalam dalam format Markdown. Analisis ini harus mengevaluasi kekuatan wilayah, kelemahan/kesenjangan terbesar, analisis spasial wilayah kritis (mengacu pada data spasial), serta peta jalan strategis jangka pendek untuk meningkatkan pencapaian target. Gunakan format Markdown yang menarik dan profesional (headers, bold text, bullet points).

Kembalikan respon hanya dalam format JSON dengan struktur berikut:
{
  "summary": "Teks ringkasan...",
  "recommendations": [
    "<strong>Judul 1</strong> - Deskripsi tindakan konkret...",
    "<strong>Judul 2</strong> - Deskripsi tindakan konkret...",
    "<strong>Judul 3</strong> - Deskripsi tindakan konkret...",
    "<strong>Judul 4</strong> - Deskripsi tindakan konkret..."
  ],
  "detailedAnalysis": "Teks analisis terperinci dalam format Markdown..."
}
`

        console.log(`Calling Gemini API for ${regionLabel}...`)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        )

        if (!response.ok) {
          throw new Error(`Gemini API error with status: ${response.status}`)
        }

        const responseData = await response.json()
        const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text

        if (textResponse) {
          const parsed = JSON.parse(textResponse)
          const { summary, recommendations, detailedAnalysis } = parsed

          // Simpan ke database
          await prisma.aIInsightCache.upsert({
            where: {
              province_kabupaten_year_timeFrame_period: cacheKey,
            },
            update: {
              summary,
              recommendations: JSON.stringify(recommendations),
              detailedAnalysis,
            },
            create: {
              ...cacheKey,
              summary,
              recommendations: JSON.stringify(recommendations),
              detailedAnalysis,
            },
          })

          return NextResponse.json({
            summary,
            recommendations,
            detailedAnalysis,
            cached: false,
          }, { status: 200 })
        }
      } catch (geminiError) {
        console.error('Failed to generate insight using Gemini API. Falling back to local heuristics.', geminiError)
      }
    } else {
      console.warn('GEMINI_API_KEY is not configured or placeholder remains. Using local fallback.')
    }

    // 4. Fallback Heuristic Generator (jika API Key tidak ada atau error)
    let summary = `Analisis tata kelola Posyandu di wilayah ${provName} (${year}) menunjukkan kondisi keaktifan pelayanan sebesar ${pctAktif}%.`
    if (pctAktif < 80) {
      summary = `Analisis Posyandu ${provName} mengindikasikan tingkat keaktifan (${pctAktif}%) masih berada di bawah target standar nasional 80%. Diperlukan langkah percepatan pembinaan kader.`
    } else if (pctSiklusHidup < 75) {
      summary = `Analisis Posyandu ${provName} menunjukkan keaktifan baik, namun persentase Siklus Hidup Aktif (${pctSiklusHidup}%) di bawah target 75%. Prioritaskan pengembangan ragam pelayanan terintegrasi.`
    }

    const recommendations: string[] = [
      `<strong>Optimalisasi Keaktifan Operasional</strong> - Koordinasikan dengan Puskesmas pembina untuk menaikkan persentase keaktifan bulanan wilayah yang masih di bawah 80%.`,
      `<strong>Pelatihan Layanan Siklus Hidup</strong> - Selenggarakan bimtek kader terpadu agar Posyandu mampu melayani seluruh sasaran usia (balita s.d. lansia).`,
      `<strong>Peningkatan Kepatuhan Target</strong> - Lakukan monitoring bulanan berjenjang di tingkat kecamatan dan kelurahan untuk memantau target nasional (${stats.targetPct}%).`,
      `<strong>Integrasi Pelaporan Pustu</strong> - Sempurnakan sistem pencatatan kunjungan rumah agar pelaporan ke Pustu terkirim secara tepat waktu.`
    ]

    const detailedAnalysis = `# Analisis Penilaian Kepatuhan & Keaktifan Layanan Posyandu - ${provName}

## Ringkasan Kinerja Eksekutif
Berdasarkan data filter tahun **${year}**, kinerja posyandu di wilayah **${provName}** tercatat memiliki **${totalValid.toLocaleString('id-ID')}** unit terdaftar dengan status keaktifan operasional bulanan sebesar **${pctAktif}%** (${totalAktif.toLocaleString('id-ID')} aktif) dan layanan Siklus Hidup Aktif sebesar **${pctSiklusHidup}%** (${totalSiklusHidup.toLocaleString('id-ID')} aktif).

## Analisis Kesenjangan & Wilayah Kritis
Terdapat beberapa wilayah yang menunjukkan kinerja kritis di bawah ambang batas standar nasional keaktifan (80%) dan siklus hidup aktif (75%):
${spatialSummary}

## Peta Jalan Strategis & Rekomendasi
Untuk mendorong akselerasi pencapaian target nasional sebesar **${stats.targetPct}%**, Kementerian Kesehatan menyarankan langkah taktis berikut:
1. **Penguatan Insentif & Kapasitas Kader**: Melakukan rekrutmen serta penyegaran kapasitas kader secara masif.
2. **Standardisasi Alat Antropometri**: Memastikan setiap unit Posyandu memiliki alat timbang/ukur standar kementerian.
3. **Penyelarasan Logistik PMT**: Meningkatkan distribusi Bahan PMT (Pemberian Makanan Tambahan) lokal berbasis gizi seimbang.
`

    // Simpan fallback ke database agar response berikutnya tetap instant
    try {
      await prisma.aIInsightCache.upsert({
        where: {
          province_kabupaten_year_timeFrame_period: cacheKey,
        },
        update: {
          summary,
          recommendations: JSON.stringify(recommendations),
          detailedAnalysis,
        },
        create: {
          ...cacheKey,
          summary,
          recommendations: JSON.stringify(recommendations),
          detailedAnalysis,
        },
      })
    } catch (dbErr) {
      console.error('Failed to cache fallback to database', dbErr)
    }

    return NextResponse.json({
      summary,
      recommendations,
      detailedAnalysis,
      cached: false,
    }, { status: 200 })

  } catch (error) {
    console.error('Internal API route error', error)
    return NextResponse.json({
      summary: 'Analisis otomatis terkendala sementara. Silakan coba beberapa saat lagi.',
      recommendations: [
        '<strong>Fokus Pelayanan Dasar</strong> - Evaluasi kesiapan dasar operasional.',
        '<strong>Penyelarasan Koordinasi</strong> - Lakukan koordinasi berkala antar dinas kesehatan.'
      ],
      detailedAnalysis: '# Terjadi Masalah Sistem\n\nAnalisis otomatis tidak dapat dimuat karena terjadi kesalahan internal.',
    }, { status: 500 })
  }
}
