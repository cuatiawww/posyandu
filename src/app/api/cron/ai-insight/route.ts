import { NextRequest, NextResponse } from 'next/server'
import { getPosyanduStats } from '@/lib/posyanduData'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Helper untuk menyederhanakan teks analisis menjadi naskah presenter video AI
async function generateVideoScript(summary: string, apiKey: string | undefined): Promise<string> {
  if (apiKey && apiKey !== 'AIzaSyYourActualKeyHereIfProvided' && apiKey.trim() !== '') {
    try {
      const prompt = `
Ubah laporan analisis kesehatan berikut menjadi sebuah naskah presentasi video singkat (durasi sekitar 30-45 detik, maksimal 100-120 kata). 
Naskah harus ditulis dalam bahasa Indonesia yang santun, profesional, dan mudah dipahami, seolah-olah dibacakan oleh pembawa berita atau presenter virtual.
Jangan gunakan format markdown, bullet points, list, tanda bintang (*), atau simbol-simbol khusus. Berikan naskah teks polos langsung dibacakan.

Laporan Analisis:
${summary}
`
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      )

      if (response.ok) {
        const responseData = await response.json()
        const scriptText = responseData.candidates?.[0]?.content?.parts?.[0]?.text
        if (scriptText) {
          return scriptText.trim()
        }
      }
    } catch (err) {
      console.error('[SCRIPT] Failed to generate script via Gemini:', err)
    }
  }

  // Fallback jika API Key kosong/gagal
  return `Halo Bapak Ibu sekalian. Berikut adalah ringkasan analisis Posyandu secara nasional. ${summary.replace(/[#*_\-`]/g, '')} Terima kasih atas perhatian Anda, mari kita tingkatkan kualitas pelayanan Posyandu bersama-sama.`
}

// Helper untuk mentrigger pembuatan video avatar menggunakan API D-ID atau simulasi demo
async function triggerVideoGeneration(insightId: string, scriptText: string) {
  const apiKey = process.env.DID_API_KEY

  if (!apiKey || apiKey === 'MASUKKAN_API_KEY_D_ID_ANDA_DI_SINI' || apiKey.trim() === '') {
    console.log('[VIDEO] [CRON] No DID_API_KEY found. Simulating video generation in Demo Mode.')
    // Simulasikan pembuatan video asinkron (selesai setelah 5 detik)
    setTimeout(async () => {
      try {
        await prisma.aIInsightHistory.update({
          where: { id: insightId },
          data: {
            videoStatus: 'COMPLETED',
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-doctor-explaining-something-on-a-digital-tablet-41225-large.mp4',
          },
        })
        console.log('[VIDEO] [CRON] Simulated D-ID video generation completed for:', insightId)
      } catch (err) {
        console.error('[VIDEO] [CRON] Failed to update simulated video status:', err)
      }
    }, 5000)

    return { jobId: 'mock-job-' + insightId, status: 'GENERATING' }
  }

  try {
    const response = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: {
          type: 'text',
          input: scriptText,
          provider: {
            type: 'microsoft',
            voice_id: 'id-ID-GadisNeural', // Suara wanita Indonesia
          },
        },
        source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg', // S3 bucket resmi D-ID yang dijamin didukung
        config: {
          fluent: true,
          pad_audio: 0,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`D-ID API response error: ${response.status} - ${errText}`)
    }

    const data = await response.json()
    console.log('[VIDEO] [CRON] D-ID video generation triggered successfully:', data)

    await prisma.aIInsightHistory.update({
      where: { id: insightId },
      data: {
        videoJobId: data.id,
        videoStatus: 'GENERATING',
      },
    })

    return { jobId: data.id, status: 'GENERATING' }
  } catch (error) {
    console.error('[VIDEO] [CRON] Error triggering D-ID video generation:', error)
    await prisma.aIInsightHistory.update({
      where: { id: insightId },
      data: {
        videoStatus: 'FAILED',
      },
    })
    return { jobId: null, status: 'FAILED' }
  }
}

export async function GET(req: NextRequest) {
  try {
    // Pengamanan opsional via token di header Authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const defaultYear = '2026'
    const cacheKey = {
      province: 'NASIONAL',
      kabupaten: 'SEMUA KAB/KOTA',
      year: defaultYear,
      timeFrame: 'Tahunan',
      period: '',
    }

    // Cek apakah hari ini sudah pernah dijalankan cron/analisis nasional
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayRecord = await prisma.aIInsightHistory.findFirst({
      where: {
        province: cacheKey.province,
        kabupaten: cacheKey.kabupaten,
        year: cacheKey.year,
        timeFrame: cacheKey.timeFrame,
        period: cacheKey.period,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    if (todayRecord) {
      console.log('[CRON] AI Insight cache for NASIONAL today is already up to date.')
      return NextResponse.json({ success: true, message: 'Today\'s NASIONAL cache already exists.', id: todayRecord.id })
    }

    console.log('[CRON] Generating new AI Insight history for:', cacheKey)

    // Tarik data statistik nasional
    const stats = getPosyanduStats('', '', 'Tahunan', defaultYear, '')
    const totalValid = stats.totalValid

    if (totalValid === 0) {
      return NextResponse.json({ message: 'No data to analyze.' }, { status: 200 })
    }

    const totalAktif = stats.totalAktif
    const totalSiklusHidup = stats.totalSiklusHidupAktif
    const pctAktif = Math.round((totalAktif / totalValid) * 100)
    const pctSiklusHidup = Math.round((totalSiklusHidup / totalValid) * 100)

    // Dapatkan data wilayah kritis
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

    let summaryText = ''
    let recommendationsArr: string[] = []
    let detailedAnalysisText = ''
    let generatedSuccessfully = false

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey && apiKey !== 'AIzaSyYourActualKeyHereIfProvided' && apiKey.trim() !== '') {
      try {
        const prompt = `
Anda adalah seorang AI Health Policy Analyst Senior untuk Kementerian Kesehatan Republik Indonesia.
Tugas Anda adalah menganalisis data kepatuhan dan keaktifan layanan Posyandu berdasarkan indikator kinerja nasional terbaru.

Berikut adalah data dashboard Posyandu saat ini:
- Wilayah Analisis: Nasional
- Tahun Analisis: ${defaultYear}
- Periode Analisis: Tahunan

METRIKS UTAMA:
- Jumlah Posyandu Terdaftar (Valid): ${totalValid.toLocaleString('id-ID')}
- Jumlah Posyandu Aktif Operasional Bulanan: ${totalAktif.toLocaleString('id-ID')} (${pctAktif}% dari Valid)
- Jumlah Posyandu Siklus Hidup Aktif: ${totalSiklusHidup.toLocaleString('id-ID')} (${pctSiklusHidup}% dari Valid)
- Cakupan Kunjungan Rumah: ${stats.totalKunjunganRumah.toLocaleString('id-ID')}
- Cakupan Melapor ke Pustu: ${stats.totalLaporPustu.toLocaleString('id-ID')}
- Persentase Kabupaten/Kota Memenuhi Target Keaktifan (>=80%): ${stats.pctKabKotaMemenuhi}% (Target Nasional Tahun ${defaultYear}: ${stats.targetPct}%)
- Status Ketercapaian Target Nasional: ${stats.statusTarget}

STANDAR NASIONAL KEPATUHAN:
1. Target Keaktifan: Minimal 80% dari total Posyandu valid di wilayah tersebut harus aktif operasional setiap bulannya.
2. Target Siklus Hidup: Minimal 75% dari total Posyandu harus melayani seluruh siklus hidup keluarga (ibu hamil, balita, remaja, usia produktif, lansia).
3. Target Persentase Kabupaten/Kota Memenuhi Target: Minimal ${stats.targetPct}% untuk tahun ${defaultYear}.

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

        if (response.ok) {
          const responseData = await response.json()
          const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text
          if (textResponse) {
            const parsed = JSON.parse(textResponse)
            summaryText = parsed.summary
            recommendationsArr = parsed.recommendations
            detailedAnalysisText = parsed.detailedAnalysis
            generatedSuccessfully = true
          }
        }
      } catch (geminiErr) {
        console.error('[CRON] Failed to generate cron insight via Gemini:', geminiErr)
      }
    }

    // Heuristics Fallback jika API Key kosong/gagal
    if (!generatedSuccessfully) {
      console.warn('[CRON] Using fallback heuristics.')
      summaryText = `Analisis tata kelola Posyandu di wilayah NASIONAL (${defaultYear}) menunjukkan keaktifan operasional bulanan sebesar ${pctAktif}%.`
      recommendationsArr = [
        `<strong>Optimalisasi Keaktifan Operasional</strong> - Koordinasikan dengan Puskesmas pembina untuk menaikkan persentase keaktifan bulanan wilayah yang masih di bawah 80%.`,
        `<strong>Pelatihan Layanan Siklus Hidup</strong> - Selenggarakan bimtek kader terpadu agar Posyandu mampu melayani seluruh sasaran usia (balita s.d. lansia).`,
        `<strong>Peningkatan Kepatuhan Target</strong> - Lakukan monitoring bulanan berjenjang di tingkat kecamatan dan kelurahan untuk memantau target nasional (${stats.targetPct}%).`,
        `<strong>Integrasi Pelaporan Pustu</strong> - Sempurnakan sistem pencatatan kunjungan rumah agar pelaporan ke Pustu terkirim secara tepat waktu.`
      ]
      detailedAnalysisText = `# Analisis Penilaian Kepatuhan & Keaktifan Layanan Posyandu - NASIONAL (Cron)

## Ringkasan Kinerja Eksekutif (Pre-Generated)
Berdasarkan data filter tahun **${defaultYear}**, kinerja posyandu secara nasional tercatat memiliki **${totalValid.toLocaleString('id-ID')}** unit terdaftar dengan status keaktifan operasional bulanan sebesar **${pctAktif}%** (${totalAktif.toLocaleString('id-ID')} aktif) dan layanan Siklus Hidup Aktif sebesar **${pctSiklusHidup}%** (${totalSiklusHidup.toLocaleString('id-ID')} aktif).

## Analisis Kesenjangan & Wilayah Kritis
Terdapat beberapa wilayah yang menunjukkan kinerja kritis di bawah ambang batas standar nasional keaktifan (80%) dan siklus hidup aktif (75%):
${spatialSummary}

## Peta Jalan Strategis & Rekomendasi
Untuk mendorong akselerasi pencapaian target nasional sebesar **${stats.targetPct}%**, Kementerian Kesehatan menyarankan langkah taktis berikut:
1. **Penguatan Insentif & Kapasitas Kader**: Melakukan rekrutmen serta penyegaran kapasitas kader secara masif.
2. **Standardisasi Alat Antropometri**: Memastikan setiap unit Posyandu memiliki alat timbang/ukur standar kementerian.
3. **Penyelarasan Logistik PMT**: Meningkatkan distribusi Bahan PMT (Pemberian Makanan Tambahan) lokal berbasis gizi seimbang.
`
    }

    const videoScript = await generateVideoScript(summaryText, apiKey)

    // Buat data riwayat baru
    const newRecord = await prisma.aIInsightHistory.create({
      data: {
        province: cacheKey.province,
        kabupaten: cacheKey.kabupaten,
        year: cacheKey.year,
        timeFrame: cacheKey.timeFrame,
        period: cacheKey.period,
        summary: summaryText,
        recommendations: JSON.stringify(recommendationsArr),
        detailedAnalysis: detailedAnalysisText,
        videoScript,
        videoStatus: 'PENDING',
      },
    })

    // Trigger video generator secara asinkron
    triggerVideoGeneration(newRecord.id, videoScript)

    return NextResponse.json({ success: true, message: 'New historical insight generated successfully.', id: newRecord.id })

  } catch (error) {
    console.error('[CRON ERROR] Failed to warm cache:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
