import { getPosyanduStats } from './posyanduData'

export type KompetensiItem = {
  name: string
  pct: number
}

export type KaderTrendItem = {
  bulan: string
  kunjungan: number
}

export type SubgroupItem = {
  label: string
  value: number
}

export type KaderWilayahItem = {
  nama: string
  jumlahPosyandu: number
  totalKader: number
  kaderTerlatih: number
  pctKaderTerlatih: number
  kunjunganRumah: number
  
  // Columns for the updated Matrix table
  kaderPosyandu: {
    total: number
    purwa: number
    purwaPct: number
    madya: number
    madyaPct: number
    utama: number
    utamaPct: number
    belum: number
    belumPct: number
  }
  kaderPustu: {
    total: number
    purwa: number
    purwaPct: number
    madya: number
    madyaPct: number
    utama: number
    utamaPct: number
    belum: number
    belumPct: number
  }
}

export type KaderDashboardData = {
  totalKader: number
  kaderTerlatih: number
  pctKaderTerlatih: number
  avgKompetensiPct: number
  totalKunjunganRumah: number
  kompetensiBreakdown: KompetensiItem[]
  kunjunganTrend: KaderTrendItem[]
  wilayahBreakdown: KaderWilayahItem[]
  markers: any[]

  // New progression metadata matching the first screenshot
  pelatihan: {
    dilatih: number
    belumDilatih: number
    subgroups: SubgroupItem[]
  }
  assessment: {
    dinilai: number
    belumDinilai: number
    subgroups: SubgroupItem[]
  }
  kelulusan: {
    utama: number
    utamaPct: number
    madya: number
    madyaPct: number
    purwa: number
    purwaPct: number
    belum: number
    belumPct: number
  }
  masaBakti: {
    kurangDari5: number
    kurangDari5Pct: number
    antara5Dan10: number
    antara5Dan10Pct: number
    antara10Dan15: number
    antara10Dan15Pct: number
    antara15Dan20: number
    antara15Dan20Pct: number
    lebihDari20: number
    lebihDari20Pct: number
  }
}

export function getKaderStats(
  provinceName = '',
  kabupatenName = '',
  selectedYear = '2026',
  timeFrame = 'Tahunan',
  selectedPeriod = ''
): KaderDashboardData {
  // Leverage base posyandu stats to align figures
  const posyanduStats = getPosyanduStats(provinceName, kabupatenName, timeFrame, selectedYear, selectedPeriod)

  // Each Posyandu is staffed by an average of 5 active cadres
  const totalKader = posyanduStats.totalValid * 5
  
  // Trained rate changes by year (improving over time)
  let baseTrainedRate = 0.74 // 2026
  if (selectedYear === '2025') baseTrainedRate = 0.65
  if (selectedYear === '2024') baseTrainedRate = 0.52

  // Gorontalo or DKI can have slightly higher rates
  const cleanProv = provinceName.toUpperCase().trim()
  let provBonus = 0
  if (cleanProv.includes('DKI') || cleanProv.includes('BALI')) provBonus = 0.08
  if (cleanProv.includes('GORONTALO')) provBonus = 0.04

  const trainedRate = Math.min(0.95, baseTrainedRate + provBonus)
  const kaderTerlatih = Math.round(totalKader * trainedRate)
  const pctKaderTerlatih = totalKader > 0 ? Math.round((kaderTerlatih / totalKader) * 100) : 0
  
  // Average competency score
  const avgKompetensiPct = Math.round(pctKaderTerlatih * 0.92)

  // Use Kunjungan Rumah from posyanduStats
  const totalKunjunganRumah = posyanduStats.totalKunjunganRumah

  // 1. Competency Breakdown (25 kompetensi dasar kader grouped into 6 main headings)
  const kompetensiBreakdown: KompetensiItem[] = [
    { name: 'Kompetensi Layanan Ibu Hamil & Menyusui', pct: Math.round(avgKompetensiPct * 1.05) },
    { name: 'Kompetensi Layanan Bayi & Balita', pct: Math.round(avgKompetensiPct * 1.1) },
    { name: 'Kompetensi Layanan Anak Sekolah & Remaja', pct: Math.round(avgKompetensiPct * 0.95) },
    { name: 'Kompetensi Layanan Usia Produktif', pct: Math.round(avgKompetensiPct * 0.85) },
    { name: 'Kompetensi Layanan Lanjut Usia (Lansia)', pct: Math.round(avgKompetensiPct * 0.8) },
    { name: 'Kompetensi Komunikasi & Penyuluhan', pct: Math.round(avgKompetensiPct * 1.0) },
  ].map(item => ({
    ...item,
    pct: Math.min(100, Math.max(15, item.pct))
  }))

  // 2. Kunjungan Rumah monthly trend
  const baseKunjunganMonthly = Math.round(totalKunjunganRumah / 12)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
  const kunjunganTrend: KaderTrendItem[] = months.map((m, idx) => {
    const multiplier = 0.85 + (Math.sin(idx / 1.5) * 0.15)
    return {
      bulan: m,
      kunjungan: Math.round(baseKunjunganMonthly * multiplier)
    }
  })

  // Helper function to distribute certification levels
  const distributeLevels = (total: number, trainedPct: number) => {
    // Proportions roughly aligned with screenshot:
    // Utama: 6.2%, Madya: 9.7%, Purwa: 23.1%, Belum: 61%
    // If trained percentage is higher, Utama/Madya/Purwa increases
    const scale = trainedPct / 75 // normalize around 75%
    
    const utPct = Math.min(25, Math.max(1, Math.round(6.215 * scale)))
    const mdPct = Math.min(30, Math.max(2, Math.round(9.731 * scale)))
    const pwPct = Math.min(45, Math.max(5, Math.round(23.083 * scale)))
    const blPct = Math.max(0, 100 - utPct - mdPct - pwPct)

    const utama = Math.round((utPct / 100) * total)
    const madya = Math.round((mdPct / 100) * total)
    const purwa = Math.round((pwPct / 100) * total)
    const belum = Math.max(0, total - utama - madya - purwa)

    return {
      total,
      utama,
      utamaPct: utPct,
      madya,
      madyaPct: mdPct,
      purwa,
      purwaPct: pwPct,
      belum,
      belumPct: blPct
    }
  }

  // 3. Wilayah Breakdown
  const wilayahBreakdown: KaderWilayahItem[] = posyanduStats.wilayahBreakdown.map((wb: any) => {
    const totalK = wb.valid * 5
    const hash = wb.nama.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
    const factor = 0.68 + (hash % 15) * 0.015
    const finalTrainedRate = Math.min(0.95, baseTrainedRate + (factor - 0.75))
    const kaderT = Math.round(totalK * finalTrainedRate)
    const pctT = totalK > 0 ? Math.round((kaderT / totalK) * 100) : 0

    // Kader Pustu totals: average 1-3 per Posyandu region or smaller scale
    const pustuTotal = Math.round(totalK * 0.03) || (hash % 3) + 1
    const pustuTrainedPct = Math.min(100, Math.round(pctT * 1.1))

    return {
      nama: wb.nama,
      jumlahPosyandu: wb.valid,
      totalKader: totalK,
      kaderTerlatih: kaderT,
      pctKaderTerlatih: pctT,
      kunjunganRumah: Math.round(wb.kunjunganRumah),
      kaderPosyandu: distributeLevels(totalK, pctT),
      kaderPustu: distributeLevels(pustuTotal, pustuTrainedPct)
    }
  })

  // 4. Markers mapping
  const markers = posyanduStats.markers.map((m: any) => {
    const totalK = 5
    const trainedCount = m.nakes_pct >= 85 ? 5 : m.nakes_pct >= 60 ? 4 : 3
    
    return {
      ...m,
      totalKader: totalK,
      kaderTerlatih: trainedCount,
      pctKaderTerlatih: Math.round((trainedCount / totalK) * 100),
      kunjunganRumahCount: Math.round(15 * (m.alkes_pct / 100))
    }
  })

  // Pelatihan progression counts (using proportions from mockup screenshot)
  const dilatihCount = Math.round(totalKader * 0.5615)
  const belumDilatihCount = Math.max(0, totalKader - dilatihCount)
  const trainingSubgroups = [
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Ibu Hamil & Menyusui, Sekolah-Remaja', value: Math.round(totalKader * 0.0378) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Ibu Hamil & Menyusui, Usia Dewasa-Lansia', value: Math.round(totalKader * 0.0290) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Sekolah-Remaja, Usia Dewasa-Lansia', value: Math.round(totalKader * 0.0044) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Ibu Hamil & Menyusui', value: Math.round(totalKader * 0.1981) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Sekolah-Remaja', value: Math.round(totalKader * 0.0090) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Usia Dewasa-Lansia', value: Math.round(totalKader * 0.0142) },
  ]

  // Assessment progression counts (using proportions from mockup screenshot)
  const dinilaiCount = Math.round(totalKader * 0.4268)
  const belumDinilaiCount = Math.max(0, totalKader - dinilaiCount)
  const assessmentSubgroups = [
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Ibu Hamil & Menyusui, Sekolah-Remaja', value: Math.round(totalKader * 0.0376) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Ibu Hamil & Menyusui, Usia Dewasa-Lansia', value: Math.round(totalKader * 0.0286) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Sekolah-Remaja, Usia Dewasa-Lansia', value: Math.round(totalKader * 0.0042) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Ibu Hamil & Menyusui', value: Math.round(totalKader * 0.2081) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Sekolah-Remaja', value: Math.round(totalKader * 0.0095) },
    { label: 'Pengelolaan Posyandu, Bayi-Balita, Usia Dewasa-Lansia', value: Math.round(totalKader * 0.0150) },
  ]

  // Certification levels summary
  const kelulusan = distributeLevels(totalKader, pctKaderTerlatih)

  // Masa Bakti summary (total sum is ~93.9% from screenshot, rest is distributed to "kurangDari5")
  const kurangDari5 = Math.round(totalKader * 0.534)
  const antara5Dan10 = Math.round(totalKader * 0.213)
  const antara10Dan15 = Math.round(totalKader * 0.084)
  const antara15Dan20 = Math.round(totalKader * 0.056)
  const lebihDari20 = Math.max(0, totalKader - kurangDari5 - antara5Dan10 - antara10Dan15 - antara15Dan20)

  const getPct = (val: number) => totalKader > 0 ? Math.round((val / totalKader) * 100) : 0

  const masaBakti = {
    kurangDari5,
    kurangDari5Pct: getPct(kurangDari5),
    antara5Dan10,
    antara5Dan10Pct: getPct(antara5Dan10),
    antara10Dan15,
    antara10Dan15Pct: getPct(antara10Dan15),
    antara15Dan20,
    antara15Dan20Pct: getPct(antara15Dan20),
    lebihDari20,
    lebihDari20Pct: getPct(lebihDari20)
  }

  return {
    totalKader,
    kaderTerlatih,
    pctKaderTerlatih,
    avgKompetensiPct,
    totalKunjunganRumah,
    kompetensiBreakdown,
    kunjunganTrend,
    wilayahBreakdown,
    markers,
    pelatihan: {
      dilatih: dilatihCount,
      belumDilatih: belumDilatihCount,
      subgroups: trainingSubgroups
    },
    assessment: {
      dinilai: dinilaiCount,
      belumDinilai: belumDinilaiCount,
      subgroups: assessmentSubgroups
    },
    kelulusan,
    masaBakti
  }
}
