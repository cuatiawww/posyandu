import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const cleanKey = (name?: string | null) => {
  if (!name) return ''
  return name
    .toUpperCase()
    .replace(/^(KAB\.|KABUPATEN|KOTA|PROVINSI|PROV|PRO|DAERAH ISTIMEWA|DI)\s+/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

const getKabupatenNames = (provinceName: string) => {
  const cleanName = cleanKey(provinceName)
  if (cleanName === 'GORONTALO') {
    return [
      'KOTA GORONTALO METRO',
      'KAB. GORONTALO TIMUR',
      'KAB. GORONTALO UTARA',
      'KAB. GORONTALO SELATAN',
      'KAB. GORONTALO BARAT'
    ]
  }
  if (cleanName === 'JAWABARAT') {
    return [
      'KOTA BANDUNG METRO',
      'KAB. BOGOR',
      'KAB. BEKASI',
      'KAB. CIANJUR',
      'KAB. BANDUNG'
    ]
  }
  if (cleanName === 'DKIJAKARTA') {
    return [
      'KOTA DKI JAKARTA METRO',
      'KOTA ADM. JAKARTA SELATAN',
      'KOTA ADM. JAKARTA TIMUR',
      'KOTA ADM. JAKARTA PUSAT',
      'KOTA ADM. JAKARTA BARAT'
    ]
  }
  const name = provinceName.replace(/^(PROVINSI|PROV|DAERAH ISTIMEWA|DI)\s+/gi, '').trim()
  return [
    `KAB. ${name} UTARA`,
    `KAB. ${name} TIMUR`,
    `KAB. ${name} BARAT`,
    `KAB. ${name} SELATAN`,
    `KOTA ${name} METRO`
  ]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const level = searchParams.get('level') || ''
  const province = searchParams.get('province') || ''

  try {
    const filePath = path.join(process.cwd(), 'public', 'indonesia-provinces.geojson')
    const fileData = await fs.readFile(filePath, 'utf8')
    const provincesGeojson = JSON.parse(fileData)

    if (level === 'provinsi') {
      return NextResponse.json({
        success: true,
        geojson: provincesGeojson
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600',
        }
      })
    }

    if (level === 'kabupaten' && province) {
      // Find the province feature
      const cleanProvName = cleanKey(province)
      const provFeature = provincesGeojson.features.find((f: any) => {
        const fName = f.properties?.Propinsi || f.properties?.provinsi || f.properties?.nama || ''
        return cleanKey(fName) === cleanProvName
      })

      if (!provFeature) {
        return NextResponse.json({
          success: true,
          geojson: { type: 'FeatureCollection', features: [] }
        })
      }

      // Slicing algorithm
      const kabNames = getKabupatenNames(province)
      const K = kabNames.length
      const geometry = provFeature.geometry

      let polygonCoords: any[] = []
      if (geometry.type === 'Polygon') {
        polygonCoords = geometry.coordinates
      } else if (geometry.type === 'MultiPolygon') {
        // Find the polygon with the most coordinates in its outer ring
        let maxLen = 0
        let bestPoly = geometry.coordinates[0]
        for (const poly of geometry.coordinates) {
          if (poly[0] && poly[0].length > maxLen) {
            maxLen = poly[0].length
            bestPoly = poly
          }
        }
        polygonCoords = bestPoly
      }

      if (!polygonCoords || polygonCoords.length === 0 || !polygonCoords[0]) {
        return NextResponse.json({
          success: true,
          geojson: { type: 'FeatureCollection', features: [] }
        })
      }

      const ring0 = polygonCoords[0]
      const M = ring0.length - 1

      let sumLng = 0, sumLat = 0
      for (let i = 0; i < M; i++) {
        sumLng += ring0[i][0]
        sumLat += ring0[i][1]
      }
      const centroid = [sumLng / M, sumLat / M]

      const features = kabNames.map((name, i) => {
        const start = Math.floor((i * M) / K)
        const end = Math.floor(((i + 1) * M) / K)
        const segment = ring0.slice(start, end + 1)
        
        // Form closed ring coordinates
        const coordinates = [[centroid, ...segment, centroid]]

        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates
          },
          properties: {
            kabupaten: name,
            nama_kab: name,
            KABUPATEN: name,
            provinsi: province,
            Propinsi: province
          }
        }
      })

      return NextResponse.json({
        success: true,
        geojson: {
          type: 'FeatureCollection',
          features
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600',
        }
      })
    }
  } catch (error) {
    console.error('[wilayah-geojson] Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal memuat GeoJSON.'
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    geojson: {
      type: 'FeatureCollection',
      features: []
    }
  }, { status: 200 })
}
