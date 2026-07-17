import { NextRequest, NextResponse } from 'next/server'
import { getPosyanduStats } from '@/lib/posyanduData'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Helper untuk menyederhanakan teks analisis menjadi naskah presenter video AI
async function generateVideoScript(summary: string, apiKey: string | undefined): Promise<string> {
  return "Maaf saat ini naskah belum tersedia"
}

// Helper untuk membuat gambar composite presenter (studio + panel info + presenter)
async function generateCompositePresenterImage(
  regionLabel: string,
  year: string,
  totalValid: number,
  totalAktif: number,
  pctAktif: number,
  totalSiklusHidup: number,
  pctSiklusHidup: number,
  totalKunjunganRumah: number,
  totalLaporPustu: number
): Promise<Buffer> {
  const path = require('path')
  const fs = require('fs')
  const sharp = require('sharp')

  const bgPath = path.join(process.cwd(), 'public/presenters/studio_bg.png')
  const presenterPath = path.join(process.cwd(), 'public/presenters/presenter.png')

  // Pastikan template asset ada
  if (!fs.existsSync(bgPath) || !fs.existsSync(presenterPath)) {
    throw new Error('Template assets (studio_bg.png or presenter.png) do not exist in public/presenters')
  }

  // 1. Resize background ke 1920x1080
  const bgBuffer = await sharp(bgPath)
    .resize({ width: 1920, height: 1080, fit: 'cover' })
    .toBuffer()

  // 2. Hilangkan background putih presenter & scale ke tinggi 850
  const presenterImg = sharp(presenterPath)
  const { data, info } = await presenterImg
    .raw()
    .toBuffer({ resolveWithObject: true })

  const outBuffer = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    let r, g, b, a
    if (info.channels === 3) {
      r = data[i * 3]
      g = data[i * 3 + 1]
      b = data[i * 3 + 2]
      a = 255
    } else {
      r = data[i * 4]
      g = data[i * 4 + 1]
      b = data[i * 4 + 2]
      a = data[i * 4 + 3]
    }

    if (r > 240 && g > 240 && b > 240) {
      a = 0 // Transparent
    }

    outBuffer[i * 4] = r
    outBuffer[i * 4 + 1] = g
    outBuffer[i * 4 + 2] = b
    outBuffer[i * 4 + 3] = a
  }

  const transparentPresenterBuffer = await sharp(outBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .resize({ height: 850 })
  .png()
  .toBuffer()

  // 3. Buat SVG overlay dengan data dashboard riil
  const activeTargetStatus = pctAktif >= 80 ? 'TERCAPAI' : 'BELUM TERCAPAI'
  const lifecycleTargetStatus = pctSiklusHidup >= 75 ? 'TERCAPAI' : 'BELUM TERCAPAI'
  const activeColor = pctAktif >= 80 ? '#00f5d4' : '#ff5a5f'
  const lifecycleColor = pctSiklusHidup >= 75 ? '#00f5d4' : '#ff5a5f'

  const svgOverlay = `
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#020a17" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#0a1931" stop-opacity="0.85"/>
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00b4d8"/>
          <stop offset="100%" stop-color="#0077b6"/>
        </linearGradient>
      </defs>

      <!-- Left Sidebar Panel for metrics -->
      <rect x="60" y="60" width="550" height="820" rx="24" fill="url(#panelGrad)" stroke="#00b4d8" stroke-width="3" />

      <!-- Lower Third Broadcast Bar (Ticker) -->
      <rect x="60" y="910" width="1800" height="110" rx="16" fill="#020a17" opacity="0.95" stroke="#00b4d8" stroke-width="2" />
      <rect x="60" y="910" width="280" height="110" rx="16" fill="url(#accentGrad)" />

      <text x="200" y="975" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">INFO UTAMA</text>
      <text x="380" y="975" font-family="Arial, sans-serif" font-size="26" fill="#00b4d8" font-weight="bold">PEMBAHARUAN DATA POSYANDU ${regionLabel.toUpperCase()} - TAHUN ${year}</text>

      <!-- Title / Location -->
      <text x="100" y="130" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ffffff">LAPORAN KINERJA AI</text>
      <text x="100" y="175" font-family="Arial, sans-serif" font-size="20" fill="#00b4d8" font-weight="bold">${regionLabel.toUpperCase()} - TAHUN ${year}</text>
      <line x1="100" y1="205" x2="570" y2="205" stroke="#00b4d8" stroke-width="2" opacity="0.5" />

      <!-- Metric 1: Keaktifan -->
      <text x="100" y="255" font-family="Arial, sans-serif" font-size="18" fill="#a0c4ff" font-weight="bold">KEAKTIFAN OPERASIONAL</text>
      <text x="100" y="315" font-family="Arial, sans-serif" font-size="48" fill="#ffffff" font-weight="bold">${pctAktif}%</text>
      <text x="220" y="305" font-family="Arial, sans-serif" font-size="14" fill="${activeColor}" font-weight="bold">TARGET: 80% (${activeTargetStatus})</text>

      <!-- Metric 2: Siklus Hidup -->
      <text x="100" y="395" font-family="Arial, sans-serif" font-size="18" fill="#a0c4ff" font-weight="bold">SIKLUS HIDUP AKTIF</text>
      <text x="100" y="455" font-family="Arial, sans-serif" font-size="48" fill="#ffffff" font-weight="bold">${pctSiklusHidup}%</text>
      <text x="220" y="445" font-family="Arial, sans-serif" font-size="14" fill="${lifecycleColor}" font-weight="bold">TARGET: 75% (${lifecycleTargetStatus})</text>

      <!-- Metric 3: Kunjungan Rumah -->
      <text x="100" y="535" font-family="Arial, sans-serif" font-size="18" fill="#a0c4ff" font-weight="bold">KUNJUNGAN RUMAH</text>
      <text x="100" y="590" font-family="Arial, sans-serif" font-size="40" fill="#ffffff" font-weight="bold">${totalKunjunganRumah.toLocaleString('id-ID')}</text>
      <text x="100" y="620" font-family="Arial, sans-serif" font-size="13" fill="#90e0ef">Kunjungan langsung oleh kader</text>

      <!-- Metric 4: Melapor Pustu -->
      <text x="100" y="695" font-family="Arial, sans-serif" font-size="18" fill="#a0c4ff" font-weight="bold">MELAPOR KE PUSTU</text>
      <text x="100" y="750" font-family="Arial, sans-serif" font-size="40" fill="#ffffff" font-weight="bold">${totalLaporPustu.toLocaleString('id-ID')}</text>
      <text x="100" y="780" font-family="Arial, sans-serif" font-size="13" fill="#90e0ef">Laporan terintegrasi Pustu</text>
    </svg>
  `

  // 4. Gabungkan semuanya
  return await sharp(bgBuffer)
    .composite([
      {
        input: transparentPresenterBuffer,
        top: 180,
        left: 1050
      },
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer()
}

// Helper untuk mentrigger pembuatan video avatar menggunakan API D-ID atau simulasi demo
async function triggerVideoGeneration(
  insightId: string,
  scriptText: string,
  meta?: {
    regionLabel: string
    year: string
    totalValid: number
    totalAktif: number
    pctAktif: number
    totalSiklusHidup: number
    pctSiklusHidup: number
    totalKunjunganRumah: number
    totalLaporPustu: number
  }
) {
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
    let sourceUrl = ''

    // 1. Jika data meta lengkap, generate presenter image composite secara dinamis & upload ke D-ID
    if (meta) {
      console.log('[VIDEO] [CRON] Generating dynamic composite image with dashboard metrics...')
      const compositeBuffer = await generateCompositePresenterImage(
        meta.regionLabel,
        meta.year,
        meta.totalValid,
        meta.totalAktif,
        meta.pctAktif,
        meta.totalSiklusHidup,
        meta.pctSiklusHidup,
        meta.totalKunjunganRumah,
        meta.totalLaporPustu
      )

      console.log('[VIDEO] [CRON] Uploading composite image to D-ID temporary storage...')
      const formData = new FormData()
      const fileBlob = new Blob([new Uint8Array(compositeBuffer)], { type: 'image/png' })
      formData.append('image', fileBlob, 'presenter.png')

      const uploadResponse = await fetch('https://api.d-id.com/images', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const uploadErr = await uploadResponse.text()
        throw new Error(`Failed to upload composite image to D-ID in CRON: ${uploadResponse.status} - ${uploadErr}`)
      }

      const uploadData = await uploadResponse.json()
      sourceUrl = uploadData.url // D-ID S3 Url
      console.log('[VIDEO] [CRON] Composite image uploaded successfully to D-ID:', sourceUrl)
    } else {
      // Fallback jika tidak ada data meta
      let presenterImageUrl = process.env.DID_PRESENTER_IMAGE_URL || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800'
      if (!presenterImageUrl.match(/\.(jpg|jpeg|png)($|\?)/i)) {
        presenterImageUrl += presenterImageUrl.includes('?') ? '&ext=.jpg' : '?ext=.jpg'
      }
      sourceUrl = presenterImageUrl
    }

    const voiceId = process.env.DID_VOICE_ID || 'id-ID-ArdiNeural'

    console.log('[VIDEO] [CRON] Triggering D-ID video generation with:', { sourceUrl, voiceId })

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
            voice_id: voiceId,
          },
        },
        source_url: sourceUrl,
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
Tugas Anda adalah menganalisis data kepatuhan dan keaktifan layanan Posyandu berdasarkan indikator kinerja nasional terbaru serta riset kesehatan terpercaya.

INSTRUKSI RISET KREDIBEL SEBELUM ANALISIS:
Sebelum Anda melakukan analisis data dashboard dan menghasilkan output JSON, Anda WAJIB melakukan riset terlebih dahulu menggunakan Google Search.
Lakukan pencarian pada situs-situs berikut:
1. Situs pemerintahan Indonesia yang kredibel terkait kesehatan (seperti kemkes.go.id, bps.go.id, atau domain .go.id resmi lainnya).
2. Website resmi WHO (who.int).
3. Website resmi UNICEF (unicef.org).

Topik riset Anda harus mencakup:
- Standar, pedoman, target, kebijakan terbaru, atau data statistik pembanding terkait Posyandu, kesehatan ibu dan anak (KIA), stunting, kunjungan rumah oleh kader, atau integrasi pelayanan kesehatan primer (ILP) di Indonesia.
- Bandingkan data riil dari dashboard Posyandu di bawah dengan standar/target nasional atau global yang Anda temukan melalui riset tersebut.

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
1. Ringkasan Singkat (summary): 3-4 kalimat ringkas mengenai status keaktifan, pencapaian target saat ini, serta intisari temuan riset kesehatan eksternal yang relevan.
2. Rekomendasi Aksi Konkret (recommendations - 4 Rekomendasi): Berikan rekomendasi spesifik untuk pemangku kebijakan setempat. Format masing-masing rekomendasi harus berupa judul singkat (diapit tag <strong>) diikuti penjelasan tindakan konkret.
3. Analisis Terperinci (detailedAnalysis): Penjelasan mendalam dalam format Markdown. Analisis ini WAJIB diawali dengan heading '## Ringkasan Riset & Pembanding Standar (Kemenkes/WHO/UNICEF)' yang berisi ringkasan hasil riset Anda dari situs-situs kredibel tersebut beserta pembanding data riil dashboard Anda. Kemudian lanjutkan dengan evaluasi kekuatan wilayah, kelemahan/kesenjangan terbesar, analisis spasial wilayah kritis (mengacu pada data spasial), serta peta jalan strategis jangka pendek untuk meningkatkan pencapaian target. Gunakan format Markdown yang menarik dan profesional (headers, bold text, bullet points).

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

        let response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [
                {
                  googleSearch: {}
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        )

        // Retry without search tool if 429 quota error or other issues occur
        if (!response.ok) {
          console.warn(`[CRON] Gemini call with search tools failed (status ${response.status}). Retrying without search tools...`)
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
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
        }

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

    // Fallback jika API Key tidak ada atau gagal
    if (!generatedSuccessfully) {
      console.warn('[CRON] Gemini API failed completely. Returning user-facing error message.')
      summaryText = 'maaf api tidak tersedia, silahkan refresh kembali'
      recommendationsArr = [
        '<strong>Error</strong> - maaf api tidak tersedia, silahkan refresh kembali'
      ]
      detailedAnalysisText = 'maaf api tidak tersedia, silahkan refresh kembali'
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
    });

    // Clean up old records for the same region + period, keeping only the latest one
    try {
      await prisma.aIInsightHistory.deleteMany({
        where: {
          province: cacheKey.province,
          kabupaten: cacheKey.kabupaten,
          year: cacheKey.year,
          timeFrame: cacheKey.timeFrame,
          period: cacheKey.period,
          id: {
            not: newRecord.id
          }
        }
      });
      console.log(`[CRON DB] Cleaned up older AI insights for ${cacheKey.province} - ${cacheKey.kabupaten}, keeping only: ${newRecord.id}`);
    } catch (cleanErr) {
      console.error('[CRON DB ERROR] Failed to clean up old AI insights:', cleanErr);
    }

    // Trigger video generator secara asinkron
    triggerVideoGeneration(newRecord.id, videoScript, {
      regionLabel: 'Nasional',
      year: cacheKey.year,
      totalValid,
      totalAktif,
      pctAktif,
      totalSiklusHidup,
      pctSiklusHidup,
      totalKunjunganRumah: stats.totalKunjunganRumah,
      totalLaporPustu: stats.totalLaporPustu
    });

    return NextResponse.json({ success: true, message: 'New historical insight generated successfully.', id: newRecord.id });

  } catch (error) {
    console.error('[CRON ERROR] Failed to warm cache:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
