import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MOCK_MARKERS = [
  // JAWA BARAT
  {
    kode_trans: 'B-001',
    tgl_kejadian: '2026-01-10',
    jenis_bencana: 'Banjir Bandang',
    kategori_bencana: '1',
    lat: -6.9147,
    lng: 107.6098,
    provinsi: 'JAWA BARAT',
    kabupaten: 'KOTA BANDUNG',
    kecamatan: 'Coblong',
    nama_desa: 'Dago',
    is_krisis: 1,
    total_korban: 15,
    icon_file: 'banjir.png',
  },
  {
    kode_trans: 'B-002',
    tgl_kejadian: '2026-02-14',
    jenis_bencana: 'Tanah Longsor',
    kategori_bencana: '1',
    lat: -6.6012,
    lng: 106.8060,
    provinsi: 'JAWA BARAT',
    kabupaten: 'KABUPATEN BOGOR',
    kecamatan: 'Cisarua',
    nama_desa: 'Tugu Selatan',
    is_krisis: 1,
    total_korban: 8,
    icon_file: 'longsor.png',
  },
  {
    kode_trans: 'B-003',
    tgl_kejadian: '2026-03-05',
    jenis_bencana: 'Gempa Bumi',
    kategori_bencana: '1',
    lat: -6.8222,
    lng: 107.1421,
    provinsi: 'JAWA BARAT',
    kabupaten: 'KABUPATEN CIANJUR',
    kecamatan: 'Cugenang',
    nama_desa: 'Cibulakan',
    is_krisis: 1,
    total_korban: 45,
    icon_file: 'gempa.png',
  },
  {
    kode_trans: 'B-017',
    tgl_kejadian: '2026-05-22',
    jenis_bencana: 'Banjir Luapan',
    kategori_bencana: '1',
    lat: -6.2383,
    lng: 106.9756,
    provinsi: 'JAWA BARAT',
    kabupaten: 'KOTA BEKASI',
    kecamatan: 'Bekasi Barat',
    nama_desa: 'Bintara',
    is_krisis: 0,
    total_korban: 3,
    icon_file: 'banjir.png',
  },
  // DKI JAKARTA
  {
    kode_trans: 'B-004',
    tgl_kejadian: '2026-01-20',
    jenis_bencana: 'Banjir Luapan Sungai',
    kategori_bencana: '1',
    lat: -6.2146,
    lng: 106.8451,
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA ADM. JAKARTA SELATAN',
    kecamatan: 'Tebet',
    nama_desa: 'Bukit Duri',
    is_krisis: 0,
    total_korban: 4,
    icon_file: 'banjir.png',
  },
  {
    kode_trans: 'B-005',
    tgl_kejadian: '2026-04-12',
    jenis_bencana: 'Kebakaran Pemukiman',
    kategori_bencana: '2',
    lat: -6.1805,
    lng: 106.8284,
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA ADM. JAKARTA PUSAT',
    kecamatan: 'Gambir',
    nama_desa: 'Petojo Selatan',
    is_krisis: 1,
    total_korban: 12,
    icon_file: 'kebakaran.png',
  },
  {
    kode_trans: 'B-018',
    tgl_kejadian: '2026-06-01',
    jenis_bencana: 'Banjir Genangan',
    kategori_bencana: '1',
    lat: -6.1384,
    lng: 106.8621,
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA ADM. JAKARTA UTARA',
    kecamatan: 'Penjaringan',
    nama_desa: 'Pluit',
    is_krisis: 0,
    total_korban: 2,
    icon_file: 'banjir.png',
  },
  // JAWA TENGAH
  {
    kode_trans: 'B-006',
    tgl_kejadian: '2026-02-28',
    jenis_bencana: 'Banjir Rob',
    kategori_bencana: '1',
    lat: -6.9667,
    lng: 110.4167,
    provinsi: 'JAWA TENGAH',
    kabupaten: 'KOTA SEMARANG',
    kecamatan: 'Semarang Utara',
    nama_desa: 'Bandarharjo',
    is_krisis: 0,
    total_korban: 2,
    icon_file: 'banjir.png',
  },
  {
    kode_trans: 'B-007',
    tgl_kejadian: '2026-05-18',
    jenis_bencana: 'Kecelakaan Industri',
    kategori_bencana: '2',
    lat: -6.9006,
    lng: 109.1258,
    provinsi: 'JAWA TENGAH',
    kabupaten: 'KABUPATEN TEGAL',
    kecamatan: 'Adiwerna',
    nama_desa: 'Ujungrusi',
    is_krisis: 1,
    total_korban: 10,
    icon_file: 'kecelakaan.png',
  },
  // JAWA TIMUR
  {
    kode_trans: 'B-008',
    tgl_kejadian: '2026-03-25',
    jenis_bencana: 'Erupsi Gunung Api',
    kategori_bencana: '1',
    lat: -8.1077,
    lng: 112.9224,
    provinsi: 'JAWA TIMUR',
    kabupaten: 'KABUPATEN LUMAJANG',
    kecamatan: 'Pronojiwo',
    nama_desa: 'Supiturang',
    is_krisis: 1,
    total_korban: 30,
    icon_file: 'erupsi.png',
  },
  {
    kode_trans: 'B-009',
    tgl_kejadian: '2026-06-02',
    jenis_bencana: 'Puting Beliung',
    kategori_bencana: '1',
    lat: -7.2575,
    lng: 112.7521,
    provinsi: 'JAWA TIMUR',
    kabupaten: 'KOTA SURABAYA',
    kecamatan: 'Rungkut',
    nama_desa: 'Kalirungkut',
    is_krisis: 0,
    total_korban: 3,
    icon_file: 'angin.png',
  },
  // BALI
  {
    kode_trans: 'B-010',
    tgl_kejadian: '2026-04-05',
    jenis_bencana: 'Gempa Bumi Tektonik',
    kategori_bencana: '1',
    lat: -8.4095,
    lng: 115.1889,
    provinsi: 'BALI',
    kabupaten: 'KABUPATEN TABANAN',
    kecamatan: 'Baturiti',
    nama_desa: 'Candikuning',
    is_krisis: 1,
    total_korban: 20,
    icon_file: 'gempa.png',
  },
  {
    kode_trans: 'B-019',
    tgl_kejadian: '2026-06-12',
    jenis_bencana: 'Tanah Longsor',
    kategori_bencana: '1',
    lat: -8.3614,
    lng: 115.2429,
    provinsi: 'BALI',
    kabupaten: 'KABUPATEN TABANAN',
    kecamatan: 'Baturiti',
    nama_desa: 'Batunya',
    is_krisis: 0,
    total_korban: 4,
    icon_file: 'longsor.png',
  },
  // BANTEN
  {
    kode_trans: 'B-011',
    tgl_kejadian: '2026-01-15',
    jenis_bencana: 'Kebakaran Pabrik Kimia',
    kategori_bencana: '2',
    lat: -6.0120,
    lng: 106.0143,
    provinsi: 'BANTEN',
    kabupaten: 'KOTA CILEGON',
    kecamatan: 'Ciwandan',
    nama_desa: 'Kepuh',
    is_krisis: 1,
    total_korban: 25,
    icon_file: 'kebakaran.png',
  },
  {
    kode_trans: 'B-012',
    tgl_kejadian: '2026-05-10',
    jenis_bencana: 'Banjir Luapan',
    kategori_bencana: '1',
    lat: -6.1200,
    lng: 106.1502,
    provinsi: 'BANTEN',
    kabupaten: 'KOTA SERANG',
    kecamatan: 'Kasemen',
    nama_desa: 'Banten',
    is_krisis: 0,
    total_korban: 5,
    icon_file: 'banjir.png',
  },
  // DI YOGYAKARTA
  {
    kode_trans: 'B-013',
    tgl_kejadian: '2026-06-15',
    jenis_bencana: 'Erupsi Gunung Merapi',
    kategori_bencana: '1',
    lat: -7.5407,
    lng: 110.4457,
    provinsi: 'DI YOGYAKARTA',
    kabupaten: 'KABUPATEN SLEMAN',
    kecamatan: 'Cangkringan',
    nama_desa: 'Kepuharjo',
    is_krisis: 1,
    total_korban: 35,
    icon_file: 'erupsi.png',
  },
  // SUMATERA UTARA
  {
    kode_trans: 'B-014',
    tgl_kejadian: '2026-03-18',
    jenis_bencana: 'Banjir Bandang',
    kategori_bencana: '1',
    lat: 3.5952,
    lng: 98.6722,
    provinsi: 'SUMATERA UTARA',
    kabupaten: 'KOTA MEDAN',
    kecamatan: 'Medan Baru',
    nama_desa: 'Babura',
    is_krisis: 1,
    total_korban: 14,
    icon_file: 'banjir.png',
  },
  // SULAWESI SELATAN
  {
    kode_trans: 'B-015',
    tgl_kejadian: '2026-04-20',
    jenis_bencana: 'Tanah Longsor',
    kategori_bencana: '1',
    lat: -5.1477,
    lng: 119.4327,
    provinsi: 'SULAWESI SELATAN',
    kabupaten: 'KOTA MAKASSAR',
    kecamatan: 'Manggala',
    nama_desa: 'Antang',
    is_krisis: 0,
    total_korban: 6,
    icon_file: 'longsor.png',
  },
  // KALIMANTAN TIMUR
  {
    kode_trans: 'B-016',
    tgl_kejadian: '2026-02-10',
    jenis_bencana: 'Kebakaran Hutan',
    kategori_bencana: '1',
    lat: -0.5021,
    lng: 117.1536,
    provinsi: 'KALIMANTAN TIMUR',
    kabupaten: 'KOTA SAMARINDA',
    kecamatan: 'Samarinda Utara',
    nama_desa: 'Lempake',
    is_krisis: 0,
    total_korban: 0,
    icon_file: 'kebakaran.png',
  }
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const provinceFilter = searchParams.get('province') || ''
  const kabupatenFilter = searchParams.get('kabupaten') || ''

  // 1. Filter markers list
  let filtered = MOCK_MARKERS
  if (provinceFilter) {
    filtered = filtered.filter(
      (m) => m.provinsi.toLowerCase() === provinceFilter.toLowerCase()
    )
  }
  if (kabupatenFilter) {
    filtered = filtered.filter(
      (m) => m.kabupaten.toLowerCase() === kabupatenFilter.toLowerCase()
    )
  }

  // 2. Compute summaries
  const total_bencana = filtered.length
  const total_krisis = filtered.filter((m) => m.is_krisis === 1).length

  let total_meninggal = 0
  let total_luka = 0
  let total_hilang = 0
  let total_pengungsi = 0
  let total_terdampak = 0

  filtered.forEach((m) => {
    const k = m.total_korban || 0
    total_meninggal += Math.round(k * 0.15)
    total_luka += Math.round(k * 0.6)
    total_hilang += Math.round(k * 0.05)
    total_pengungsi += k * 45
    total_terdampak += k * 120
  })

  // 3. Aggregate jenis_bencana
  const jenisMap = new Map<string, number>()
  filtered.forEach((m) => {
    jenisMap.set(m.jenis_bencana, (jenisMap.get(m.jenis_bencana) || 0) + 1)
  })
  const jenis_bencana = Array.from(jenisMap.entries()).map(([nama, jumlah]) => ({
    nama,
    jumlah,
  }))

  // 4. Aggregate wilayah (grouping dynamically based on zoom depth)
  const wilayahMap = new Map<string, number>()
  filtered.forEach((m) => {
    let groupKey = m.provinsi
    if (kabupatenFilter) {
      groupKey = m.kecamatan
    } else if (provinceFilter) {
      groupKey = m.kabupaten
    }
    wilayahMap.set(groupKey, (wilayahMap.get(groupKey) || 0) + 1)
  })
  const wilayah = Array.from(wilayahMap.entries()).map(([nama, jumlah]) => ({
    nama,
    jumlah,
  }))

  return NextResponse.json({
    success: true,
    summary: {
      total_bencana,
      total_krisis,
      total_meninggal,
      total_luka,
      total_hilang,
      total_pengungsi,
      total_terdampak,
    },
    jenis_bencana,
    wilayah,
    markers: filtered,
  }, { status: 200 })
}
