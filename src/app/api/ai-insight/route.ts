import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPosyanduStats } from '@/lib/posyanduData'

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
  return `Halo Bapak Ibu sekalian. Berikut adalah ringkasan analisis Posyandu untuk wilayah Anda. ${summary.replace(/[#*_\-`]/g, '')} Terima kasih atas perhatian Anda, mari kita tingkatkan kualitas pelayanan Posyandu bersama-sama.`
}

// Helper untuk mentrigger pembuatan video avatar menggunakan API HeyGen atau simulasi demo
async function triggerVideoGeneration(insightId: string, scriptText: string) {
  const apiKey = process.env.HEYGEN_API_KEY

  if (!apiKey || apiKey === 'MASUKKAN_API_KEY_HEYGEN_ANDA_DI_SINI' || apiKey.trim() === '') {
    console.log('[VIDEO] No HEYGEN_API_KEY found. Simulating video generation in Demo Mode.')
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
        console.log('[VIDEO] Simulated HeyGen video generation completed for:', insightId)
      } catch (err) {
        console.error('[VIDEO] Failed to update simulated video status:', err)
      }
    }, 5000)

    return { jobId: 'mock-job-' + insightId, status: 'GENERATING' }
  }

  try {
    const avatarId = process.env.HEYGEN_AVATAR_ID || 'Wayland_front_suit_20240801'
    const voiceId = process.env.HEYGEN_VOICE_ID || 'id-ID-ArdiNeural'
    const backgroundUrl = process.env.HEYGEN_BACKGROUND_URL || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920'

    console.log('[VIDEO] Triggering HeyGen video generation:', { avatarId, voiceId, backgroundUrl })

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
    console.log('[VIDEO] HeyGen video generation response:', resJson)

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
    console.error('[VIDEO] Error triggering HeyGen video generation:', error)
    await prisma.aIInsightHistory.update({
      where: { id: insightId },
      data: {
        videoStatus: 'FAILED',
      },
    })
    return { jobId: null, status: 'FAILED' }
  }
}

// Helper untuk mengecek status video langsung ke HeyGen API
async function checkAndUpdateVideoStatus(record: any) {
  if (record.videoStatus !== 'GENERATING' || !record.videoJobId) {
    return record
  }

  // Jika job simulasi / demo, biarkan berjalan normal
  if (record.videoJobId.startsWith('mock-job-')) {
    return record
  }

  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey || apiKey === 'sk_V2_hgu_kFbf6zJjaxt_3m9ksmQoc1RAgagSdxH9OVPvklieTGYO' || apiKey.trim() === '') {
    return record
  }

  try {
    console.log(`[VIDEO STATUS CHECK] Checking HeyGen status for Job ID: ${record.videoJobId}`)
    const response = await fetch(`https://api.heygen.com/v3/videos/${record.videoJobId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
      },
    })

    if (!response.ok) {
      console.error(`[VIDEO STATUS CHECK] HeyGen API status check failed: ${response.status}`)
      return record
    }

    const resJson = await response.json()
    const data = resJson.data
    console.log(`[VIDEO STATUS CHECK] HeyGen response status:`, data?.status)

    if (data?.status === 'completed' && data?.video_url) {
      const updated = await prisma.aIInsightHistory.update({
        where: { id: record.id },
        data: {
          videoStatus: 'COMPLETED',
          videoUrl: data.video_url,
        },
      })
      console.log(`[VIDEO STATUS CHECK] Job completed! Database updated for record: ${record.id}`)
      return updated
    } else if (data?.status === 'failed' || data?.status === 'error') {
      console.error(`[VIDEO STATUS CHECK] HeyGen Job failed details:`, data?.error || data)
      const updated = await prisma.aIInsightHistory.update({
        where: { id: record.id },
        data: {
          videoStatus: 'FAILED',
        },
      })
      console.log(`[VIDEO STATUS CHECK] Job failed! Database updated for record: ${record.id}`)
      return updated
    }
  } catch (err) {
    console.error(`[VIDEO STATUS CHECK] Error checking HeyGen status:`, err)
  }

  return record
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      province = '',
      kabupaten = '',
      year = '2026',
      timeFrame = 'Tahunan',
      period = '',
      historyId = '', // Memuat riwayat tertentu jika dikirimkan oleh UI
      force = false,
    } = body

    const provName = province || 'NASIONAL'
    const kabName = kabupaten || 'SEMUA KAB/KOTA'

    // Ambil daftar riwayat analisis untuk dropdown UI
    const historyList = await prisma.aIInsightHistory.findMany({
      where: {
        province: provName,
        kabupaten: kabName,
        year,
        timeFrame,
        period,
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 1. Jika memuat riwayat spesifik dari dropdown
    if (historyId) {
      const record = await prisma.aIInsightHistory.findUnique({
        where: { id: historyId },
      })
      if (record) {
        // Cek status terbaru ke API HeyGen jika status di DB masih GENERATING
        const updatedRecord = await checkAndUpdateVideoStatus(record)

        return NextResponse.json({
          id: updatedRecord.id,
          summary: updatedRecord.summary,
          recommendations: JSON.parse(updatedRecord.recommendations),
          detailedAnalysis: updatedRecord.detailedAnalysis,
          videoScript: updatedRecord.videoScript,
          videoUrl: updatedRecord.videoUrl,
          videoStatus: updatedRecord.videoStatus,
          createdAt: updatedRecord.createdAt,
          historyList,
          cached: true,
        }, { status: 200 })
      }
    }

    // 2. Cek apakah hari ini sudah pernah membuat analisis untuk filter ini (jika tidak dipaksa re-generate)
    if (!force) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const todayRecord = await prisma.aIInsightHistory.findFirst({
        where: {
          province: provName,
          kabupaten: kabName,
          year,
          timeFrame,
          period,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (todayRecord) {
        console.log('AI Insight returned from today database record:', { provName, kabName, timeFrame })
        // Cek status terbaru ke API HeyGen jika status di DB masih GENERATING
        const updatedRecord = await checkAndUpdateVideoStatus(todayRecord)

        return NextResponse.json({
          id: updatedRecord.id,
          summary: updatedRecord.summary,
          recommendations: JSON.parse(updatedRecord.recommendations),
          detailedAnalysis: updatedRecord.detailedAnalysis,
          videoScript: updatedRecord.videoScript,
          videoUrl: updatedRecord.videoUrl,
          videoStatus: updatedRecord.videoStatus,
          createdAt: updatedRecord.createdAt,
          historyList,
          cached: true,
        }, { status: 200 })
      }
    }

    // 3. Tarik data statistik untuk filter yang dipilih
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
          historyList,
          cached: false,
        },
        { status: 200 }
      )
    }

    const totalAktif = stats.totalAktif
    const totalSiklusHidup = stats.totalSiklusHidupAktif
    const pctAktif = Math.round((totalAktif / totalValid) * 100)
    const pctSiklusHidup = Math.round((totalSiklusHidup / totalValid) * 100)

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

    // 4. Panggil Gemini API jika API Key tersedia
    const apiKey = process.env.GEMINI_API_KEY
    let generatedSuccessfully = false

    if (apiKey && apiKey !== 'AIzaSyYourActualKeyHereIfProvided' && apiKey.trim() !== '') {
      try {
        const regionLabel = `${provName === 'NASIONAL' ? 'Nasional' : provName}${kabName !== 'SEMUA KAB/KOTA' ? ` - ${kabName}` : ''
          }`

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

        console.log(`Calling Gemini API for new analysis on ${regionLabel}...`)
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
      } catch (geminiError) {
        console.error('Failed to generate insight using Gemini API. Falling back to local heuristics.', geminiError)
      }
    }

    // 5. Fallback Heuristic Generator jika API Key tidak ada atau gagal
    if (!generatedSuccessfully) {
      console.warn('Using local fallback heuristics for analysis generation.')
      summaryText = `Analisis tata kelola Posyandu di wilayah ${provName} (${year}) menunjukkan kondisi keaktifan pelayanan sebesar ${pctAktif}%.`
      if (pctAktif < 80) {
        summaryText = `Analisis Posyandu ${provName} mengindikasikan tingkat keaktifan (${pctAktif}%) masih berada di bawah target standar nasional 80%. Diperlukan langkah percepatan pembinaan kader.`
      } else if (pctSiklusHidup < 75) {
        summaryText = `Analisis Posyandu ${provName} menunjukkan keaktifan baik, namun persentase Siklus Hidup Aktif (${pctSiklusHidup}%) di bawah target 75%. Prioritaskan pengembangan ragam pelayanan terintegrasi.`
      }

      recommendationsArr = [
        `<strong>Optimalisasi Keaktifan Operasional</strong> - Koordinasikan dengan Puskesmas pembina untuk menaikkan persentase keaktifan bulanan wilayah yang masih di bawah 80%.`,
        `<strong>Pelatihan Layanan Siklus Hidup</strong> - Selenggarakan bimtek kader terpadu agar Posyandu mampu melayani seluruh sasaran usia (balita s.d. lansia).`,
        `<strong>Peningkatan Kepatuhan Target</strong> - Lakukan monitoring bulanan berjenjang di tingkat kecamatan dan kelurahan untuk memantau target nasional (${stats.targetPct}%).`,
        `<strong>Integrasi Pelaporan Pustu</strong> - Sempurnakan sistem pencatatan kunjungan rumah agar pelaporan ke Pustu terkirim secara tepat waktu.`
      ]

      detailedAnalysisText = `# Analisis Penilaian Kepatuhan & Keaktifan Layanan Posyandu - ${provName}

## Ringkasan Riset & Pembanding Standar (Kemenkes/WHO/UNICEF)
Berdasarkan tinjauan pedoman **Kementerian Kesehatan RI (Kemenkes)** terkait Integrasi Pelayanan Kesehatan Primer (ILP), target keaktifan Posyandu nasional ditetapkan minimal **80%** secara konsisten setiap bulan. Organisasi Kesehatan Dunia (**WHO**) dan **UNICEF** menegaskan pentingnya pemantauan tumbuh kembang di tingkat komunitas untuk mencegah stunting secara dini, di mana kunjungan rumah oleh kader harus mencakup seluruh keluarga sasaran.
- Standar Keaktifan Nasional: **80%** (Wilayah Anda saat ini: **${pctAktif}%**).
- Standar Layanan Siklus Hidup Terintegrasi: **75%** (Wilayah Anda saat ini: **${pctSiklusHidup}%**).
- Penyelarasan Temuan: Cakupan kunjungan rumah saat ini menunjukkan perlunya optimalisasi kompetensi kader agar sejalan dengan standar kunjungan rumah berkualitas dari UNICEF.

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
    }

    // 6. Generate Video Script (Naskah Video Pendek)
    const videoScript = await generateVideoScript(summaryText, apiKey)

    // 7. Simpan analisis teks baru ke database (model AIInsightHistory)
    const newRecord = await prisma.aIInsightHistory.create({
      data: {
        province: provName,
        kabupaten: kabName,
        year,
        timeFrame,
        period,
        summary: summaryText,
        recommendations: JSON.stringify(recommendationsArr),
        detailedAnalysis: detailedAnalysisText,
        videoScript,
        videoStatus: 'PENDING',
      },
    })

    // 8. Trigger D-ID Video Generation secara asinkron (tidak memblokir respon HTTP client)
    triggerVideoGeneration(newRecord.id, videoScript)

    // Ambil daftar riwayat terbaru termasuk yang baru dibuat
    const updatedHistoryList = [
      { id: newRecord.id, createdAt: newRecord.createdAt },
      ...historyList
    ]

    return NextResponse.json({
      id: newRecord.id,
      summary: newRecord.summary,
      recommendations: recommendationsArr,
      detailedAnalysis: newRecord.detailedAnalysis,
      videoScript: newRecord.videoScript,
      videoUrl: newRecord.videoUrl,
      videoStatus: 'GENERATING', // Kembalikan status sedang digenerate untuk UI
      createdAt: newRecord.createdAt,
      historyList: updatedHistoryList,
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
