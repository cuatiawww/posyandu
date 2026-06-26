import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const PROVINSI_FALLBACK = [
  { code: '11', name: 'ACEH' },
  { code: '12', name: 'SUMATERA UTARA' },
  { code: '13', name: 'SUMATERA BARAT' },
  { code: '14', name: 'RIAU' },
  { code: '15', name: 'JAMBI' },
  { code: '16', name: 'SUMATERA SELATAN' },
  { code: '17', name: 'BENGKULU' },
  { code: '18', name: 'LAMPUNG' },
  { code: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
  { code: '21', name: 'KEPULAUAN RIAU' },
  { code: '31', name: 'DKI JAKARTA' },
  { code: '32', name: 'JAWA BARAT' },
  { code: '33', name: 'JAWA TENGAH' },
  { code: '34', name: 'DI YOGYAKARTA' },
  { code: '35', name: 'JAWA TIMUR' },
  { code: '36', name: 'BANTEN' },
  { code: '51', name: 'BALI' },
  { code: '52', name: 'NUSA TENGGARA BARAT' },
  { code: '53', name: 'NUSA TENGGARA TIMUR' },
  { code: '61', name: 'KALIMANTAN BARAT' },
  { code: '62', name: 'KALIMANTAN TENGAH' },
  { code: '63', name: 'KALIMANTAN SELATAN' },
  { code: '64', name: 'KALIMANTAN TIMUR' },
  { code: '65', name: 'KALIMANTAN UTARA' },
  { code: '71', name: 'SULAWESI UTARA' },
  { code: '72', name: 'SULAWESI TENGAH' },
  { code: '73', name: 'SULAWESI SELATAN' },
  { code: '74', name: 'SULAWESI TENGGARA' },
  { code: '75', name: 'GORONTALO' },
  { code: '76', name: 'SULAWESI BARAT' },
  { code: '81', name: 'MALUKU' },
  { code: '82', name: 'MALUKU UTARA' },
  { code: '91', name: 'PAPUA BARAT' },
  { code: '94', name: 'PAPUA' },
]

export async function GET(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
  }

  const searchParams = req.nextUrl.searchParams
  const provinceId = searchParams.get('province_id') || ''
  const kabupatenId = searchParams.get('kabupaten_id') || ''
  const kecamatanId = searchParams.get('kecamatan_id') || ''

  // 1. Kelurahan / Desa requested
  if (kecamatanId) {
    const list = [
      { id: `${kecamatanId}01`, code: `${kecamatanId}01`, name: `KELURAHAN ${kecamatanId} ALFA` },
      { id: `${kecamatanId}02`, code: `${kecamatanId}02`, name: `KELURAHAN ${kecamatanId} BETA` },
      { id: `${kecamatanId}03`, code: `${kecamatanId}03`, name: `DESA ${kecamatanId} GAMA` },
      { id: `${kecamatanId}04`, code: `${kecamatanId}04`, name: `DESA ${kecamatanId} DELTA` },
      { id: `${kecamatanId}05`, code: `${kecamatanId}05`, name: `KELURAHAN ${kecamatanId} EPSILON` },
    ]
    return NextResponse.json({ success: true, data: list }, { headers: CORS_HEADERS })
  }

  // 2. Kecamatan requested
  if (kabupatenId) {
    const list = [
      { id: `${kabupatenId}01`, code: `${kabupatenId}01`, name: `KECAMATAN ${kabupatenId} UTARA` },
      { id: `${kabupatenId}02`, code: `${kabupatenId}02`, name: `KECAMATAN ${kabupatenId} TIMUR` },
      { id: `${kabupatenId}03`, code: `${kabupatenId}03`, name: `KECAMATAN ${kabupatenId} SELATAN` },
      { id: `${kabupatenId}04`, code: `${kabupatenId}04`, name: `KECAMATAN ${kabupatenId} BARAT` },
      { id: `${kabupatenId}05`, code: `${kabupatenId}05`, name: `KECAMATAN ${kabupatenId} PUSAT` },
    ]
    return NextResponse.json({ success: true, data: list }, { headers: CORS_HEADERS })
  }

  // 3. Kabupaten requested
  if (provinceId) {
    const province = PROVINSI_FALLBACK.find((p) => p.code === provinceId)
    const provName = province ? province.name : 'WILAYAH'
    const list = [
      { id: `${provinceId}01`, code: `${provinceId}01`, name: `KAB. ${provName} UTARA` },
      { id: `${provinceId}02`, code: `${provinceId}02`, name: `KAB. ${provName} TIMUR` },
      { id: `${provinceId}03`, code: `${provinceId}03`, name: `KAB. ${provName} SELATAN` },
      { id: `${provinceId}04`, code: `${provinceId}04`, name: `KAB. ${provName} BARAT` },
      { id: `${provinceId}05`, code: `${provinceId}05`, name: `KOTA ${provName} METRO` },
    ]
    return NextResponse.json({ success: true, data: list }, { headers: CORS_HEADERS })
  }

  // 4. Default: return all provinces
  const formattedProvinces = PROVINSI_FALLBACK.map(p => ({
    id: p.code,
    code: p.code,
    name: p.name
  }))

  return NextResponse.json(
    { success: true, data: formattedProvinces },
    { headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
