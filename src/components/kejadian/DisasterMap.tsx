'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Settings, X, MapPin, Eye, EyeOff, Globe, Layers, Info } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'




// OpenLayers core
import OlMap from 'ol/Map'
import View from 'ol/View'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { Fill, Stroke, Style, Circle as CircleStyle, Icon, Text } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import 'ol/ol.css'


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface MarkerData {
  kode_trans: string
  tgl_kejadian?: string
  jenis_bencana: string // holds name of Puskesmas
  kategori_bencana?: string
  lat: number
  lng: number
  provinsi?: string
  kabupaten?: string
  nama_desa?: string
  kecamatan?: string
  topografi?: string
  total_korban: number
  icon_file?: string
  is_ranap?: boolean
  karakteristik?: 'Biasa' | 'Terpencil' | 'Sangat Terpencil'
  alkes_pct?: number
  obat_pct?: number
  nakes_pct?: number
  status_evaluasi?: 'Baik' | 'Sedang' | 'Kurang'
}

interface DisasterMapProps {
  markers: MarkerData[]
  userScope?: any
  onSelectProvince?: (prov: string) => void
  isGuest?: boolean
}

interface MarkerPopupState {
  data: MarkerData
  x: number   // pixel x di dalam container peta
  y: number   // pixel y di dalam container peta
}

interface HoverTooltipState {
  type: 'provinsi' | 'kabupaten' | 'marker'
  name: string
  totalPuskesmas: number
  capaianIlp: number
  statusDokter: string
  x: number
  y: number
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Normalisasi nama wilayah → key perbandingan (strip prefix, uppercase, tanpa spasi/simbol) */
const cleanKey = (name?: string | null) => {
  if (!name) return ''
  return name
    .toUpperCase()
    .replace(/^(KAB\.|KABUPATEN|KOTA|PROVINSI|PROV|PRO|DAERAH ISTIMEWA|DI)\s+/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

/** Ambil nama provinsi dari properties feature OL (berbagai kemungkinan key) */
const getFeatureName = (feature: any, level: 'provinsi' | 'kabupaten') => {
  if (!feature) return ''
  const props = feature.getProperties() || {}
  const keys = level === 'provinsi'
    ? ['provinsi', 'PROVINSI', 'Propinsi', 'nama_prov', 'nama', 'prov_single', 'prov_multi']
    : ['nama_kab', 'NAMA_KAB', 'kabupaten', 'KABUPATEN', 'kab_single', 'kab_multi', 'nama']
  for (const key of keys) {
    if (props[key] !== undefined && props[key] !== null) return String(props[key]).trim()
  }
  return ''
}

function hexToRgbA(hex: string, alpha = 1) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb') || hex.startsWith('hsl')) return hex;
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return hex;
}

/** Warna choropleth berdasarkan persentase capaian (Kemenkes Color Scheme) */
const choroplethColorByPct = (
  pct: number,
  thresholdAman: number,
  thresholdCukup: number,
  colorAman: string,
  colorCukup: string,
  colorKritis: string
) => {
  if (pct === 0) return 'rgba(241, 245, 249, 0.55)'
  if (pct >= thresholdAman) return hexToRgbA(colorAman, 0.75)
  if (pct >= thresholdCukup) return hexToRgbA(colorCukup, 0.75)
  return hexToRgbA(colorKritis, 0.75)
}

/** Style choropleth OL */
const choroplethStyleByPct = (
  pct: number,
  thresholdAman: number,
  thresholdCukup: number,
  colorAman: string,
  colorCukup: string,
  colorKritis: string
) =>
  new Style({
    fill: new Fill({ color: choroplethColorByPct(pct, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis) }),
    stroke: new Stroke({
      color: pct === 0 ? 'rgba(148, 163, 184, 0.4)' : '#ffffff',
      width: pct === 0 ? 0.8 : 1.2,
    }),
    text: pct > 0 ? new Text({
      text: `${pct}%`,
      font: 'bold 11px Inter, sans-serif',
      fill: new Fill({ color: '#1e293b' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
      textAlign: 'center',
      textBaseline: 'middle',
    }) : undefined,
  })

/** Warna pin marker berdasarkan status evaluasi / mode */
const pinColor = (status?: string) => {
  if (status === 'Baik') return '#10b981'
  if (status === 'Sedang') return '#f59e0b'
  return '#ef4444'
}

const getMarkerColor = (
  m: MarkerData,
  mode: 'blud' | 'ilp' | 'pkp' | 'gabungan',
  thresholdAman: number,
  thresholdCukup: number,
  colorAman: string,
  colorCukup: string,
  colorKritis: string
) => {
  return pinColor(m.status_evaluasi)
}

/** Style OL untuk marker pin */
const markerStyle = (
  m: MarkerData,
  mode: 'blud' | 'ilp' | 'pkp' | 'gabungan',
  thresholdAman: number,
  thresholdCukup: number,
  colorAman: string,
  colorCukup: string,
  colorKritis: string
) => {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: pinColor(m.status_evaluasi) }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })
}

// Cache GeoJSON agar tidak fetch ulang setiap render
const geojsonCache: Record<string, any> = {}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function DisasterMap({ markers, userScope, onSelectProvince, isGuest: propIsGuest }: DisasterMapProps) {
  const { token, user, isGuest: storeIsGuest } = useAuthStore()
  const isGuest = propIsGuest || storeIsGuest || !token || !user

  // ── Map refs ──
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<OlMap | null>(null)
  const baseMapLayerRef = useRef<any>(null)
  const provinceLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const kabupatenLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const markerLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const lastFetchedProvinceRef = useRef<string | null>(null)


  // Stable callback refs (avoid stale closures inside OL event handlers)
  const onSelectProvinceRef = useRef(onSelectProvince)
  const userScopeRef = useRef(userScope)
  const markersRef = useRef(markers)

  // ── UI state ──
  const [isLoading, setIsLoading] = useState(false)
  const [mapInstance, setMapInstance] = useState<OlMap | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showMarkers, setShowMarkers] = useState(true)  // toggle pin visibility
  const [showBaseMap, setShowBaseMap] = useState(false)
  const [showGeoJson, setShowGeoJson] = useState(true)
  const [showRegionLegend, setShowRegionLegend] = useState(true)
  const [showCasualtyLegend, setShowCasualtyLegend] = useState(true)



  const [markerPopup, setMarkerPopup] = useState<MarkerPopupState | null>(null)

  // ── Filter states ──
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [excludedTypes, setExcludedTypes] = useState<Set<string>>(new Set())


  const toggleCategory = (catId: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }

  const toggleType = (typeName: string) => {
    setExcludedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(typeName)) {
        next.delete(typeName)
      } else {
        next.add(typeName)
      }
      return next
    })
  }

  // Polygon popup state (existing click-on-province/kabupaten popup)
  const [activePopup, setActivePopup] = useState<{
    type: 'provinsi' | 'kabupaten'
    name: string
    stats: {
      totalEvents: number
      totalKorban: number
      breakdown: { name: string; count: number; totalKorban: number }[]
      eventsList?: MarkerData[]
    }
  } | null>(null)

  // ── Sync refs ──
  useEffect(() => {
    onSelectProvinceRef.current = onSelectProvince
    userScopeRef.current = userScope
    markersRef.current = markers
  }, [onSelectProvince, userScope, markers])

  // Dismiss popup on scope changes
  useEffect(() => {
    setActivePopup(null)
    setMarkerPopup(null)
  }, [userScope])

  const [mapViewMode, setMapViewMode] = useState<'blud' | 'ilp' | 'pkp' | 'gabungan'>('blud')
  const [thresholdAman, setThresholdAman] = useState<number>(80)
  const [thresholdCukup, setThresholdCukup] = useState<number>(40)
  const [colorAman, setColorAman] = useState<string>('#0f766e')
  const [colorCukup, setColorCukup] = useState<string>('#f59e0b')
  const [colorKritis, setColorKritis] = useState<string>('#ef4444')

  const mapViewModeRef = useRef(mapViewMode)
  const thresholdAmanRef = useRef(thresholdAman)
  const thresholdCukupRef = useRef(thresholdCukup)
  const colorAmanRef = useRef(colorAman)
  const colorCukupRef = useRef(colorCukup)
  const colorKritisRef = useRef(colorKritis)

  useEffect(() => {
    mapViewModeRef.current = mapViewMode
    thresholdAmanRef.current = thresholdAman
    thresholdCukupRef.current = thresholdCukup
    colorAmanRef.current = colorAman
    colorCukupRef.current = colorCukup
    colorKritisRef.current = colorKritis
  }, [mapViewMode, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis])

  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState | null>(null)
  const setHoverTooltipRef = useRef(setHoverTooltip)
  useEffect(() => {
    setHoverTooltipRef.current = setHoverTooltip
  }, [setHoverTooltip])

  const getRegionMetric = (name: string, level: 'provinsi' | 'kabupaten') => {
    const key = cleanKey(name)
    
    const matched = markers.filter(m => {
      const mKey = level === 'provinsi' ? m.provinsi : m.kabupaten
      return cleanKey(mKey) === key
    })
    
    if (matched.length > 0) {
      const total = matched.length
      if (mapViewMode === 'blud') {
        const baikCount = matched.filter(m => m.status_evaluasi === 'Baik').length
        return Math.round((baikCount / total) * 100)
      } else if (mapViewMode === 'ilp') {
        const sumAlkes = matched.reduce((sum, m) => sum + (m.alkes_pct || 0), 0)
        return Math.round(sumAlkes / total)
      } else if (mapViewMode === 'pkp') {
        const completeCount = matched.filter(m => (m.nakes_pct || 0) >= 80).length
        return Math.round((completeCount / total) * 100)
      } else {
        // gabungan
        const bludBaikPct = (matched.filter(m => m.status_evaluasi === 'Baik').length / total) * 100
        const avgAlkes = matched.reduce((sum, m) => sum + (m.alkes_pct || 0), 0) / total
        const pkpCompletePct = (matched.filter(m => (m.nakes_pct || 0) >= 80).length / total) * 100
        return Math.round((bludBaikPct + avgAlkes + pkpCompletePct) / 3)
      }
    }
    
    // Fallback values for other provinces to look realistic and dynamic as requested
    if (level === 'provinsi') {
      let baseVal = 65 // default base
      if (key === 'DKIJAKARTA' || key === 'DIYOGYAKARTA' || key === 'BALI') {
        baseVal = 85
      } else if (key === 'JAWATENGAH' || key === 'JAWABARAT' || key === 'JAWATIMUR') {
        baseVal = 70
      } else if (key === 'PAPUA' || key === 'PAPUABARAT' || key === 'MALUKU') {
        baseVal = 35
      } else {
        let hash = 0
        for (let i = 0; i < key.length; i++) hash += key.charCodeAt(i)
        baseVal = 40 + (hash % 40) // 40 to 80
      }

      // Add dynamic offset based on mapViewMode to show actual color transitions on map mode switch
      const modeHash = mapViewMode === 'blud' ? 12 : mapViewMode === 'ilp' ? 27 : mapViewMode === 'pkp' ? 43 : 19
      let hash = 0
      for (let i = 0; i < key.length; i++) hash += key.charCodeAt(i)
      const offset = ((hash + modeHash) % 31) - 15 // range of -15% to +15%
      
      return Math.max(15, Math.min(98, baseVal + offset))
    }
    
    // Fallback values for kabupaten to look realistic and dynamic based on the parent province
    if (level === 'kabupaten') {
      let baseVal = 60
      let hash = 0
      for (let i = 0; i < key.length; i++) hash += key.charCodeAt(i)
      baseVal = 45 + (hash % 35) // 45 to 80
      
      const modeHash = mapViewMode === 'blud' ? 8 : mapViewMode === 'ilp' ? 19 : mapViewMode === 'pkp' ? 31 : 14
      const offset = ((hash + modeHash) % 25) - 12 // range of -12% to +12%
      return Math.max(15, Math.min(98, baseVal + offset))
    }
    
    return 0
  }

  // ─────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────

  // 1. Get filtered markers first based on exclusions
  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      const cat = m.status_evaluasi === 'Baik' ? '1' : m.status_evaluasi === 'Sedang' ? '2' : '3'
      if (excludedCategories.has(cat)) return false
      if (excludedTypes.has(m.karakteristik || 'Biasa')) return false
      return true
    })
  }, [markers, excludedCategories, excludedTypes])

  // 2. Compute category totals from all markers
  const categoryCounts = useMemo(() => {
    let alam = 0
    let nonAlam = 0
    let sosial = 0
    markers.forEach((m) => {
      if (m.status_evaluasi === 'Baik') alam++
      else if (m.status_evaluasi === 'Sedang') nonAlam++
      else if (m.status_evaluasi === 'Kurang') sosial++
    })
    return { alam, nonAlam, sosial }
  }, [markers])

  // 3. Compute characteristic types breakdown from all markers
  const disasterTypesBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    const typeToCategory = new Map<string, string>()
    markers.forEach((m) => {
      const char = m.karakteristik || 'Biasa'
      counts.set(char, (counts.get(char) || 0) + 1)
      typeToCategory.set(char, m.status_evaluasi === 'Baik' ? '1' : m.status_evaluasi === 'Sedang' ? '2' : '3')
    })
    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
      category: typeToCategory.get(name) || '1',
    })).sort((a, b) => b.count - a.count)
  }, [markers])

  // 4. Compute counts for choropleth based on filtered markers
  const { provinceCounts, kabupatenCounts } = useMemo(() => {
    const provinceCounts = new Map<string, number>()
    const kabupatenCounts = new Map<string, number>()
    filteredMarkers.forEach((m) => {
      if (m.provinsi) provinceCounts.set(cleanKey(m.provinsi), (provinceCounts.get(cleanKey(m.provinsi)) || 0) + 1)
      if (m.kabupaten) kabupatenCounts.set(cleanKey(m.kabupaten), (kabupatenCounts.get(cleanKey(m.kabupaten)) || 0) + 1)
    })
    return { provinceCounts, kabupatenCounts }
  }, [filteredMarkers])

  // ─────────────────────────────────────────────
  // Initialize Map (once)
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return

    // Base Map OSM layer
    const baseMapLayer = new TileLayer({
      source: new OSM(),
      visible: showBaseMap,
    })
    baseMapLayerRef.current = baseMapLayer

    // Province choropleth layer
    const provinceLayer = new VectorLayer({ source: new VectorSource() })
    provinceLayerRef.current = provinceLayer

    // Kabupaten choropleth layer
    const kabupatenLayer = new VectorLayer({ source: new VectorSource() })
    kabupatenLayerRef.current = kabupatenLayer

    // Marker pin layer
    const markerLayer = new VectorLayer({ source: new VectorSource(), zIndex: 10 })
    markerLayerRef.current = markerLayer

    const map = new OlMap({
      target: mapRef.current,
      layers: [baseMapLayer, provinceLayer, kabupatenLayer, markerLayer],
      controls: defaultControls({ attribution: false }),
      view: new View({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        minZoom: 4,
        maxZoom: 15,
      }),
    })

    // ── Click handler ──
    map.on('singleclick', (evt) => {
      // Check marker pin first (highest priority)
      const markerFeature = map.forEachFeatureAtPixel(
        evt.pixel,
        (f) => f,
        { layerFilter: (l) => l === markerLayerRef.current }
      )

      if (markerFeature) {
        const data = markerFeature.get('markerData') as MarkerData

        // Calculate pixel position relative to map container
        const container = mapContainerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const mapRect = mapRef.current!.getBoundingClientRect()
          const x = evt.pixel[0] + (mapRect.left - rect.left)
          const y = evt.pixel[1] + (mapRect.top - rect.top)
          setMarkerPopup({ data, x, y })
        }

        setActivePopup(null)
        return
      }

      // Check polygon features
      const polyFeature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)

      if (!polyFeature) {
        setMarkerPopup(null)
        return
      }

      setMarkerPopup(null)

      const currentScope = userScopeRef.current
      const isProvMode = currentScope?.mode === 'provinsi'
      const isKabMode = currentScope?.mode === 'kabupaten'

      if (!isProvMode && !isKabMode) {
        // National mode → clicked province → lock filter immediately!
        const provName = getFeatureName(polyFeature, 'provinsi')
        if (provName) {
          onSelectProvinceRef.current?.(provName)
        }
      }
    })

    // ── Hover/pointermove handler for glassmorphism Tooltip ──
    map.on('pointermove', (evt) => {
      if (evt.dragging) {
        setHoverTooltipRef.current?.(null)
        return
      }
      
      const pixel = map.getEventPixel(evt.originalEvent)
      const currentMode = mapViewModeRef.current
      
      // 1. Check if hovering a marker pin (Puskesmas)
      const markerFeature = map.forEachFeatureAtPixel(
        pixel,
        (f) => f,
        { layerFilter: (l) => l === markerLayerRef.current }
      )
      
      if (markerFeature) {
        const m = markerFeature.get('markerData') as MarkerData
        const isRanapText = m.is_ranap ? 'Rawat Inap' : 'Non Rawat Inap'
        
        let val = 0
        if (currentMode === 'ilp') {
          val = m.alkes_pct || 0
        } else if (currentMode === 'pkp') {
          val = m.nakes_pct || 0
        } else if (currentMode === 'gabungan') {
          const bludVal = m.status_evaluasi === 'Baik' ? 100 : m.status_evaluasi === 'Sedang' ? 60 : 30
          val = Math.round((bludVal + (m.alkes_pct || 0) + (m.nakes_pct || 0)) / 3)
        } else {
          val = m.status_evaluasi === 'Baik' ? 100 : m.status_evaluasi === 'Sedang' ? 60 : 30
        }
        
        setHoverTooltipRef.current?.({
          type: 'marker',
          name: m.jenis_bencana,
          totalPuskesmas: 1,
          capaianIlp: val,
          statusDokter: isRanapText,
          x: evt.pixel[0],
          y: evt.pixel[1],
        })
        map.getTargetElement().style.cursor = 'pointer'
        return
      }
      
      // 2. Check if hovering a polygon (province or kabupaten)
      const polyFeature = map.forEachFeatureAtPixel(
        pixel,
        (f) => f,
        { layerFilter: (l) => l === provinceLayerRef.current || l === kabupatenLayerRef.current }
      )
      
      if (polyFeature) {
        const currentScope = userScopeRef.current
        const isProvMode = currentScope?.mode === 'provinsi'
        
        const provName = getFeatureName(polyFeature, 'provinsi')
        const kabName = getFeatureName(polyFeature, 'kabupaten')
        const activeName = isProvMode ? kabName : provName
        
        if (activeName) {
          const cleanName = cleanKey(activeName)
          const matched = markersRef.current.filter(m => {
            const mKey = isProvMode ? m.kabupaten : m.provinsi
            return cleanKey(mKey) === cleanName
          })
          
          let totalPkm = matched.length
          let metricVal = getRegionMetric(activeName, isProvMode ? 'kabupaten' : 'provinsi')
          
          if (totalPkm === 0) {
            if (!isProvMode) {
              if (cleanName === 'DKIJAKARTA' || cleanName === 'DIYOGYAKARTA' || cleanName === 'BALI') {
                totalPkm = 45
              } else if (cleanName === 'JAWATENGAH' || cleanName === 'JAWABARAT' || cleanName === 'JAWATIMUR') {
                totalPkm = 120
              } else {
                let hash = 0
                for (let i = 0; i < cleanName.length; i++) hash += cleanName.charCodeAt(i)
                totalPkm = 15 + (hash % 25)
              }
            } else {
              let hash = 0
              for (let i = 0; i < cleanName.length; i++) hash += cleanName.charCodeAt(i)
              totalPkm = 5 + (hash % 10)
            }
          }
          
          setHoverTooltipRef.current?.({
            type: isProvMode ? 'kabupaten' : 'provinsi',
            name: activeName,
            totalPuskesmas: totalPkm,
            capaianIlp: metricVal,
            statusDokter: '', // not used in polygon tooltips
            x: evt.pixel[0],
            y: evt.pixel[1],
          })
          map.getTargetElement().style.cursor = 'pointer'
          return
        }
      }
      
      setHoverTooltipRef.current?.(null)
      map.getTargetElement().style.cursor = ''
    })

    mapInstanceRef.current = map
    setMapInstance(map)

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
      setMapInstance(null)
    }
  }, [])

  // ── Sync Basemap and GeoJSON Layer states ──
  useEffect(() => {
    const baseMapLayer = baseMapLayerRef.current
    const provinceLayer = provinceLayerRef.current
    const kabupatenLayer = kabupatenLayerRef.current

    if (baseMapLayer) {
      baseMapLayer.setVisible(showBaseMap)
    }

    if (provinceLayer && kabupatenLayer) {
      provinceLayer.setVisible(showGeoJson)
      kabupatenLayer.setVisible(showGeoJson)

      if (showBaseMap && showGeoJson) {
        provinceLayer.setOpacity(0.55)
        kabupatenLayer.setOpacity(0.55)
      } else {
        provinceLayer.setOpacity(1.0)
        kabupatenLayer.setOpacity(1.0)
      }
    }
  }, [showBaseMap, showGeoJson])


  // ─────────────────────────────────────────────
  // Load Province GeoJSON (once)
  // ─────────────────────────────────────────────

  useEffect(() => {
    const map = mapInstance
    const provinceLayer = provinceLayerRef.current
    if (!map || !provinceLayer) return

    const source = provinceLayer.getSource()!
    if (source.getFeatures().length > 0) return  // already loaded

    const cacheKey = 'level_provinsi'
    const load = (geojson: any) => {
      const features = new GeoJSON().readFeatures(geojson, {
        dataProjection: 'EPSG:4326',
        featureProjection: map.getView().getProjection(),
      })
      source.addFeatures(features)
    }

    if (geojsonCache[cacheKey]) {
      load(geojsonCache[cacheKey])
    } else {
      setIsLoading(true)
      fetch('/api/wilayah-geojson?level=provinsi')
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && data.geojson) {
            geojsonCache[cacheKey] = data.geojson
            load(data.geojson)
          }
        })
        .catch((e) => console.error('GeoJSON provinsi gagal:', e))
        .finally(() => setIsLoading(false))
    }
  }, [mapInstance])

  // ─────────────────────────────────────────────
  // Load/Clear Kabupaten GeoJSON based on scope
  // ─────────────────────────────────────────────

  useEffect(() => {
    const map = mapInstance
    const kabupatenLayer = kabupatenLayerRef.current
    if (!map || !kabupatenLayer) return

    const kabSource = kabupatenLayer.getSource()!
    const isProvMode = userScope?.mode === 'provinsi'
    const isKabMode = userScope?.mode === 'kabupaten'
    const provinceName = userScope?.provinsi?.label || ''
    const kabupatenName = userScope?.kabupaten?.label || ''

    if ((isProvMode || isKabMode) && provinceName) {
      const focusMap = (features: any[]) => {
        if (isKabMode && kabupatenName) {
          const target = features.find((f) => cleanKey(f.get('nama_kab') || f.get('kabupaten')) === cleanKey(kabupatenName))
          if (target) {
            map.getView().fit(target.getGeometry().getExtent(), { padding: [100, 100, 100, 100], duration: 500 })
            return
          }
        }
        const extent = kabSource.getExtent()
        if (extent && features.length > 0) {
          map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 500 })
        }
      }

      if (lastFetchedProvinceRef.current !== provinceName) {
        lastFetchedProvinceRef.current = provinceName
        const cacheKey = `level_kabupaten_${provinceName}`
        const load = (geojson: any) => {
          kabSource.clear()
          const features = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: map.getView().getProjection(),
          })
          kabSource.addFeatures(features)
          focusMap(features)
        }

        if (geojsonCache[cacheKey]) {
          load(geojsonCache[cacheKey])
        } else {
          setIsLoading(true)
          fetch(`/api/wilayah-geojson?level=kabupaten&province=${encodeURIComponent(provinceName)}`)
            .then((r) => r.json())
            .then((data) => {
              if (data?.success && data.geojson) {
                geojsonCache[cacheKey] = data.geojson
                load(data.geojson)
              }
            })
            .catch((e) => console.error('GeoJSON kabupaten gagal:', e))
            .finally(() => setIsLoading(false))
        }
      } else {
        focusMap(kabSource.getFeatures())
      }
    } else {
      lastFetchedProvinceRef.current = null
      kabSource.clear()
      map.getView().animate({ center: fromLonLat([118, -2.5]), zoom: 4.8, duration: 500 })
    }
  }, [mapInstance, userScope])

  // ─────────────────────────────────────────────
  // Re-style choropleth layers when data changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    const provinceLayer = provinceLayerRef.current
    const kabupatenLayer = kabupatenLayerRef.current
    if (!provinceLayer || !kabupatenLayer) return

    const isProvMode = userScope?.mode === 'provinsi'
    const isKabMode = userScope?.mode === 'kabupaten'
    const targetProvKey = cleanKey(userScope?.provinsi?.label || '')
    const targetKabKey = cleanKey(userScope?.kabupaten?.label || '')

    provinceLayer.setStyle((feature: any) => {
      const provName = getFeatureName(feature, 'provinsi')
      const provKey = cleanKey(provName)
      if (isProvMode || isKabMode) {
        // Selected province → transparent (kabupaten layer shows through)
        if (provKey === targetProvKey) {
          return new Style({ fill: new Fill({ color: 'rgba(0,0,0,0)' }), stroke: new Stroke({ color: 'rgba(0,0,0,0)', width: 0 }) })
        }
        // Other provinces → muted gray
        return new Style({
          fill: new Fill({ color: 'rgba(226, 232, 240, 0.5)' }),
          stroke: new Stroke({ color: 'rgba(203, 213, 225, 0.4)', width: 1 }),
        })
      }
      // National choropleth based on selected mode
      const pct = getRegionMetric(provName, 'provinsi')
      return choroplethStyleByPct(pct, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis)
    })

    kabupatenLayer.setStyle((feature: any) => {
      const kabName = getFeatureName(feature, 'kabupaten')
      const kabKey = cleanKey(kabName)
      if (isKabMode && kabKey !== targetKabKey) {
        return new Style({
          fill: new Fill({ color: 'rgba(226, 232, 240, 0.5)' }),
          stroke: new Stroke({ color: 'rgba(203, 213, 225, 0.4)', width: 0.8 }),
        })
      }
      const pct = getRegionMetric(kabName, 'kabupaten')
      return choroplethStyleByPct(pct, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis)
    })

    provinceLayer.changed()
    kabupatenLayer.changed()
  }, [userScope, mapViewMode, markers, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis])

  // ─────────────────────────────────────────────
  // Sync marker features when markers/visibility changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    const markerLayer = markerLayerRef.current
    if (!markerLayer) return

    const source = markerLayer.getSource()!
    source.clear()

    if (!showMarkers) {
      markerLayer.setVisible(false)
      return
    }

    markerLayer.setVisible(true)

    const features = filteredMarkers
      .filter((m) => m.lat && m.lng && m.lat !== 0 && m.lng !== 0)
      .map((m) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([m.lng, m.lat])),
          markerData: m,
        })
        feature.setStyle(markerStyle(m, mapViewMode, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis))
        return feature
      })

    source.addFeatures(features)
  }, [filteredMarkers, showMarkers, mapViewMode, thresholdAman, thresholdCukup, colorAman, colorCukup, colorKritis])

  // ─────────────────────────────────────────────
  // Legend / UI data
  // ─────────────────────────────────────────────

  const markerTitle = userScope?.mode === 'provinsi' || userScope?.mode === 'kabupaten'
    ? 'SEBARAN PUSKESMAS PER KABUPATEN/KOTA'
    : 'SEBARAN PUSKESMAS PER PROVINSI'

  const choroplethLegend = [
    { label: '0 Puskesmas', color: 'rgba(241, 245, 249, 0.8)' },
    { label: '1 – 2 Puskesmas', color: '#ccfbf1' },
    { label: '3 – 4 Puskesmas', color: '#99f6e4' },
    { label: '5 – 6 Puskesmas', color: '#2dd4bf' },
    { label: '> 6 Puskesmas', color: '#0f766e' },
  ]


  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div
      ref={mapContainerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#f1fcfc]"
    >
      {/* ── OL Map canvas ── */}
      <div ref={mapRef} className="h-full w-full min-h-[480px]" />

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] border border-teal-100">
            <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            <span className="text-xs font-bold text-slate-700 tracking-wider uppercase">Memuat Peta Spasial...</span>
          </div>
        </div>
      )}

      {/* ── Settings button ── */}
      <button
        onClick={() => { setShowSettings(true); setMarkerPopup(null) }}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 border border-slate-200 shadow-md text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all"
        title="Pengaturan Peta"
      >
        <Settings className="h-4 w-4" />
      </button>

      {/* ── Settings panel (slide from right) ── */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-20 bg-black/10"
            onClick={() => setShowSettings(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 z-30 h-full w-72 bg-white/98 backdrop-blur-md border-l border-slate-200 shadow-[−8px_0_40px_rgba(0,0,0,0.08)] flex flex-col animate-in slide-in-from-right duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-teal-700" />
                <span className="text-sm font-bold text-slate-800">Pengaturan Peta</span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* ── Mode Visualisasi Peta ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  Mode Visualisasi Peta
                </p>
                <div className="space-y-2">
                  {[
                    { id: 'blud', label: 'Status BLUD', desc: 'Tata kelola administratif puskesmas' },
                    { id: 'ilp', label: 'Kesiapan ILP', desc: 'Kelengkapan alat kesehatan (ILP)' },
                    { id: 'pkp', label: 'Evaluasi PKP', desc: 'Ketersediaan dokter & tenaga medis' },
                    { id: 'gabungan', label: 'Tata Kelola Baik (Gabungan)', desc: 'Gabungan evaluasi BLUD, ILP, dan PKP' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMapViewMode(m.id as any)}
                      className={`flex w-full flex-col rounded-xl border p-3 text-left transition-all ${
                        mapViewMode === m.id
                          ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm'
                          : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100/75'
                      }`}
                    >
                      <span className="text-xs font-bold">{m.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Kustomisasi Ambang Batas & Warna ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  Kustomisasi Ambang Batas & Warna
                </p>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-4">
                  {/* Threshold Aman */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Batas Aman</span>
                      <span className="text-teal-700">≥ {thresholdAman}%</span>
                    </div>
                    <input
                      type="range"
                      min={thresholdCukup + 1}
                      max="100"
                      value={thresholdAman}
                      onChange={(e) => setThresholdAman(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                  </div>

                  {/* Threshold Cukup */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Batas Cukup</span>
                      <span className="text-amber-600">≥ {thresholdCukup}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={thresholdAman - 1}
                      value={thresholdCukup}
                      onChange={(e) => setThresholdCukup(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-205 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Color Pickers */}
                  <div className="border-t border-slate-200/60 pt-3 space-y-2.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      Warna Legenda & Wilayah
                    </p>

                    {/* Color Aman */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-650">Zona Aman</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorAman}
                          onChange={(e) => setColorAman(e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded border border-slate-300 p-0"
                        />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{colorAman}</span>
                      </div>
                    </div>

                    {/* Color Cukup */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-655">Zona Cukup</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorCukup}
                          onChange={(e) => setColorCukup(e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded border border-slate-300 p-0"
                        />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{colorCukup}</span>
                      </div>
                    </div>

                    {/* Color Kritis */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-660">Zona Kritis</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorKritis}
                          onChange={(e) => setColorKritis(e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded border border-slate-300 p-0"
                        />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{colorKritis}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tampilan section ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  Tampilan
                </p>

                {/* Toggle marker pins */}
                <div
                  onClick={() => setShowMarkers((v) => !v)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-teal-50/50 hover:border-teal-100 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Tampilkan Pin Marker</p>
                      <p className="text-[10px] text-slate-400">Titik lokasi kejadian bencana</p>
                    </div>
                  </div>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showMarkers ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${showMarkers ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                </div>

                {/* Toggle basemap */}
                <div
                  onClick={() => setShowBaseMap((v) => !v)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-teal-50/50 hover:border-teal-100 transition-all mt-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Peta Dasar (OSM)</p>
                      <p className="text-[10px] text-slate-400">Tampilkan peta jalan & geografis</p>
                    </div>
                  </div>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showBaseMap ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${showBaseMap ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                </div>

                {/* Toggle GeoJSON boundary */}
                <div
                  onClick={() => setShowGeoJson((v) => !v)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-teal-50/50 hover:border-teal-100 transition-all mt-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Batas Administrasi</p>
                      <p className="text-[10px] text-slate-400">Layer GeoJSON kerawanan wilayah</p>
                    </div>
                  </div>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showGeoJson ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${showGeoJson ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                </div>

                {/* Toggle region legend visibility */}
                <div
                  onClick={() => setShowRegionLegend((v) => !v)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-teal-50/50 hover:border-teal-100 transition-all mt-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Info className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Legenda Wilayah</p>
                      <p className="text-[10px] text-slate-400">Keterangan warna jumlah kejadian</p>
                    </div>
                  </div>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showRegionLegend ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${showRegionLegend ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                </div>

                {/* Toggle casualty legend visibility */}
                <div
                  onClick={() => setShowCasualtyLegend((v) => !v)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-teal-50/50 hover:border-teal-100 transition-all mt-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Info className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Legenda Korban</p>
                      <p className="text-[10px] text-slate-400">Keterangan warna dampak korban</p>
                    </div>
                  </div>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showCasualtyLegend ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${showCasualtyLegend ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                </div>



              </div>

              {/* ── Filter & Kategori Section ── */}
              <div className={showMarkers ? "space-y-5 transition-opacity" : "space-y-5 opacity-40 pointer-events-none transition-opacity"}>
                {/* ── Status Evaluasi ── */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                    Status Evaluasi
                  </p>
                  <div className="space-y-2">
                    {/* Evaluasi Baik */}
                    <div
                      onClick={() => toggleCategory('1')}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 hover:bg-teal-50/40 hover:border-teal-100 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">Baik</span>
                        <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{categoryCounts.alam}</span>
                      </div>
                      <div
                        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${!excludedCategories.has('1') ? 'bg-teal-600' : 'bg-slate-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${!excludedCategories.has('1') ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </div>
                    </div>

                    {/* Evaluasi Sedang */}
                    <div
                      onClick={() => toggleCategory('2')}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 hover:bg-teal-50/40 hover:border-teal-100 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">Sedang</span>
                        <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{categoryCounts.nonAlam}</span>
                      </div>
                      <div
                        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${!excludedCategories.has('2') ? 'bg-teal-600' : 'bg-slate-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${!excludedCategories.has('2') ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </div>
                    </div>

                    {/* Evaluasi Kurang */}
                    <div
                      onClick={() => toggleCategory('3')}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 hover:bg-teal-50/40 hover:border-teal-100 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">Kurang</span>
                        <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{categoryCounts.sosial}</span>
                      </div>
                      <div
                        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${!excludedCategories.has('3') ? 'bg-teal-600' : 'bg-slate-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${!excludedCategories.has('3') ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Karakteristik Wilayah ── */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                    Karakteristik Wilayah
                  </p>
                  {disasterTypesBreakdown.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center">
                      <p className="text-[11px] text-slate-400 italic">Tidak ada karakteristik</p>
                    </div>
                  ) : (
                    <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1.5 border border-slate-100 rounded-xl bg-[#fcfdfd] p-2 shadow-inner">
                      {disasterTypesBreakdown.map((item) => {
                        const isChecked = !excludedTypes.has(item.name);
                        const isCategoryDisabled = excludedCategories.has(item.category);
                        const getCategoryLabel = (cat: string) => {
                          if (cat === '1') return 'Baik'
                          if (cat === '2') return 'Sedang'
                          return 'Kurang'
                        }
                        const getCategoryBadgeClass = (cat: string) => {
                          if (cat === '1') return 'bg-teal-50 text-teal-700 border-teal-150'
                          if (cat === '2') return 'bg-amber-50 text-amber-700 border-amber-150'
                          return 'bg-red-50 text-red-700 border-red-150'
                        }

                        return (
                          <div
                            key={item.name}
                            onClick={() => {
                              if (!isCategoryDisabled) toggleType(item.name);
                            }}
                            className={`flex cursor-pointer items-center justify-between py-1.5 px-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all ${isCategoryDisabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked && !isCategoryDisabled}
                                disabled={isCategoryDisabled}
                                onChange={() => { }} // handled by parent onClick
                                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700 truncate">{item.name}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${getCategoryBadgeClass(item.category)}`}>
                                {getCategoryLabel(item.category)}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-400">
                              {item.count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Panel footer */}
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] text-slate-400 text-center">
                SIPKK · Sistem Informasi PKK
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Marker Pin Popup ── */}
      {markerPopup && (
        <div
          className="absolute z-10 w-[295px] rounded-2xl border border-[#cbe3e2] bg-white/98 backdrop-blur-md shadow-[0_12px_40px_rgba(15,118,110,0.18)] transition-all duration-200"
          style={{
            left: Math.min(markerPopup.x + 10, (mapContainerRef.current?.offsetWidth || 800) - 310),
            top: Math.max(markerPopup.y - 10, 8),
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 p-3 pb-2.5">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-teal-700">
                <MapPin className="h-2.5 w-2.5" />
                Puskesmas
              </span>
              <h4 className="mt-1 text-[13px] font-extrabold uppercase text-[#1a3535] leading-tight">
                {markerPopup.data.jenis_bencana || 'Puskesmas'}
              </h4>
            </div>
            <button
              onClick={() => setMarkerPopup(null)}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info rows */}
          <div className="p-3 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Karakteristik</span>
              <span className="font-semibold text-slate-800">{markerPopup.data.karakteristik || 'Biasa'}</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Lokasi</span>
              <span className="font-semibold text-slate-800 leading-snug">
                {[markerPopup.data.kecamatan && `Kec. ${markerPopup.data.kecamatan}`, markerPopup.data.kabupaten].filter(Boolean).join(', ') || markerPopup.data.provinsi || '—'}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Layanan</span>
              <span className="font-semibold text-slate-800">{markerPopup.data.is_ranap ? 'Rawat Inap' : 'Non Rawat Inap'}</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Alkes Compl.</span>
              <span className="font-bold text-teal-700">{markerPopup.data.alkes_pct}%</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Obat Compl.</span>
              <span className="font-bold text-teal-700">{markerPopup.data.obat_pct}%</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Nakes Compl.</span>
              <span className="font-bold text-teal-700">{markerPopup.data.nakes_pct}%</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Evaluasi</span>
              <span
                className="font-extrabold"
                style={{ color: pinColor(markerPopup.data.status_evaluasi) }}
              >
                {markerPopup.data.status_evaluasi || 'Sedang'}
              </span>
            </div>
          </div>

          {/* Footer — Detail button */}
          {!isGuest && (
            <div className="border-t border-slate-100 p-2.5">
              <button
                onClick={() => {
                  // Buka modal detail (bisa dikembangkan lebih lanjut)
                  alert(`Detail kejadian: ${markerPopup.data.kode_trans}`)
                  // TODO: buka modal / drawer detail dengan kode_trans
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                LIHAT DETAIL
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Polygon Popup (existing: province / kabupaten click) ── */}
      {activePopup && (
        <div className="absolute right-5 top-14 z-10 w-[320px] max-h-[420px] flex flex-col rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] transition-all duration-300">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-3">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-teal-700">
                Detail {activePopup.type}
              </span>
              <h4 className="mt-1 text-sm font-extrabold uppercase tracking-wider text-[#1a3535] truncate">
                {activePopup.name}
              </h4>
            </div>
            <button
              onClick={() => setActivePopup(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isGuest ? (
            /* Guest restricted view */
            <div className="flex flex-col items-center py-5 text-center flex-1 justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 mb-3 border border-red-100">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Data Terkunci</h5>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
                Statistik kejadian dan detail korban wilayah ini tidak dapat diakses publik.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2">
                <a href="/login" className="flex w-full items-center justify-center rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white transition hover:bg-teal-800">
                  MASUK / LOGIN
                </a>
                <a href="/register" className="flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-50">
                  REGISTRASI MASYARAKAT
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Stats badges */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-teal-50/70 p-2 border border-teal-100/50">
                  <p className="text-[9px] font-bold text-teal-700/80 uppercase">Total Puskesmas</p>
                  <p className="text-lg font-extrabold text-teal-700">{activePopup.stats.totalEvents}</p>
                </div>
                <div className="rounded-xl bg-teal-50/70 p-2 border border-teal-100/50">
                  <p className="text-[9px] font-bold text-teal-700/80 uppercase">Rawat Inap</p>
                  <p className="text-lg font-extrabold text-teal-700">{activePopup.stats.totalKorban}</p>
                </div>
              </div>

              {/* Breakdown / events list */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[200px]">
                {activePopup.type === 'provinsi' ? (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Sebaran per Kab/Kota:</p>
                    {activePopup.stats.breakdown.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada data Puskesmas.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activePopup.stats.breakdown.map((item: any, idx) => (
                          <div key={idx} className="flex justify-between items-center rounded-lg bg-slate-50/50 p-2 text-xs border border-slate-100">
                            <span className="font-semibold text-slate-700 truncate max-w-[150px]">{item.name}</span>
                            <span className="font-extrabold text-teal-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                              {item.count} PKM ({item.ranapCount} Ranap)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Daftar Puskesmas:</p>
                    {!activePopup.stats.eventsList?.length ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada data Puskesmas.</p>
                    ) : (
                      <div className="space-y-2">
                        {activePopup.stats.eventsList.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/30 p-2.5 text-xs">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-teal-800">{item.jenis_bencana}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{item.is_ranap ? 'Rawat Inap' : 'Non Rawat Inap'}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {item.kecamatan && <span>Kec. {item.kecamatan}</span>}
                              {item.nama_desa && <span>, Desa {item.nama_desa}</span>}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-2 justify-between border-t border-dashed border-slate-200/60 pt-1.5 text-[10px] text-slate-500">
                              <span>Alkes: <b className="text-teal-700">{item.alkes_pct}%</b></span>
                              <span>Obat: <b className="text-teal-700">{item.obat_pct}%</b></span>
                              <span>Nakes: <b className="text-teal-700">{item.nakes_pct}%</b></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer action */}
              {activePopup.type === 'provinsi' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      onSelectProvinceRef.current?.(activePopup.name)
                      setActivePopup(null)
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
                  >
                    LIHAT DETAIL PROVINSI
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}



      {/* ── Legend (bottom-left) ── */}
      {(showRegionLegend || showCasualtyLegend) && (
        <div className="absolute bottom-5 left-5 max-w-[260px] rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(15,118,110,0.12)] space-y-3.5">
          {/* Choropleth legend */}
          {showRegionLegend && (
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#0f766e]">
                {mapViewMode === 'blud' ? 'Capaian BLUD (Tata Kelola)' : mapViewMode === 'ilp' ? 'Kesiapan ILP (Alkes)' : mapViewMode === 'pkp' ? 'Evaluasi PKP (SDM)' : 'Tata Kelola Baik (Gabungan)'}
              </p>
              <div className="space-y-1.5">
                {[
                  { label: `Aman (≥ ${thresholdAman}%)`, color: hexToRgbA(colorAman, 0.75) },
                  { label: `Cukup (${thresholdCukup}% - ${thresholdAman - 1}%)`, color: hexToRgbA(colorCukup, 0.75) },
                  { label: `Kritis (< ${thresholdCukup}%)`, color: hexToRgbA(colorKritis, 0.75) },
                  { label: 'Tidak Ada Data', color: 'rgba(241, 245, 249, 0.55)' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-200 shadow-sm" style={{ background: b.color }} />
                    <span className="text-[11px] font-medium text-slate-700">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {showRegionLegend && showCasualtyLegend && (
            <div className="h-px bg-slate-100" />
          )}

          {/* Pin Marker (Puskesmas Status) legend */}
          {showCasualtyLegend && (
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-teal-800">
                Status Evaluasi Puskesmas
              </p>
              <div className="space-y-1.5">
                {[
                  { label: 'Evaluasi Baik', color: '#10b981' },
                  { label: 'Evaluasi Sedang', color: '#f59e0b' },
                  { label: 'Evaluasi Kurang', color: '#ef4444' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-200 shadow-sm animate-pulse" style={{ background: b.color }} />
                    <span className="text-[11px] font-medium text-slate-700">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Hover Tooltip (Glassmorphism card) ── */}
      {hoverTooltip && (
        <div
          className="absolute z-30 pointer-events-none w-[250px] rounded-2xl border border-white/50 bg-white/70 backdrop-blur-md p-4 shadow-xl text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: Math.min(hoverTooltip.x + 15, (mapContainerRef.current?.offsetWidth || 800) - 265),
            top: Math.min(hoverTooltip.y + 15, (mapContainerRef.current?.offsetHeight || 500) - 150),
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-900/10 pb-1.5 mb-2">
            <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider truncate max-w-[170px]">
              {hoverTooltip.name}
            </h5>
            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-teal-50/70 border border-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full shrink-0">
              {hoverTooltip.type}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
            {hoverTooltip.type === 'marker' ? (
              <>
                <div className="flex justify-between">
                  <span>Layanan</span>
                  <span className="font-bold text-slate-950">{hoverTooltip.statusDokter}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {mapViewMode === 'blud' ? 'Status BLUD' : mapViewMode === 'ilp' ? 'Kesiapan ILP' : mapViewMode === 'pkp' ? 'Evaluasi PKP' : 'Tata Kelola (Gabungan)'}
                  </span>
                  <span className="font-bold text-teal-800">
                    {mapViewMode === 'blud' 
                      ? (hoverTooltip.capaianIlp >= 80 ? 'Baik' : hoverTooltip.capaianIlp >= 40 ? 'Sedang' : 'Kurang')
                      : `${hoverTooltip.capaianIlp}%`
                    }
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Total Puskesmas</span>
                  <span className="font-bold text-slate-900">{hoverTooltip.totalPuskesmas} PKM</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {mapViewMode === 'blud' ? 'Capaian BLUD (Rata-rata)' : mapViewMode === 'ilp' ? 'Rata-rata ILP' : mapViewMode === 'pkp' ? 'Kelengkapan PKP' : 'Tata Kelola Gabungan'}
                  </span>
                  <span className="font-bold text-teal-850">{hoverTooltip.capaianIlp}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status Wilayah</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider"
                    style={{
                      backgroundColor: hoverTooltip.capaianIlp >= thresholdAman
                        ? hexToRgbA(colorAman, 0.15)
                        : hoverTooltip.capaianIlp >= thresholdCukup
                        ? hexToRgbA(colorCukup, 0.15)
                        : hexToRgbA(colorKritis, 0.15),
                      color: hoverTooltip.capaianIlp >= thresholdAman
                        ? colorAman
                        : hoverTooltip.capaianIlp >= thresholdCukup
                        ? colorCukup
                        : colorKritis,
                      border: `1px solid ${
                        hoverTooltip.capaianIlp >= thresholdAman
                          ? colorAman
                          : hoverTooltip.capaianIlp >= thresholdCukup
                          ? colorCukup
                          : colorKritis
                      }`
                    }}
                  >
                    {hoverTooltip.capaianIlp >= thresholdAman ? 'Aman' : hoverTooltip.capaianIlp >= thresholdCukup ? 'Cukup' : 'Kritis'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
