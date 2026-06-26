export type YearlyTrendItem = {
  tahun: string
  jumlah: number
}

export type NakesItem = {
  jenis: string
  pct: number
}

export type WilayahItem = {
  nama: string
  total_puskesmas: number
  ranap: number
  non_ranap: number
  alkes_pct: number
  obat_pct: number
  nakes_pct: number
  status: 'Baik' | 'Sedang' | 'Kurang'
}

export type PuskesmasMarker = {
  kode_trans: string // Align with map prop requirement
  jenis_bencana: string // Align with map prop requirement (holds name of Puskesmas)
  lat: number
  lng: number
  provinsi: string
  kabupaten: string
  kecamatan: string
  nama_desa?: string
  total_korban: number // Align with map prop requirement
  is_ranap: boolean
  karakteristik: 'Biasa' | 'Terpencil' | 'Sangat Terpencil'
  alkes_pct: number
  obat_pct: number
  nakes_pct: number
  status_evaluasi: 'Baik' | 'Sedang' | 'Kurang'
}

export type PuskesmasDashboardData = {
  total_puskesmas: number
  ranap_count: number
  non_ranap_count: number
  biasa_count: number
  terpencil_count: number
  sangat_terpencil_count: number
  beban_kerja: number // 1: X Penduduk
  nakes_lengkap_pct: number // % of Puskesmas meeting nakes standard
  alkes_60_pct: number // % of Puskesmas meeting alkes standard
  obat_40_pct: number // % of Puskesmas meeting obat standard
  kecamatan_tanpa_puskesmas: number
  yearly_trend: YearlyTrendItem[]
  nakes_breakdown: NakesItem[]
  wilayah_breakdown: WilayahItem[]
  markers: PuskesmasMarker[]
}

// Comprehensive Puskesmas dataset for Gorontalo (Provinsi ke-75)
const ALL_PUSKESMAS: PuskesmasMarker[] = [
  // KOTA GORONTALO (7505)
  {
    kode_trans: 'PKM-7505-01',
    jenis_bencana: 'Puskesmas Dungingi',
    lat: 0.5562,
    lng: 123.0375,
    provinsi: 'GORONTALO',
    kabupaten: 'KOTA GORONTALO METRO',
    kecamatan: 'Dungingi',
    nama_desa: 'Huangobotu',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 88,
    obat_pct: 95,
    nakes_pct: 100,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7505-02',
    jenis_bencana: 'Puskesmas Kota Selatan',
    lat: 0.5385,
    lng: 123.0592,
    provinsi: 'GORONTALO',
    kabupaten: 'KOTA GORONTALO METRO',
    kecamatan: 'Kota Selatan',
    nama_desa: 'Limba U Dua',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Biasa',
    alkes_pct: 92,
    obat_pct: 90,
    nakes_pct: 88,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7505-03',
    jenis_bencana: 'Puskesmas Kota Utara',
    lat: 0.5701,
    lng: 123.0689,
    provinsi: 'GORONTALO',
    kabupaten: 'KOTA GORONTALO METRO',
    kecamatan: 'Kota Utara',
    nama_desa: 'Wonoyi',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 85,
    obat_pct: 92,
    nakes_pct: 91,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7505-04',
    jenis_bencana: 'Puskesmas Hulonthalangi',
    lat: 0.5218,
    lng: 123.0482,
    provinsi: 'GORONTALO',
    kabupaten: 'KOTA GORONTALO METRO',
    kecamatan: 'Hulonthalangi',
    nama_desa: 'Tenda',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Biasa',
    alkes_pct: 78,
    obat_pct: 85,
    nakes_pct: 80,
    status_evaluasi: 'Baik',
  },

  // KAB. BONE BOLANGO (7502)
  {
    kode_trans: 'PKM-7502-01',
    jenis_bencana: 'Puskesmas Kabila',
    lat: 0.5489,
    lng: 123.1147,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO TIMUR', // Map of region API 7502 is KAB. GORONTALO TIMUR
    kecamatan: 'Kabila',
    nama_desa: 'Oluhuta',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 82,
    obat_pct: 88,
    nakes_pct: 88,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7502-02',
    jenis_bencana: 'Puskesmas Suwawa',
    lat: 0.5624,
    lng: 123.1492,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO TIMUR',
    kecamatan: 'Suwawa',
    nama_desa: 'Boludawa',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 80,
    obat_pct: 84,
    nakes_pct: 77,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7502-03',
    jenis_bencana: 'Puskesmas Tapa',
    lat: 0.6012,
    lng: 123.1118,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO TIMUR',
    kecamatan: 'Tapa',
    nama_desa: 'Talumopatu',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Biasa',
    alkes_pct: 76,
    obat_pct: 82,
    nakes_pct: 70,
    status_evaluasi: 'Sedang',
  },
  {
    kode_trans: 'PKM-7502-04',
    jenis_bencana: 'Puskesmas Bonepantai',
    lat: 0.4328,
    lng: 123.2504,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO TIMUR',
    kecamatan: 'Bonepantai',
    nama_desa: 'Bilungala',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Terpencil',
    alkes_pct: 65,
    obat_pct: 76,
    nakes_pct: 61,
    status_evaluasi: 'Sedang',
  },

  // KAB. GORONTALO (7501)
  {
    kode_trans: 'PKM-7501-01',
    jenis_bencana: 'Puskesmas Limboto',
    lat: 0.6214,
    lng: 122.9841,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO UTARA', // Map of region API 7501 is GORONTALO UTARA
    kecamatan: 'Limboto',
    nama_desa: 'Kayubulan',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 90,
    obat_pct: 92,
    nakes_pct: 95,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7501-02',
    jenis_bencana: 'Puskesmas Telaga',
    lat: 0.5985,
    lng: 123.0189,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO UTARA',
    kecamatan: 'Telaga',
    nama_desa: 'Luhu',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Biasa',
    alkes_pct: 84,
    obat_pct: 88,
    nakes_pct: 80,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7501-03',
    jenis_bencana: 'Puskesmas Boliyohuto',
    lat: 0.7712,
    lng: 122.6845,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO UTARA',
    kecamatan: 'Boliyohuto',
    nama_desa: 'Sidodadi',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 78,
    obat_pct: 82,
    nakes_pct: 75,
    status_evaluasi: 'Sedang',
  },
  {
    kode_trans: 'PKM-7501-04',
    jenis_bencana: 'Puskesmas Batudaa',
    lat: 0.5714,
    lng: 122.9218,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO UTARA',
    kecamatan: 'Batudaa',
    nama_desa: 'Payunga',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Biasa',
    alkes_pct: 81,
    obat_pct: 80,
    nakes_pct: 72,
    status_evaluasi: 'Sedang',
  },

  // KAB. BOALEMO (7503)
  {
    kode_trans: 'PKM-7503-01',
    jenis_bencana: 'Puskesmas Tilamuta',
    lat: 0.5342,
    lng: 122.4862,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO SELATAN', // Map of region API 7503 is GORONTALO SELATAN
    kecamatan: 'Tilamuta',
    nama_desa: 'Modelomo',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 74,
    obat_pct: 82,
    nakes_pct: 78,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7503-02',
    jenis_bencana: 'Puskesmas Paguyaman',
    lat: 0.6218,
    lng: 122.6148,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO SELATAN',
    kecamatan: 'Paguyaman',
    nama_desa: 'Molombulahe',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 71,
    obat_pct: 78,
    nakes_pct: 68,
    status_evaluasi: 'Sedang',
  },
  {
    kode_trans: 'PKM-7503-03',
    jenis_bencana: 'Puskesmas Dulupi',
    lat: 0.4905,
    lng: 122.3845,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO SELATAN',
    kecamatan: 'Dulupi',
    nama_desa: 'Dulupi',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Terpencil',
    alkes_pct: 62,
    obat_pct: 69,
    nakes_pct: 61,
    status_evaluasi: 'Kurang',
  },

  // KAB. POHUWATO (7504)
  {
    kode_trans: 'PKM-7504-01',
    jenis_bencana: 'Puskesmas Marisa',
    lat: 0.4682,
    lng: 121.9341,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO BARAT', // Map of region API 7504 is GORONTALO BARAT
    kecamatan: 'Marisa',
    nama_desa: 'Marisa Utara',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 79,
    obat_pct: 82,
    nakes_pct: 80,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-7504-02',
    jenis_bencana: 'Puskesmas Paguat',
    lat: 0.4812,
    lng: 122.0845,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO BARAT',
    kecamatan: 'Paguat',
    nama_desa: 'Sogitia',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Biasa',
    alkes_pct: 72,
    obat_pct: 75,
    nakes_pct: 67,
    status_evaluasi: 'Sedang',
  },
  {
    kode_trans: 'PKM-7504-03',
    jenis_bencana: 'Puskesmas Randangan',
    lat: 0.5401,
    lng: 121.8012,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO BARAT',
    kecamatan: 'Randangan',
    nama_desa: 'Motolohu',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Terpencil',
    alkes_pct: 68,
    obat_pct: 70,
    nakes_pct: 62,
    status_evaluasi: 'Sedang',
  },
  {
    kode_trans: 'PKM-7504-04',
    jenis_bencana: 'Puskesmas Popayato',
    lat: 0.4856,
    lng: 121.4501,
    provinsi: 'GORONTALO',
    kabupaten: 'KAB. GORONTALO BARAT',
    kecamatan: 'Popayato',
    nama_desa: 'Popayato',
    total_korban: 0,
    is_ranap: false,
    karakteristik: 'Sangat Terpencil',
    alkes_pct: 54,
    obat_pct: 61,
    nakes_pct: 52,
    status_evaluasi: 'Kurang',
  },

  // FALLBACK PROVINCES (DKI JAKARTA, JAWA BARAT, etc.) to support filtering other provinces
  {
    kode_trans: 'PKM-32-01',
    jenis_bencana: 'Puskesmas Dago Bandung',
    lat: -6.8904,
    lng: 107.6162,
    provinsi: 'JAWA BARAT',
    kabupaten: 'KOTA BANDUNG METRO',
    kecamatan: 'Coblong',
    nama_desa: 'Dago',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 88,
    obat_pct: 92,
    nakes_pct: 90,
    status_evaluasi: 'Baik',
  },
  {
    kode_trans: 'PKM-31-01',
    jenis_bencana: 'Puskesmas Menteng Jakarta',
    lat: -6.1952,
    lng: 106.8322,
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA DKI JAKARTA METRO',
    kecamatan: 'Menteng',
    nama_desa: 'Menteng',
    total_korban: 0,
    is_ranap: true,
    karakteristik: 'Biasa',
    alkes_pct: 95,
    obat_pct: 96,
    nakes_pct: 100,
    status_evaluasi: 'Baik',
  }
]

export function getPuskesmasStats(provinceName = '', kabupatenName = ''): PuskesmasDashboardData {
  // 1. Filter markers based on selection
  let markers = ALL_PUSKESMAS
  const provClean = provinceName.trim().toUpperCase()
  const kabClean = kabupatenName.trim().toUpperCase()

  if (provClean) {
    markers = markers.filter((m) => m.provinsi === provClean)
  }
  if (kabClean) {
    markers = markers.filter((m) => m.kabupaten === kabClean)
  }

  // Fallback: If no markers match (like filtering another province for which we don't have mock data),
  // return some aggregated data so the dashboard doesn't go blank.
  if (markers.length === 0) {
    markers = [
      {
        kode_trans: 'PKM-GEN-01',
        jenis_bencana: 'Puskesmas Wilayah ' + (kabupatenName || provinceName || 'Nasional'),
        lat: -2.5,
        lng: 118.0,
        provinsi: provClean || 'NASIONAL',
        kabupaten: kabClean || 'KABUPATEN',
        kecamatan: 'Kecamatan Utama',
        total_korban: 0,
        is_ranap: true,
        karakteristik: 'Biasa',
        alkes_pct: 75,
        obat_pct: 80,
        nakes_pct: 70,
        status_evaluasi: 'Sedang',
      }
    ]
  }

  // 2. Summary stats
  const total_puskesmas = markers.length
  const ranap_count = markers.filter((m) => m.is_ranap).length
  const non_ranap_count = total_puskesmas - ranap_count

  const biasa_count = markers.filter((m) => m.karakteristik === 'Biasa').length
  const terpencil_count = markers.filter((m) => m.karakteristik === 'Terpencil').length
  const sangat_terpencil_count = markers.filter((m) => m.karakteristik === 'Sangat Terpencil').length

  // Workload Penduduk (1 : X Penduduk)
  // Gorontalo has ~1.2M population. Rerata beban kerja:
  // Kota Gorontalo: 1 : 16.000, Kabupaten Gorontalo: 1 : 26.000, etc.
  let beban_kerja = 24300
  if (kabClean.includes('KOTA')) beban_kerja = 16200
  else if (kabClean.includes('BONE BOLANGO') || kabClean.includes('TIMUR')) beban_kerja = 21500
  else if (kabClean.includes('GORONTALO UTARA')) beban_kerja = 28600

  // Kepatuhan Alkes (≥60%), Obat (≥40%), Nakes (Lengkap 9 jenis)
  const alkes_60_pct = Math.round((markers.filter((m) => m.alkes_pct >= 60).length / total_puskesmas) * 100)
  const obat_40_pct = Math.round((markers.filter((m) => m.obat_pct >= 40).length / total_puskesmas) * 100)
  const nakes_lengkap_pct = Math.round((markers.filter((m) => m.nakes_pct >= 80).length / total_puskesmas) * 100)

  // Kecamatan tanpa Puskesmas
  let kecamatan_tanpa_puskesmas = 3
  if (kabClean.includes('KOTA')) kecamatan_tanpa_puskesmas = 0
  else if (kabClean.includes('BONE BOLANGO') || kabClean.includes('TIMUR')) kecamatan_tanpa_puskesmas = 1
  else if (kabClean.includes('GORONTALO UTARA')) kecamatan_tanpa_puskesmas = 2

  // 3. Yearly growth trend (2021 - 2026)
  // Scaling factors based on total count
  const yearly_trend = [
    { tahun: '2021', jumlah: Math.round(total_puskesmas * 0.81) },
    { tahun: '2022', jumlah: Math.round(total_puskesmas * 0.86) },
    { tahun: '2023', jumlah: Math.round(total_puskesmas * 0.90) },
    { tahun: '2024', jumlah: Math.round(total_puskesmas * 0.94) },
    { tahun: '2025', jumlah: Math.round(total_puskesmas * 0.97) },
    { tahun: '2026', jumlah: total_puskesmas },
  ]

  // 4. Breakdown of 9 Nakes types
  const nakes_breakdown = [
    { jenis: 'Dokter', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 90 ? 100 : 80), 0) / total_puskesmas) },
    { jenis: 'Dokter Gigi', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 85 ? 85 : 55), 0) / total_puskesmas) },
    { jenis: 'Perawat', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 70 ? 98 : 92), 0) / total_puskesmas) },
    { jenis: 'Bidan', pct: Math.round(markers.reduce((sum, m) => sum + 99, 0) / total_puskesmas) },
    { jenis: 'Kesmas', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 80 ? 85 : 65), 0) / total_puskesmas) },
    { jenis: 'Sanitarian', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 80 ? 80 : 60), 0) / total_puskesmas) },
    { jenis: 'Nutrisionis', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 80 ? 75 : 52), 0) / total_puskesmas) },
    { jenis: 'Apoteker', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 80 ? 88 : 70), 0) / total_puskesmas) },
    { jenis: 'ATLM/Lab', pct: Math.round(markers.reduce((sum, m) => sum + (m.nakes_pct >= 80 ? 82 : 62), 0) / total_puskesmas) },
  ].map(n => ({ ...n, pct: n.pct > 100 ? 100 : n.pct }))

  // 5. Regional breakdown
  const regionsGroup = new Map<string, { total: number, ranap: number, alkes: number, obat: number, nakes: number }>()
  markers.forEach((m) => {
    const key = m.kabupaten
    const existing = regionsGroup.get(key) || { total: 0, ranap: 0, alkes: 0, obat: 0, nakes: 0 }
    existing.total++
    if (m.is_ranap) existing.ranap++
    existing.alkes += m.alkes_pct
    existing.obat += m.obat_pct
    existing.nakes += m.nakes_pct
    regionsGroup.set(key, existing)
  })

  const wilayah_breakdown: WilayahItem[] = Array.from(regionsGroup.entries()).map(([name, stat]) => {
    const avgAlkes = Math.round(stat.alkes / stat.total)
    const avgObat = Math.round(stat.obat / stat.total)
    const avgNakes = Math.round(stat.nakes / stat.total)

    let status: 'Baik' | 'Sedang' | 'Kurang' = 'Sedang'
    if (avgAlkes >= 80 && avgObat >= 80 && avgNakes >= 80) status = 'Baik'
    else if (avgAlkes < 65 || avgObat < 70) status = 'Kurang'

    return {
      nama: name,
      total_puskesmas: stat.total,
      ranap: stat.ranap,
      non_ranap: stat.total - stat.ranap,
      alkes_pct: avgAlkes,
      obat_pct: avgObat,
      nakes_pct: avgNakes,
      status,
    }
  })

  return {
    total_puskesmas,
    ranap_count,
    non_ranap_count,
    biasa_count,
    terpencil_count,
    sangat_terpencil_count,
    beban_kerja,
    nakes_lengkap_pct,
    alkes_60_pct,
    obat_40_pct,
    kecamatan_tanpa_puskesmas,
    yearly_trend,
    nakes_breakdown,
    wilayah_breakdown,
    markers,
  }
}
