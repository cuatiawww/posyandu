import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SUGGESTIONS_DATABASE = [
  { label: 'DKI JAKARTA', type: 'provinsi', province_name: 'DKI JAKARTA' },
  { label: 'JAWA BARAT', type: 'provinsi', province_name: 'JAWA BARAT' },
  { label: 'JAWA TENGAH', type: 'provinsi', province_name: 'JAWA TENGAH' },
  { label: 'JAWA TIMUR', type: 'provinsi', province_name: 'JAWA TIMUR' },
  { label: 'BALI', type: 'provinsi', province_name: 'BALI' },
  { label: 'BANTEN', type: 'provinsi', province_name: 'BANTEN' },
  { label: 'DI YOGYAKARTA', type: 'provinsi', province_name: 'DI YOGYAKARTA' },
  { label: 'SUMATERA UTARA', type: 'provinsi', province_name: 'SUMATERA UTARA' },
  { label: 'SULAWESI SELATAN', type: 'provinsi', province_name: 'SULAWESI SELATAN' },
  { label: 'KALIMANTAN TIMUR', type: 'provinsi', province_name: 'KALIMANTAN TIMUR' },
  { label: 'KOTA ADM. JAKARTA SELATAN, DKI JAKARTA', type: 'kabupaten', province_name: 'DKI JAKARTA', kabupaten_name: 'KOTA ADM. JAKARTA SELATAN' },
  { label: 'KOTA ADM. JAKARTA TIMUR, DKI JAKARTA', type: 'kabupaten', province_name: 'DKI JAKARTA', kabupaten_name: 'KOTA ADM. JAKARTA TIMUR' },
  { label: 'KOTA ADM. JAKARTA PUSAT, DKI JAKARTA', type: 'kabupaten', province_name: 'DKI JAKARTA', kabupaten_name: 'KOTA ADM. JAKARTA PUSAT' },
  { label: 'KOTA ADM. JAKARTA BARAT, DKI JAKARTA', type: 'kabupaten', province_name: 'DKI JAKARTA', kabupaten_name: 'KOTA ADM. JAKARTA BARAT' },
  { label: 'KOTA ADM. JAKARTA UTARA, DKI JAKARTA', type: 'kabupaten', province_name: 'DKI JAKARTA', kabupaten_name: 'KOTA ADM. JAKARTA UTARA' },
  { label: 'KOTA BANDUNG, JAWA BARAT', type: 'kabupaten', province_name: 'JAWA BARAT', kabupaten_name: 'KOTA BANDUNG' },
  { label: 'KOTA BOGOR, JAWA BARAT', type: 'kabupaten', province_name: 'JAWA BARAT', kabupaten_name: 'KOTA BOGOR' },
  { label: 'KOTA DEPOK, JAWA BARAT', type: 'kabupaten', province_name: 'JAWA BARAT', kabupaten_name: 'KOTA DEPOK' },
  { label: 'KOTA BEKASI, JAWA BARAT', type: 'kabupaten', province_name: 'JAWA BARAT', kabupaten_name: 'KOTA BEKASI' },
  { label: 'KABUPATEN BOGOR, JAWA BARAT', type: 'kabupaten', province_name: 'JAWA BARAT', kabupaten_name: 'KABUPATEN BOGOR' },
  { label: 'KOTA SEMARANG, JAWA TENGAH', type: 'kabupaten', province_name: 'JAWA TENGAH', kabupaten_name: 'KOTA SEMARANG' },
  { label: 'KOTA SURAKARTA, JAWA TENGAH', type: 'kabupaten', province_name: 'JAWA TENGAH', kabupaten_name: 'KOTA SURAKARTA' },
  { label: 'KOTA SURABAYA, JAWA TIMUR', type: 'kabupaten', province_name: 'JAWA TIMUR', kabupaten_name: 'KOTA SURABAYA' },
  { label: 'KOTA MALANG, JAWA TIMUR', type: 'kabupaten', province_name: 'JAWA TIMUR', kabupaten_name: 'KOTA MALANG' },
  { label: 'KOTA DENPASAR, BALI', type: 'kabupaten', province_name: 'BALI', kabupaten_name: 'KOTA DENPASAR' },
  { label: 'KOTA SERANG, BANTEN', type: 'kabupaten', province_name: 'BANTEN', kabupaten_name: 'KOTA SERANG' },
  { label: 'KOTA TANGERANG, BANTEN', type: 'kabupaten', province_name: 'BANTEN', kabupaten_name: 'KOTA TANGERANG' },
  { label: 'KOTA YOGYAKARTA, DI YOGYAKARTA', type: 'kabupaten', province_name: 'DI YOGYAKARTA', kabupaten_name: 'KOTA YOGYAKARTA' },
]

export async function GET(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
  }

  const searchParams = req.nextUrl.searchParams
  const q = searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] }, { headers: CORS_HEADERS })
  }

  const matches = SUGGESTIONS_DATABASE.filter((item) =>
    item.label.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10)

  return NextResponse.json({ success: true, data: matches }, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
