import { getPuskesmasStats } from './puskesmasData'

export type YearlyTrendItem = {
  tahun: string
  valid: number
  aktif: number
  siklusHidup: number
}

export type ProvinsiItem = {
  nama: string
  valid: number
  aktif: number
  siklusHidup: number
  kunjunganRumah: number
  laporPustu: number
  pctSiklusHidupAktif: number
  pctKabKotaMemenuhi: number
  status: 'MEMENUHI' | 'TIDAK MEMENUHI'
}

export type KabupatenItem = {
  nama: string
  valid: number
  aktif: number
  siklusHidup: number
  kunjunganRumah: number
  laporPustu: number
  pctSiklusHidupAktif: number
  status: 'MEMENUHI' | 'TIDAK MEMENUHI'
}

export type FunnelItem = {
  stage: string
  value: number
  percentage: number
  color: string
}

export type WilayahBreakdownItem = {
  nama: string
  valid: number
  aktif: number
  pctAktif: number
  statusAktif: 'MEMENUHI' | 'TIDAK MEMENUHI'
  siklusHidup: number
  pctSiklusHidup: number
  statusSiklusHidup: 'MEMENUHI' | 'TIDAK MEMENUHI'
  kunjunganRumah: number
  laporPustu: number
}

export type PosyanduDashboardData = {
  totalValid: number
  totalAktif: number
  totalSiklusHidupAktif: number
  totalKunjunganRumah: number
  totalLaporPustu: number
  pctKabKotaMemenuhi: number
  targetPct: number
  statusTarget: 'MEMENUHI' | 'TIDAK MEMENUHI'
  yearlyTrend: YearlyTrendItem[]
  provinsiBreakdown: ProvinsiItem[]
  kabupatenBreakdown: KabupatenItem[]
  wilayahBreakdown: WilayahBreakdownItem[]
  funnelData: FunnelItem[]
  markers: any[]
}

// 38 Provinces base values for year 2026
const PROVINCES_BASE: Array<{ name: string; valid: number; numKabKota: number; numKabKotaMemenuhi: number }> = [
  { name: 'ACEH', valid: 7850, numKabKota: 23, numKabKotaMemenuhi: 4 },
  { name: 'SUMATERA UTARA', valid: 15420, numKabKota: 33, numKabKotaMemenuhi: 6 },
  { name: 'SUMATERA BARAT', valid: 6210, numKabKota: 19, numKabKotaMemenuhi: 3 },
  { name: 'RIAU', valid: 7120, numKabKota: 12, numKabKotaMemenuhi: 2 },
  { name: 'KEPULAUAN RIAU', valid: 1980, numKabKota: 7, numKabKotaMemenuhi: 2 },
  { name: 'JAMBI', valid: 3820, numKabKota: 11, numKabKotaMemenuhi: 2 },
  { name: 'SUMATERA SELATAN', valid: 9430, numKabKota: 17, numKabKotaMemenuhi: 3 },
  { name: 'BENGKULU', valid: 2450, numKabKota: 10, numKabKotaMemenuhi: 1 },
  { name: 'KEP. BANGKA BELITUNG', valid: 1540, numKabKota: 7, numKabKotaMemenuhi: 2 },
  { name: 'LAMPUNG', valid: 9860, numKabKota: 15, numKabKotaMemenuhi: 3 },
  { name: 'BANTEN', valid: 11240, numKabKota: 8, numKabKotaMemenuhi: 2 },
  { name: 'DKI JAKARTA', valid: 5413, numKabKota: 6, numKabKotaMemenuhi: 3 }, // DKI is highly active
  { name: 'JAWA BARAT', valid: 52400, numKabKota: 27, numKabKotaMemenuhi: 7 },
  { name: 'JAWA TENGAH', valid: 44250, numKabKota: 35, numKabKotaMemenuhi: 9 },
  { name: 'DI YOGYAKARTA', valid: 5120, numKabKota: 5, numKabKotaMemenuhi: 3 }, // DIY is highly active
  { name: 'JAWA TIMUR', valid: 48950, numKabKota: 38, numKabKotaMemenuhi: 10 },
  { name: 'BALI', valid: 4210, numKabKota: 9, numKabKotaMemenuhi: 4 }, // Bali is highly active
  { name: 'NUSA TENGGARA BARAT', valid: 7820, numKabKota: 10, numKabKotaMemenuhi: 3 },
  { name: 'NUSA TENGGARA TIMUR', valid: 9870, numKabKota: 22, numKabKotaMemenuhi: 2 },
  { name: 'KALIMANTAN BARAT', valid: 6540, numKabKota: 14, numKabKotaMemenuhi: 2 },
  { name: 'KALIMANTAN TENGAH', valid: 4120, numKabKota: 14, numKabKotaMemenuhi: 1 },
  { name: 'KALIMANTAN SELATAN', valid: 5180, numKabKota: 13, numKabKotaMemenuhi: 2 },
  { name: 'KALIMANTAN TIMUR', valid: 4820, numKabKota: 10, numKabKotaMemenuhi: 2 },
  { name: 'KALIMANTAN UTARA', valid: 1120, numKabKota: 5, numKabKotaMemenuhi: 1 },
  { name: 'SULAWESI UTARA', valid: 3820, numKabKota: 15, numKabKotaMemenuhi: 2 },
  { name: 'GORONTALO', valid: 1210, numKabKota: 6, numKabKotaMemenuhi: 2 }, // Target Gorontalo
  { name: 'SULAWESI TENGAH', valid: 4250, numKabKota: 13, numKabKotaMemenuhi: 1 },
  { name: 'SULAWESI BARAT', valid: 1850, numKabKota: 6, numKabKotaMemenuhi: 0 },
  { name: 'SULAWESI SELATAN', valid: 11840, numKabKota: 24, numKabKotaMemenuhi: 5 },
  { name: 'SULAWESI TENGGARA', valid: 3950, numKabKota: 17, numKabKotaMemenuhi: 1 },
  { name: 'MALUKU', valid: 2540, numKabKota: 11, numKabKotaMemenuhi: 1 },
  { name: 'MALUKU UTARA', valid: 1820, numKabKota: 10, numKabKotaMemenuhi: 1 },
  { name: 'PAPUA BARAT', valid: 950, numKabKota: 7, numKabKotaMemenuhi: 0 },
  { name: 'PAPUA', valid: 1840, numKabKota: 9, numKabKotaMemenuhi: 1 },
  { name: 'PAPUA SELATAN', valid: 840, numKabKota: 4, numKabKotaMemenuhi: 0 },
  { name: 'PAPUA TENGAH', valid: 980, numKabKota: 8, numKabKotaMemenuhi: 0 },
  { name: 'PAPUA PEGUNUNGAN', valid: 1150, numKabKota: 8, numKabKotaMemenuhi: 0 },
  { name: 'PAPUA BARAT DAYA', valid: 850, numKabKota: 6, numKabKotaMemenuhi: 0 },
]

// Base target percentages for indicators Ke-6 by year
const TARGET_BY_YEAR: Record<string, number> = {
  '2024': 15,
  '2025': 20,
  '2026': 25,
}

// Factors to scale metrics by TimeFrame period
function getPeriodScalingFactor(timeFrame: string, period: string): number {
  if (timeFrame === 'Tahunan' || !period) return 1.0

  const hash = period.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  // return a value between 0.94 and 1.02 depending on the period to show dynamic changes
  return 0.94 + (hash % 9) * 0.01
}

// Factor to scale metrics by year
function getYearScalingFactor(year: string): number {
  switch (year) {
    case '2024': return 0.942
    case '2025': return 0.973
    case '2026': default: return 1.0
  }
}

export function getPosyanduStats(
  provinceName = '',
  kabupatenName = '',
  timeFrame = 'Tahunan',
  selectedYear = '2026',
  selectedPeriod = ''
): PosyanduDashboardData {
  const yearFactor = getYearScalingFactor(selectedYear)
  const periodFactor = getPeriodScalingFactor(timeFrame, selectedPeriod)

  const targetPct = TARGET_BY_YEAR[selectedYear] || 25

  const isNational = !provinceName || provinceName.toUpperCase() === 'NASIONAL' || provinceName.toUpperCase() === 'SEMUA PROVINSI'
  const isProvince = !isNational && (!kabupatenName || kabupatenName.toUpperCase() === 'SEMUA KAB/KOTA')

  // 1. Compile province list with scaled values
  const provinces: ProvinsiItem[] = PROVINCES_BASE.map(p => {
    const valid = Math.round(p.valid * yearFactor)
    
    // Nalar logic: Active is a subset of Valid, Lifecycle Active is a subset of Active
    // We vary rates slightly per province to make it realistic (e.g. DKI and Bali have higher rates)
    let activeRate = 0.72 + (p.name.length % 7) * 0.015
    let lifecycleRate = 0.48 + (p.name.length % 5) * 0.02
    
    if (p.name === 'DKI JAKARTA' || p.name === 'DI YOGYAKARTA' || p.name === 'BALI') {
      activeRate += 0.08
      lifecycleRate += 0.12
    }

    const aktif = Math.round(valid * activeRate * periodFactor)
    const siklusHidup = Math.round(aktif * lifecycleRate)
    
    // Kunjungan rumah & Lapor pustu are subsets of Lifecycle Active
    const kunjunganRumah = Math.round(siklusHidup * (0.58 + (p.name.length % 4) * 0.03))
    const laporPustu = Math.round(siklusHidup * (0.68 + (p.name.length % 3) * 0.04))

    const pctSiklusHidupAktif = valid > 0 ? Math.round((siklusHidup / valid) * 100) : 0

    // Indicator 6: Percentage of Kab/Kota that have >= 75% active lifecycle posyandu
    // Scale compliance count by year (higher compliance in 2026, lower in 2024)
    let compliantKabs = p.numKabKotaMemenuhi
    if (selectedYear === '2024') compliantKabs = Math.max(0, Math.round(p.numKabKotaMemenuhi * 0.5))
    if (selectedYear === '2025') compliantKabs = Math.max(0, Math.round(p.numKabKotaMemenuhi * 0.8))

    const pctKabKotaMemenuhi = Math.round((compliantKabs / p.numKabKota) * 100)
    const status = pctKabKotaMemenuhi >= targetPct ? 'MEMENUHI' : 'TIDAK MEMENUHI'

    return {
      nama: p.name,
      valid,
      aktif,
      siklusHidup,
      kunjunganRumah,
      laporPustu,
      pctSiklusHidupAktif,
      pctKabKotaMemenuhi,
      status
    }
  })

  // 2. Aggregate counts based on selected scope
  let totalValid = 0
  let totalAktif = 0
  let totalSiklusHidupAktif = 0
  let totalKunjunganRumah = 0
  let totalLaporPustu = 0
  let pctKabKotaMemenuhi = 0

  let provinsiBreakdown: ProvinsiItem[] = []
  let kabupatenBreakdown: KabupatenItem[] = []

  if (isNational) {
    // National level aggregation
    provinces.forEach(p => {
      totalValid += p.valid
      totalAktif += p.aktif
      totalSiklusHidupAktif += p.siklusHidup
      totalKunjunganRumah += p.kunjunganRumah
      totalLaporPustu += p.laporPustu
    })

    // Sum total Kab/Kota and those compliant across the nation
    let totalKabsNation = 0
    let totalCompliantNation = 0
    PROVINCES_BASE.forEach(p => {
      totalKabsNation += p.numKabKota
      let compliant = p.numKabKotaMemenuhi
      if (selectedYear === '2024') compliant = Math.max(0, Math.round(p.numKabKotaMemenuhi * 0.5))
      if (selectedYear === '2025') compliant = Math.max(0, Math.round(p.numKabKotaMemenuhi * 0.8))
      totalCompliantNation += compliant
    })

    pctKabKotaMemenuhi = Math.round((totalCompliantNation / totalKabsNation) * 100)
    provinsiBreakdown = provinces
  } else if (isProvince) {
    // Single Province level
    const targetProv = provinces.find(p => p.nama.toUpperCase() === provinceName.toUpperCase()) || provinces[0]
    totalValid = targetProv.valid
    totalAktif = targetProv.aktif
    totalSiklusHidupAktif = targetProv.siklusHidup
    totalKunjunganRumah = targetProv.kunjunganRumah
    totalLaporPustu = targetProv.laporPustu
    pctKabKotaMemenuhi = targetProv.pctKabKotaMemenuhi

    // Generate Kabupaten list dynamically for this province
    const numKabs = PROVINCES_BASE.find(p => p.name === targetProv.nama)?.numKabKota || 10
    const compliantCount = Math.round(numKabs * (pctKabKotaMemenuhi / 100))

    kabupatenBreakdown = Array.from({ length: numKabs }).map((_, idx) => {
      const isCompliant = idx < compliantCount
      const kabName = `${idx === 0 ? 'KOTA' : 'KABUPATEN'} ${targetProv.nama} ${idx + 1}`
      const valid = Math.round((totalValid / numKabs) * (0.85 + (idx % 3) * 0.15))
      
      const activeRate = isCompliant ? 0.82 : 0.65
      const lifecycleRate = isCompliant ? 0.78 : 0.48

      const aktif = Math.round(valid * activeRate)
      const siklusHidup = Math.round(aktif * lifecycleRate)
      const kunjunganRumah = Math.round(siklusHidup * 0.65)
      const laporPustu = Math.round(siklusHidup * 0.75)

      const pctSiklusHidupAktif = valid > 0 ? Math.round((siklusHidup / valid) * 100) : 0
      // To meet target, the kabupaten itself must have >= 75% active lifecycle posyandu
      const status = pctSiklusHidupAktif >= 75 ? 'MEMENUHI' : 'TIDAK MEMENUHI'

      return {
        nama: kabName,
        valid,
        aktif,
        siklusHidup,
        kunjunganRumah,
        laporPustu,
        pctSiklusHidupAktif,
        status
      }
    })
  } else {
    // Single Kabupaten level within a province
    const targetProv = provinces.find(p => p.nama.toUpperCase() === provinceName.toUpperCase()) || provinces[0]
    
    // Simulate target kabupaten name
    totalValid = Math.round(targetProv.valid / 8)
    totalAktif = Math.round(totalValid * 0.78)
    totalSiklusHidupAktif = Math.round(totalAktif * 0.76)
    totalKunjunganRumah = Math.round(totalSiklusHidupAktif * 0.8)
    totalLaporPustu = Math.round(totalSiklusHidupAktif * 0.85)

    // For single kabupaten scope, percentage of kab/kota meeting is either 100% or 0%
    const pctSiklusHidupAktif = totalValid > 0 ? Math.round((totalSiklusHidupAktif / totalValid) * 100) : 0
    pctKabKotaMemenuhi = pctSiklusHidupAktif >= 75 ? 100 : 0

    kabupatenBreakdown = [{
      nama: kabupatenName.toUpperCase(),
      valid: totalValid,
      aktif: totalAktif,
      siklusHidup: totalSiklusHidupAktif,
      kunjunganRumah: totalKunjunganRumah,
      laporPustu: totalLaporPustu,
      pctSiklusHidupAktif,
      status: pctSiklusHidupAktif >= 75 ? 'MEMENUHI' : 'TIDAK MEMENUHI'
    }]
  }

  // Adjust national totals if needed to match the exact total of 303,713 at Tahunan 2026
  if (isNational && selectedYear === '2026' && timeFrame === 'Tahunan') {
    totalValid = 303713
    totalAktif = 225410
    totalSiklusHidupAktif = 158290
    totalKunjunganRumah = 98420
    totalLaporPustu = 112500
    pctKabKotaMemenuhi = 18 // Let's keep it close to 18% so it matches "TIDAK MEMENUHI" (Persentase: 18%)
  }

  const statusTarget = pctKabKotaMemenuhi >= targetPct ? 'MEMENUHI' : 'TIDAK MEMENUHI'

  // Compile unified breakdown
  const breakdownSource = isNational ? provinces : kabupatenBreakdown
  const wilayahBreakdown: WilayahBreakdownItem[] = breakdownSource.map(item => {
    const pctAktif = item.valid > 0 ? Math.round((item.aktif / item.valid) * 10000) / 100 : 0
    const statusAktif = pctAktif >= 80 ? 'MEMENUHI' : 'TIDAK MEMENUHI'
    
    // Check if pctSiklusHidupAktif is already computed in item
    const pctSiklusHidup = item.valid > 0 ? Math.round((item.siklusHidup / item.valid) * 10000) / 100 : 0
    const statusSiklusHidup = pctSiklusHidup >= 75 ? 'MEMENUHI' : 'TIDAK MEMENUHI'

    return {
      nama: item.nama,
      valid: item.valid,
      aktif: item.aktif,
      pctAktif,
      statusAktif,
      siklusHidup: item.siklusHidup,
      pctSiklusHidup,
      statusSiklusHidup,
      kunjunganRumah: item.kunjunganRumah,
      laporPustu: item.laporPustu
    }
  })

  // 3. Yearly growth trend data (2021 - 2026)
  const yearlyTrend: YearlyTrendItem[] = [
    { tahun: '2021', valid: Math.round(totalValid * 0.82), aktif: Math.round(totalAktif * 0.74), siklusHidup: Math.round(totalSiklusHidupAktif * 0.45) },
    { tahun: '2022', valid: Math.round(totalValid * 0.88), aktif: Math.round(totalAktif * 0.82), siklusHidup: Math.round(totalSiklusHidupAktif * 0.58) },
    { tahun: '2023', valid: Math.round(totalValid * 0.92), aktif: Math.round(totalAktif * 0.88), siklusHidup: Math.round(totalSiklusHidupAktif * 0.72) },
    { tahun: '2024', valid: Math.round(totalValid * 0.95), aktif: Math.round(totalAktif * 0.92), siklusHidup: Math.round(totalSiklusHidupAktif * 0.84) },
    { tahun: '2025', valid: Math.round(totalValid * 0.98), aktif: Math.round(totalAktif * 0.96), siklusHidup: Math.round(totalSiklusHidupAktif * 0.93) },
    { tahun: '2026', valid: totalValid, aktif: totalAktif, siklusHidup: totalSiklusHidupAktif },
  ]

  // 4. Conversion Funnel Data
  const funnelData: FunnelItem[] = [
    { stage: 'Posyandu Valid', value: totalValid, percentage: 100, color: '#0ea5e9' },
    { stage: 'Posyandu Aktif', value: totalAktif, percentage: totalValid > 0 ? Math.round((totalAktif / totalValid) * 100) : 0, color: '#0f8f96' },
    { stage: 'Siklus Hidup Aktif', value: totalSiklusHidupAktif, percentage: totalValid > 0 ? Math.round((totalSiklusHidupAktif / totalValid) * 100) : 0, color: '#10b981' },
    { stage: 'Kunjungan Rumah', value: totalKunjunganRumah, percentage: totalValid > 0 ? Math.round((totalKunjunganRumah / totalValid) * 100) : 0, color: '#6366f1' },
    { stage: 'Melapor ke Pustu', value: totalLaporPustu, percentage: totalValid > 0 ? Math.round((totalLaporPustu / totalValid) * 100) : 0, color: '#f59e0b' },
  ]

  // Get spatial markers from Puskesmas layer and convert them dynamically to Posyandu
  const pkmStats = getPuskesmasStats(provinceName, kabupatenName)
  const markers = pkmStats.markers.map(m => {
    // Determine status_evaluasi based on Posyandu metrics:
    // If it has good nakes rate, let's treat it as status_evaluasi = 'Baik'
    let status_evaluasi: 'Baik' | 'Sedang' | 'Kurang' = 'Sedang'
    if (m.nakes_pct >= 85) {
      status_evaluasi = 'Baik'
    } else if (m.nakes_pct < 60) {
      status_evaluasi = 'Kurang'
    }
    
    // Map percentages
    const valid = 1
    const aktif = m.nakes_pct >= 60 ? 1 : 0
    const siklusHidup = (aktif && m.alkes_pct >= 60) ? 1 : 0
    
    return {
      ...m,
      jenis_bencana: m.jenis_bencana.replace('Puskesmas', 'Posyandu'),
      status_evaluasi,
      is_ranap: aktif === 1, // mapping 'is_ranap' to 'aktif' for map markers compatibility
      karakteristik: m.karakteristik,
      alkes_pct: m.alkes_pct, // Kunjungan Rumah rate mapping
      obat_pct: m.obat_pct,   // Lapor Pustu rate mapping
      nakes_pct: m.nakes_pct  // Aktif rate mapping
    }
  })

  return {
    totalValid,
    totalAktif,
    totalSiklusHidupAktif,
    totalKunjunganRumah,
    totalLaporPustu,
    pctKabKotaMemenuhi,
    targetPct,
    statusTarget,
    yearlyTrend,
    provinsiBreakdown,
    kabupatenBreakdown,
    wilayahBreakdown,
    funnelData,
    markers
  }
}
