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
Naskah harus ditulis dalam Bahasa Indonesia yang baku, profesional, modern, rapi, dan berwibawa seolah-olah dibacakan oleh pembawa berita televisi nasional.
Gunakan tempo bicara yang relatif cepat (seperti presenter berita televisi), namun tetap jelas dan mudah dipahami. Artikulasi harus sangat jelas dengan intonasi yang dinamis (tidak monoton) serta memberikan penekanan yang kuat pada angka, fakta, dan kesimpulan penting.
Jangan gunakan format markdown, bullet points, list, tanda bintang (*), atau simbol-simbol khusus. Berikan naskah teks polos langsung dibacakan.

Laporan Analisis:
${summary}
`
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
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

// Helper untuk mentrigger pembuatan video avatar menggunakan API HeyGen atau simulasi demo
async function triggerVideoGeneration(insightId: string, scriptText: string) {
  const apiKey = process.env.HEYGEN_API_KEY

  if (!apiKey || apiKey === 'MASUKKAN_API_KEY_HEYGEN_ANDA_DI_SINI' || apiKey.trim() === '') {
    console.log('[VIDEO] [CRON] No HEYGEN_API_KEY found. Simulating video generation in Demo Mode.')
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
        console.log('[VIDEO] [CRON] Simulated HeyGen video generation completed for:', insightId)
      } catch (err) {
        console.error('[VIDEO] [CRON] Failed to update simulated video status:', err)
      }
    }, 5000)

    return { jobId: 'mock-job-' + insightId, status: 'GENERATING' }
  }

  try {
    const avatarId = process.env.HEYGEN_AVATAR_ID || 'Wayland_front_suit_20240801'
    const voiceId = process.env.HEYGEN_VOICE_ID || 'id-ID-ArdiNeural'
    const backgroundUrl = process.env.HEYGEN_BACKGROUND_URL || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920'

    console.log('[VIDEO] [CRON] Triggering HeyGen video generation:', { avatarId, voiceId, backgroundUrl })

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: scriptText,
              voice_id: voiceId,
              speed: 1.0,
            },
            background: {
              type: 'image',
              url: backgroundUrl,
            },
          },
        ],
        dimension: {
          width: 1920,
          height: 1080,
        },
        title: 'Analisis Kinerja Posyandu AI',
        caption: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`HeyGen API response error: ${response.status} - ${errText}`)
    }

    const resJson = await response.json()
    console.log('[VIDEO] [CRON] HeyGen video generation response:', resJson)

    const videoId = resJson.data?.video_id || resJson.video_id
    if (!videoId) {
      throw new Error(`Failed to retrieve video_id from HeyGen response: ${JSON.stringify(resJson)}`)
    }

    await prisma.aIInsightHistory.update({
      where: { id: insightId },
      data: {
        videoJobId: videoId,
        videoStatus: 'GENERATING',
      },
    })

    return { jobId: videoId, status: 'GENERATING' }
  } catch (error) {
    console.error('[VIDEO] [CRON] Error triggering HeyGen video generation:', error)
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

        const response = await fetch(
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

## Ringkasan Riset & Pembanding Standar (Kemenkes/WHO/UNICEF)
*(Mode Fallback Offline/Rate Limit)*
Berdasarkan tinjauan pedoman **Kementerian Kesehatan RI (Kemenkes)** terkait Integrasi Pelayanan Kesehatan Primer (ILP), target keaktifan Posyandu nasional ditetapkan minimal **80%** secara konsisten setiap bulan. Organisasi Kesehatan Dunia (**WHO**) dan **UNICEF** menegaskan pentingnya pemantauan tumbuh kembang di tingkat komunitas untuk mencegah stunting secara dini, di mana kunjungan rumah oleh kader harus mencakup seluruh keluarga sasaran.
- Standar Keaktifan Nasional: **80%** (Wilayah Anda saat ini: **${pctAktif}%**).
- Standar Layanan Siklus Hidup Terintegrasi: **75%** (Wilayah Anda saat ini: **${pctSiklusHidup}%**).
- Penyelarasan Temuan: Cakupan kunjungan rumah saat ini menunjukkan perlunya optimalisasi kompetensi kader agar sejalan dengan standar kunjungan rumah berkualitas dari UNICEF.

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
