'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Activity,
  AlertTriangle,
  Flame,
  Heart,
  HeartPulse,
  HelpCircle,
  Loader2,
  RefreshCw,
  Users,
  ShieldAlert,
  Sparkles,
  MapPin,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Info,
  ShieldCheck,
  Grid,
  Calendar,
  Building2,
  Stethoscope,
  Pill,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { useAuthStore } from '@/lib/authStore'
import FilterDropdownBar, { type FilterSummary } from '@/components/landing/FilterDropdownBar'
import { getPuskesmasStats, type PuskesmasDashboardData } from '@/lib/puskesmasData'
import PerformanceBreakdownTable from './PerformanceBreakdownTable'

// Dynamically import map component to completely bypass SSR/window issues in Next.js
const DisasterMap = dynamic(() => import('./DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl bg-slate-100/50 backdrop-blur-sm border border-slate-200">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-700" />
        <p className="text-sm text-slate-500 font-semibold">Memuat peta interaktif...</p>
      </div>
    </div>
  ),
})

const COLORS = ['#0f8f96', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#f43f5e', '#eab308']
const CATEGORY_COLORS = ['#10b981', '#0ea5e9', '#6366f1']




export default function DashboardKejadianPage() {
  const { token, isInitialized, user } = useAuthStore()

  const [data, setData] = useState<PuskesmasDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  // Primitive string states to avoid reference comparison bugs causing infinite loops
  const [cakupan, setCakupan] = useState('nasional')
  const [province, setProvince] = useState('')
  const [kabupaten, setKabupaten] = useState('')

  // State untuk pencarian wilayah pintar
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced region search API call
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    const handler = setTimeout(async () => {
      setIsSearching(true)
      try {
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`/api/regions-search?q=${encodeURIComponent(searchQuery)}`, { headers })
        const json = await res.json()
        if (json?.success && Array.isArray(json?.data)) {
          setSuggestions(json.data)
        }
      } catch (err) {
        console.error('Error searching regions:', err)
      } finally {
        setIsSearching(false)
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(handler)
  }, [searchQuery, token])

  const handleSelectSuggestion = useCallback((sug: any) => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)

    // Tangkap data dan filter wilayahnya kesitu
    setProvince(sug.province_name)
    if (sug.type === 'provinsi') {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setKabupaten(sug.kabupaten_name)
      setCakupan('kabupaten')
    }
  }, [])

  const getDynamicTrend = useCallback((cardLabel: string) => {
    const hash = cardLabel.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const value = `${(0.8 + (hash % 12) / 10).toFixed(1).replace('.', ',')}%`
    const isUp = hash % 2 === 0
    const labelLower = cardLabel.toLowerCase()
    
    let isGood = isUp
    // For unserved kecamatan and workload, an increase is BAD (not good)
    if (labelLower.includes('kec.') || labelLower.includes('beban')) {
      isGood = !isUp
    }
    
    return {
      value,
      isUp,
      isGood,
      label: 'dari tahun sebelumnya',
    }
  }, [])

  const isDbEmpty = !data || data.total_puskesmas === 0

  const statusLayananData = useMemo(() => {
    if (!data) return []
    return [
      { nama: 'Rawat Inap', jumlah: data.ranap_count },
      { nama: 'Non Rawat Inap', jumlah: data.non_ranap_count },
    ]
  }, [data])

  const karakteristikData = useMemo(() => {
    if (!data) return []
    return [
      { nama: 'Biasa', jumlah: data.biasa_count },
      { nama: 'Terpencil', jumlah: data.terpencil_count },
      { nama: 'Sangat Terpencil', jumlah: data.sangat_terpencil_count },
    ]
  }, [data])

  const kepatuhanData = useMemo(() => {
    if (!data) return []
    return [
      { nama: 'Kepatuhan Alkes', jumlah: data.alkes_60_pct },
      { nama: 'Kepatuhan Obat', jumlah: data.obat_40_pct },
      { nama: 'Kepatuhan Nakes', jumlah: data.nakes_lengkap_pct },
    ]
  }, [data])

  const statusEvaluasiData = useMemo(() => {
    if (!data?.markers) return []
    let baik = data.markers.filter(m => m.status_evaluasi === 'Baik').length
    let sedang = data.markers.filter(m => m.status_evaluasi === 'Sedang').length
    let kurang = data.markers.filter(m => m.status_evaluasi === 'Kurang').length
    return [
      { nama: 'Baik', jumlah: baik },
      { nama: 'Sedang', jumlah: sedang },
      { nama: 'Kurang', jumlah: kurang },
    ]
  }, [data])

  // State for dynamic filters
  const [selectedKategori, setSelectedKategori] = useState<'all' | 'ranap' | 'non-ranap'>('all')
  const [selectedKarakteristik, setSelectedKarakteristik] = useState<string[]>([])
  const [showKarakteristikDropdown, setShowKarakteristikDropdown] = useState(false)

  const filteredMarkers = useMemo(() => {
    if (!data?.markers) return []

    return data.markers.filter((m) => {
      // 1. Filter by Kategori Layanan
      if (selectedKategori === 'ranap' && !m.is_ranap) return false
      if (selectedKategori === 'non-ranap' && m.is_ranap) return false

      // 2. Filter by Karakteristik Wilayah
      if (selectedKarakteristik.length > 0) {
        const match = selectedKarakteristik.some((tag) => {
          if (tag === 'Terpencil (T)' && m.karakteristik === 'Terpencil') return true
          if (tag === 'Sangat Terpencil (ST)' && m.karakteristik === 'Sangat Terpencil') return true
          if (tag === 'Pedesaan' && (m.karakteristik === 'Terpencil' || m.karakteristik === 'Sangat Terpencil')) return true
          if (tag === 'Perkotaan' && m.karakteristik === 'Biasa') return true
          return false
        })
        if (!match) return false
      }

      return true
    })
  }, [data?.markers, selectedKategori, selectedKarakteristik])

  const stats = useMemo(() => {
    if (!data) return { pctBaik: 0, total: 0, avgAlkes: 0, avgObat: 0, obatJenis: 0 }
    const markers = filteredMarkers
    const total = markers.length
    
    const baikCount = markers.filter(m => m.status_evaluasi === 'Baik').length
    const pctBaik = total > 0 ? Math.round((baikCount / total) * 100) : 0
    
    const sumAlkes = markers.reduce((sum, m) => sum + m.alkes_pct, 0)
    const avgAlkes = total > 0 ? Math.round(sumAlkes / total) : 0
    
    const sumObat = markers.reduce((sum, m) => sum + m.obat_pct, 0)
    const avgObat = total > 0 ? Math.round(sumObat / total) : 0
    const obatJenis = Math.round(40 * (avgObat / 100))
    
    return { pctBaik, total, avgAlkes, avgObat, obatJenis }
  }, [data, filteredMarkers])

  const growthData = useMemo(() => {
    const total = filteredMarkers.length
    return [
      { year: '2021', jumlah: Math.round(total * 0.80) },
      { year: '2022', jumlah: Math.round(total * 0.85) },
      { year: '2023', jumlah: Math.round(total * 0.88) },
      { year: '2024', jumlah: Math.round(total * 0.92) },
      { year: '2025', jumlah: Math.round(total * 0.96) },
      { year: '2026', jumlah: total },
    ]
  }, [filteredMarkers])

  const donutData = useMemo(() => {
    const total = filteredMarkers.length
    const sudah = filteredMarkers.filter(m => m.nakes_pct >= 80).length
    const belum = total - sudah
    
    return [
      { name: 'Sudah Lengkap 9 Nakes', value: sudah, pct: total > 0 ? Math.round((sudah / total) * 100) : 0 },
      { name: 'Belum Lengkap', value: belum, pct: total > 0 ? Math.round((belum / total) * 100) : 0 }
    ]
  }, [filteredMarkers])

  const matrixData = useMemo(() => {
    if (filteredMarkers.length === 0) {
      return { beban: 0, rasioDokter: 0, rasioNakes: 0 }
    }
    
    let totalPop = 0
    let totalDokter = 0
    let totalNakes = 0
    
    filteredMarkers.forEach((m) => {
      const shortName = m.jenis_bencana.replace('Puskesmas ', '')
      let pop = 24000
      if (m.karakteristik === 'Terpencil') pop = 14000
      else if (m.karakteristik === 'Sangat Terpencil') pop = 6000
      pop += (shortName.length % 5) * 1500 - 3000
      
      const numDokter = m.nakes_pct >= 90 ? 3 : m.nakes_pct >= 75 ? 2 : 1
      const numNakes = m.nakes_pct >= 90 ? 28 : m.nakes_pct >= 75 ? 20 : 12
      
      totalPop += pop
      totalDokter += numDokter
      totalNakes += numNakes
    })
    
    const count = filteredMarkers.length
    const avgBeban = Math.round(totalPop / count)
    const avgRasioDokter = Math.round(totalPop / totalDokter)
    const avgRasioNakes = Math.round(totalPop / totalNakes)
    
    return {
      beban: avgBeban,
      rasioDokter: avgRasioDokter,
      rasioNakes: avgRasioNakes
    }
  }, [filteredMarkers])

  const topDiseasesData = useMemo(() => {
    const baseDiseases = [
      { name: 'ISPA', pct: 28 },
      { name: 'Hipertensi', pct: 18 },
      { name: 'Gastritis', pct: 12 },
      { name: 'Diabetes Melitus', pct: 9 },
      { name: 'Influenza', pct: 8 },
      { name: 'Dermatitis', pct: 7 },
      { name: 'Diare', pct: 6 },
      { name: 'Asma', pct: 5 },
      { name: 'TBC Paru', pct: 4 },
      { name: 'Penyakit Gigi', pct: 3 },
    ];
    
    const scaleFactor = stats.total > 0 ? stats.total * 185 : 100;
    return baseDiseases.map(d => ({
      name: d.name,
      persentase: d.pct,
      kasus: Math.round((d.pct / 100) * scaleFactor),
    }));
  }, [stats.total]);

  const sdmWorkloadData = useMemo(() => {
    if (!data?.markers) return [];
    const markers = filteredMarkers;
    
    // 1. Calculate workload components for each marker
    const markersWithStaff = markers.map(m => {
      const shortName = m.jenis_bencana.replace('Puskesmas ', '');
      
      let basePop = 24000;
      if (m.karakteristik === 'Terpencil') basePop = 14000;
      else if (m.karakteristik === 'Sangat Terpencil') basePop = 6000;
      
      basePop += (shortName.length % 5) * 1500 - 3000;
      
      let standardStaff = 20;
      if (m.karakteristik === 'Terpencil') standardStaff = 12;
      else if (m.karakteristik === 'Sangat Terpencil') standardStaff = 8;
      
      const actualStaff = Math.max(2, Math.round(standardStaff * (m.nakes_pct / 100)));
      
      return {
        ...m,
        shortName,
        basePop,
        actualStaff
      };
    });

    // 2. Aggregate based on active scope
    if (cakupan === 'nasional') {
      const groups = new Map<string, { pop: number; staff: number }>();
      markersWithStaff.forEach(m => {
        const key = m.provinsi.toUpperCase();
        const existing = groups.get(key) || { pop: 0, staff: 0 };
        existing.pop += m.basePop;
        existing.staff += m.actualStaff;
        groups.set(key, existing);
      });

      return Array.from(groups.entries()).map(([provName, stats]) => ({
        name: provName,
        beban: Math.round(stats.pop / stats.staff),
      }));
    } else if (cakupan === 'provinsi') {
      const groups = new Map<string, { pop: number; staff: number }>();
      markersWithStaff.forEach(m => {
        const key = m.kabupaten.toUpperCase();
        const existing = groups.get(key) || { pop: 0, staff: 0 };
        existing.pop += m.basePop;
        existing.staff += m.actualStaff;
        groups.set(key, existing);
      });

      return Array.from(groups.entries()).map(([kabName, stats]) => ({
        name: kabName,
        beban: Math.round(stats.pop / stats.staff),
      }));
    } else {
      return markersWithStaff.map(m => ({
        name: m.shortName,
        beban: Math.round(m.basePop / m.actualStaff),
      }));
    }
  }, [data, filteredMarkers, cakupan]);

  const kategoriPerformanceData = useMemo(() => {
    if (!data?.markers) return [];
    const markers = filteredMarkers;
    
    const allCategories = [
      { id: 'ranap', name: 'Ranap', filter: (m: typeof data.markers[0]) => m.is_ranap },
      { id: 'non-ranap', name: 'Non-Ranap', filter: (m: typeof data.markers[0]) => !m.is_ranap },
      { id: 'biasa', name: 'Perkotaan', filter: (m: typeof data.markers[0]) => m.karakteristik === 'Biasa' },
      { id: 'terpencil', name: 'Terpencil (T)', filter: (m: typeof data.markers[0]) => m.karakteristik === 'Terpencil' },
      { id: 'sangat-terpencil', name: 'Sangat Terpencil (ST)', filter: (m: typeof data.markers[0]) => m.karakteristik === 'Sangat Terpencil' },
    ];

    const activeCategories = allCategories.filter((cat) => {
      // 1. Kategori Layanan filter check
      if (selectedKategori === 'ranap' && cat.id === 'non-ranap') return false;
      if (selectedKategori === 'non-ranap' && cat.id === 'ranap') return false;

      // 2. Karakteristik Wilayah filter check
      if (selectedKarakteristik.length > 0) {
        const hasBiasa = selectedKarakteristik.includes('Perkotaan');
        const hasTerpencil = selectedKarakteristik.includes('Terpencil (T)') || selectedKarakteristik.includes('Pedesaan');
        const hasSangatTerpencil = selectedKarakteristik.includes('Sangat Terpencil (ST)') || selectedKarakteristik.includes('Pedesaan');

        if (cat.id === 'biasa' && !hasBiasa) return false;
        if (cat.id === 'terpencil' && !hasTerpencil) return false;
        if (cat.id === 'sangat-terpencil' && !hasSangatTerpencil) return false;
      }

      return true;
    });

    return activeCategories.map(cat => {
      const items = markers.filter(cat.filter);
      const count = items.length;
      
      if (count === 0) {
        return {
          category: cat.name,
          'Tata Kelola': 0,
          'Kesiapan Alkes': 0,
          'Ketersediaan Obat': 0,
        };
      }
      
      const baikCount = items.filter(m => m.status_evaluasi === 'Baik').length;
      const avgTataKelola = Math.round((baikCount / count) * 100);
      
      const sumAlkes = items.reduce((sum, m) => sum + m.alkes_pct, 0);
      const avgAlkes = Math.round(sumAlkes / count);
      
      const sumObat = items.reduce((sum, m) => sum + m.obat_pct, 0);
      const avgObat = Math.round(sumObat / count);
      
      return {
        category: cat.name,
        'Tata Kelola': avgTataKelola,
        'Kesiapan Alkes': avgAlkes,
        'Ketersediaan Obat': avgObat,
      };
    });
  }, [data, filteredMarkers, selectedKategori, selectedKarakteristik]);

  const kecamatanList = useMemo(() => {
    if (!data) return []
    // Get unique kecamatan from markers that have a Puskesmas
    const activeKecSet = new Set(data.markers.map(m => m.kecamatan))
    
    // Define all kecamatan names for each kabupaten in Gorontalo
    const kabs = [
      {
        nama: 'KOTA GORONTALO METRO',
        kecamatans: ['Dungingi', 'Kota Selatan', 'Kota Utara', 'Hulonthalangi', 'Dumbo Raya', 'Sipatana', 'Kota Tengah', 'Kota Timur', 'Pilolodaa']
      },
      {
        nama: 'KAB. GORONTALO TIMUR',
        kecamatans: ['Kabila', 'Suwawa', 'Tapa', 'Bonepantai', 'Pinogu', 'Botupingge', 'Bulango Timur', 'Suwawa Tengah']
      },
      {
        nama: 'KAB. GORONTALO UTARA',
        kecamatans: ['Limboto', 'Telaga', 'Boliyohuto', 'Batudaa', 'Asparaga', 'Bilato', 'Limboto Barat', 'Telaga Biru']
      },
      {
        nama: 'KAB. GORONTALO SELATAN',
        kecamatans: ['Tilamuta', 'Paguyaman', 'Dulupi', 'Mananggu', 'Wonosari', 'Botumoito', 'Paguyaman Pantai']
      },
      {
        nama: 'KAB. GORONTALO BARAT',
        kecamatans: ['Marisa', 'Paguat', 'Randangan', 'Popayato', 'Wanggarasi', 'Taluditi', 'Buntulia', 'Duhiadaa']
      }
    ]

    // If a specific kabupaten is selected
    let targetKabs = kabs
    if (kabupaten) {
      targetKabs = kabs.filter(k => k.nama.toUpperCase() === kabupaten.toUpperCase())
    }

    const list: { nama: string; kabupaten: string; status: 'Ada' | 'Tidak Ada'; detail: string }[] = []
    
    targetKabs.forEach(k => {
      k.kecamatans.forEach(kec => {
        const hasPkm = activeKecSet.has(kec) || data.markers.some(m => m.kecamatan.toLowerCase() === kec.toLowerCase())
        list.push({
          nama: kec,
          kabupaten: k.nama,
          status: hasPkm ? 'Ada' : 'Tidak Ada',
          detail: hasPkm 
            ? `Terlayani oleh Puskesmas di Kec. ${kec}` 
            : `Rekomendasi pembangunan Puskesmas Baru / Pustu Keliling`
        })
      })
    })

    return list
  }, [data, kabupaten])


  const isProvLocked = user?.wilayah_scope?.mode === 'provinsi'
  const isKabLocked = user?.wilayah_scope?.mode === 'kabupaten'

  // Sync state with user's locked scope on init
  useEffect(() => {
    if (isInitialized && user?.wilayah_scope) {
      const scope = user.wilayah_scope
      if (scope.mode === 'kabupaten') {
        setCakupan('kabupaten')
        setProvince(scope.provinsi.label || '')
        setKabupaten(scope.kabupaten.label || '')
      } else if (scope.mode === 'provinsi') {
        setCakupan('provinsi')
        setProvince(scope.provinsi.label || '')
        setKabupaten('')
      }
    }
  }, [isInitialized, user])

  // When should the reset button show?
  const showResetButton = useMemo(() => {
    if (isKabLocked) return false
    if (isProvLocked) return kabupaten !== ''
    return province !== ''
  }, [isKabLocked, isProvLocked, province, kabupaten])

  const handleResetFilter = () => {
    if (isProvLocked && user?.wilayah_scope?.provinsi?.label) {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setProvince('')
      setKabupaten('')
      setCakupan('nasional')
    }
  }

  const getResetButtonLabel = () => {
    if (isProvLocked) return 'Reset Filter Provinsi'
    return 'Reset Filter Nasional'
  }

  const activeUserScope = useMemo(() => {
    if (province || kabupaten) {
      if (kabupaten) {
        return {
          mode: 'kabupaten',
          provinsi: { label: province },
          kabupaten: { label: kabupaten },
        }
      }
      return {
        mode: 'provinsi',
        provinsi: { label: province },
      }
    }
    return user?.wilayah_scope
  }, [province, kabupaten, user])

  const getRegionLabel = useCallback(() => {
    if (kabupaten) {
      return `${kabupaten.toUpperCase()}, PROV. ${province.toUpperCase()}`
    }
    if (province) {
      return `PROV. ${province.toUpperCase()}`
    }
    return cakupan.toUpperCase()
  }, [province, kabupaten, cakupan])

  useEffect(() => {
    const label = getRegionLabel()
    window.dispatchEvent(new CustomEvent('sipkk-region-changed', { detail: label }))
  }, [getRegionLabel])

  const getWilayahChartInfo = () => {
    if (kabupaten) {
      return {
        title: `SEBARAN KRISIS PER KECAMATAN - ${getRegionLabel()}`,
        desc: `Distribusi kejadian bencana pada tingkat kecamatan di wilayah ${getRegionLabel()}.`
      }
    }
    if (province) {
      return {
        title: `DAERAH RAWAN KRISIS (PER KAB/KOTA) - ${getRegionLabel()}`,
        desc: `Distribusi kejadian bencana pada kabupaten/kota di wilayah ${getRegionLabel()}.`
      }
    }
    return {
      title: `DAERAH RAWAN KRISIS (PER PROVINSI) - ${getRegionLabel()}`,
      desc: `Distribusi kejadian bencana pada provinsi terdampak di wilayah ${getRegionLabel()}.`
    }
  }

  const handleSummaryChange = useCallback((summary: FilterSummary) => {
    const prov = summary.provinsi !== 'SEMUA PROVINSI' ? summary.provinsi : ''
    const kab = summary.kabkota !== 'SEMUA KAB/KOTA' ? summary.kabkota : ''
    const cak = summary.cakupan.toLowerCase()

    setCakupan(cak)
    setProvince(prov)
    setKabupaten(kab)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Resolve statistics locally from our mock dataset matching filters
      const res = getPuskesmasStats(province, kabupaten)
      setData(res)
    } catch (err) {
      console.error('[puskesmas-stats]', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }, [province, kabupaten])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleRefresh = () => {
      fetchData()
    }
    window.addEventListener('sipkk-refresh-data', handleRefresh)
    return () => {
      window.removeEventListener('sipkk-refresh-data', handleRefresh)
    }
  }, [fetchData])


  const generateAiInsight = () => {
    if (!data) return
    setGeneratingAi(true)
    setTimeout(() => {
      if (data.total_puskesmas === 0) {
        setAiInsight(`[ANALISIS KINERJA PUSKESMAS]
Tidak ada data sarana prasarana kesehatan terdaftar untuk wilayah ini.`)
        setGeneratingAi(false)
        return
      }

      const totalPkm = data.total_puskesmas
      const ranapPkm = data.ranap_count
      const nakesPct = data.nakes_lengkap_pct
      const alkesPct = data.alkes_60_pct
      const obatPct = data.obat_40_pct

      let analysisText = `[ANALISIS KINERJA PUSKESMAS]`
      analysisText += `\nDi wilayah ${getRegionLabel()}, tercatat sebanyak ${totalPkm} Puskesmas (${ranapPkm} dengan kapasitas Rawat Inap).`
      analysisText += `\n\nIndikator Pemenuhan Standard Kesehatan:`
      analysisText += `\n- Kepatuhan Standard 9 Jenis Nakes: ${nakesPct}% Puskesmas lengkap.`
      analysisText += `\n- Kepatuhan Standard Alkes (≥60%): ${alkesPct}% Puskesmas memenuhi.`
      analysisText += `\n- Kepatuhan Ketersediaan Obat (≥40%): ${obatPct}% Puskesmas memenuhi.`
      
      let recommendations = `\n\nREKOMENDASI INTERVENSI DIREKTORAT:`
      if (alkesPct < 85) {
        recommendations += `\n1. Percepat distribusi alkes standard dan kalibrasi alat di Puskesmas Terpencil yang berada di bawah ambang kelayakan.`
      }
      if (nakesPct < 90) {
        recommendations += `\n2. Buka formasi penempatan nakes khusus (Dokter Gigi, Nutrisionis, Sanitarian) untuk memenuhi 9 jenis nakes wajib.`
      }
      if (obatPct < 95) {
        recommendations += `\n3. Lakukan pengawasan berkala rantai dingin farmasi (cold chain supply) untuk vaksin dan obat esensial.`
      }
      if (recommendations === `\n\nREKOMENDASI INTERVENSI DIREKTORAT:`) {
        recommendations += `\n1. Kinerja fasilitas kesehatan di wilayah terpilih sangat prima. Pertahankan koordinasi surveillance berkala.`
      }

      setAiInsight(analysisText + recommendations)
      setGeneratingAi(false)
    }, 1250)
  }

  // Pre-generate AI insight once data is loaded
  useEffect(() => {
    if (data && !aiInsight) {
      generateAiInsight()
    }
  }, [data])

  if (!isInitialized) {
    return (
      <div className="flex min-h-[500px] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-700" />
          <p className="text-slate-600 font-bold uppercase tracking-wider text-sm">Sedang sinkronisasi data...</p>
        </div>
      </div>
    )
  }

  if (!loading && (error || !data)) {
    return (
      <div className="mx-auto my-8 max-w-[520px] rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-3 text-lg font-bold text-slate-900">Gagal Memuat Data</h3>
        <p className="mt-2 text-sm text-slate-600">{error || 'Gagal memuat data statistik bencana.'}</p>
        <button
          onClick={() => fetchData()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    )
  }

  const getCardValue = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0'
    return val.toLocaleString('id-ID')
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff]">
      {/* Smart Search, Info Filter & Reset Button Grid */}
      <section className="grid grid-cols-1 md:grid-cols-[10fr_8fr_2fr] gap-4 w-full items-end z-20 relative">

        {/* Column 1: Smart Search Bar */}
        <div className="relative w-full z-20">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
            Pencarian Wilayah
          </p>
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Cari Provinsi, Kab/Kota, Kecamatan, atau Desa..."
              className="w-full rounded-2xl border border-slate-200 bg-white h-12 pl-11 pr-10 text-sm font-medium shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
            {isSearching ? (
              <Loader2 className="absolute right-4 h-4 w-4 animate-spin text-teal-600" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSuggestions([])
                }}
                type="button"
                className="absolute right-4 rounded-lg p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Dropdown Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <>
              {/* Backdrop to close dropdown on outer click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSuggestions(false)}
              />

              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[320px] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                {suggestions.map((sug, idx) => {
                  let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200'
                  if (sug.type === 'provinsi') badgeClass = 'bg-teal-50 text-teal-700 border-teal-150'
                  if (sug.type === 'kabupaten') badgeClass = 'bg-blue-50 text-blue-700 border-blue-150'
                  if (sug.type === 'kecamatan') badgeClass = 'bg-purple-50 text-purple-700 border-purple-150'
                  if (sug.type === 'desa') badgeClass = 'bg-amber-50 text-amber-700 border-amber-150'

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-teal-50/50 transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 truncate">{sug.label}</span>
                      <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                        {sug.type}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {showSuggestions && searchQuery.trim().length >= 2 && !isSearching && suggestions.length === 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                <p className="text-xs text-slate-400 italic">Tidak ditemukan wilayah dengan kata kunci "{searchQuery}"</p>
              </div>
            </>
          )}
        </div>

        {/* Column 2: Info Filter Panel */}
        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
            Info Filter Aktif
          </p>
          <div className="flex items-center rounded-2xl border border-teal-100 bg-[#f6fffd] px-4 text-xs shadow-[0_6px_18px_rgba(20,120,116,0.04)] h-auto md:h-12 py-3 md:py-0 w-full">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-600 font-semibold w-full">

              <span className="hidden h-4 w-px bg-teal-200 sm:inline-block" aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Cakupan:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{cakupan}</span>
                </span>
                <span className="text-teal-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Provinsi:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{province || 'Semua Provinsi'}</span>
                </span>
                <span className="text-teal-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Kab/Kota:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{kabupaten || 'Semua Kab/Kota'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Reset Filter Button */}
        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] md:invisible">
            Aksi
          </p>
          <button
            onClick={handleResetFilter}
            disabled={!showResetButton}
            title="Reset Filter"
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-extrabold shadow-sm transition-all outline-none h-12 uppercase tracking-wider ${
              showResetButton
                ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:-translate-y-0.5 active:scale-95'
                : 'border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span>RESET FILTER</span>
          </button>
        </div>
      </section>

      {/* ── Unified Dynamic Filter Card ── */}
      <section className="w-full bg-[#fbffff] pt-2 pb-4">
        <article
          className="border border-[#cdcdcd] bg-white shadow-[0_10px_30px_rgba(15,118,110,0.04)] w-full overflow-visible"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          {/* Card Body: Filter Controls in a responsive 3-column Grid (60% / 20% / 20%) */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr_1fr] items-start gap-6 px-6 py-5">
            {/* Grid 1: Filter Wilayah (60% width on lg) */}
            <div className="w-full">
              <FilterDropdownBar
                onSummaryChange={handleSummaryChange}
                selectedProvinceName={province}
                selectedKabupatenName={kabupaten}
                showLabel={true}
              />
            </div>

            {/* Grid 2: Segmented Control — Kategori Layanan (20% width on lg) */}
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em] mb-1.5">Kategori Layanan</span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 w-full">
                {[
                  { id: 'all' as const, label: 'Semua' },
                  { id: 'ranap' as const, label: 'Ranap' },
                  { id: 'non-ranap' as const, label: 'Non-Ranap' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedKategori(opt.id)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                      selectedKategori === opt.id
                        ? 'bg-[#047D78] text-white shadow-[0_2px_8px_rgba(4,125,120,0.30)]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid 3: Multi-Select Dropdown — Karakteristik Wilayah (20% width on lg) */}
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em] mb-1.5">Karakteristik Wilayah</span>
              <div className="relative w-full">
                <button
                  onClick={() => setShowKarakteristikDropdown(!showKarakteristikDropdown)}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-bold outline-none transition-all w-full ${
                    selectedKarakteristik.length > 0
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">
                    {selectedKarakteristik.length === 0
                      ? 'Semua Karakteristik'
                      : selectedKarakteristik.length === 1
                        ? selectedKarakteristik[0]
                        : `${selectedKarakteristik.length} Terpilih`}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${showKarakteristikDropdown ? 'rotate-180' : ''} ${selectedKarakteristik.length > 0 ? 'text-indigo-400' : 'text-slate-400'}`} />
                </button>

                {showKarakteristikDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowKarakteristikDropdown(false)}
                    />
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-full min-w-[200px] overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                      <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pilih Karakteristik</p>
                      {['Terpencil (T)', 'Sangat Terpencil (ST)', 'Pedesaan', 'Perkotaan'].map((tag) => {
                        const isChecked = selectedKarakteristik.includes(tag)
                        return (
                          <label
                            key={tag}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer select-none transition-colors ${
                              isChecked ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedKarakteristik((prev) =>
                                  isChecked
                                    ? prev.filter((t) => t !== tag)
                                    : [...prev, tag]
                                )
                              }}
                              className="rounded w-4 h-4 accent-[#047D78]"
                            />
                            <span>{tag}</span>
                            {isChecked && <span className="ml-auto text-indigo-500 font-bold">✓</span>}
                          </label>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </article>
      </section>

      {/* Executive Summary Header - 5 KPI Scorecards (including Alert Card) */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 w-full">
        {/* Card 1: Governance */}
        <article
          onClick={() => setSelectedCard('tata_kelola')}
          className="flex items-center justify-between p-6 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.07)] transition-all active:scale-[0.98] min-h-[160px] h-full"
        >
          {/* Left section: Icon + Text Stack */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {/* Circular Icon Badge */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-50 border border-teal-100 text-teal-600 shadow-inner">
              <ShieldCheck className="h-8 w-8" />
            </div>
            
            {/* Text Stack */}
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-xs sm:text-[13px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                % Puskesmas Tata Kelola Baik
              </span>
              <span className="text-5xl font-black text-slate-800 tracking-tight leading-none py-1">
                {loading ? '...' : `${stats.pctBaik}%`}
              </span>
              <p className="text-xs sm:text-[13px] text-slate-500 font-semibold truncate">
                Target Nasional: <span className="text-slate-800 font-bold">80%</span>
              </p>
            </div>
          </div>

          {/* Right section: Circle Progress Ring */}
          <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="24"
                cx="32"
                cy="32"
              />
              <circle
                className="text-teal-650 transition-all duration-500 ease-in-out"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - (loading ? 0 : stats.pctBaik) / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="24"
                cx="32"
                cy="32"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800">
              {loading ? '...' : `${stats.pctBaik}%`}
            </span>
          </div>
        </article>

        {/* Card 2: Total Facilities */}
        <article
          onClick={() => setSelectedCard('jumlah')}
          className="flex items-center justify-between p-6 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.07)] transition-all active:scale-[0.98] min-h-[160px] h-full"
        >
          {/* Left section: Icon + Text Stack */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {/* Circular Icon Badge */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-100 text-amber-600 shadow-inner">
              <Building2 className="h-8 w-8" />
            </div>
            
            {/* Text Stack */}
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-xs sm:text-[13px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                Total Puskesmas Terdata
              </span>
              <span className="text-5xl font-black text-slate-800 tracking-tight leading-none py-1">
                {loading ? '...' : stats.total.toLocaleString('id-ID')}
              </span>
              <p className="text-xs sm:text-[13px] text-[#00B0AA] font-bold flex items-center gap-0.5 truncate">
                <ChevronUp className="h-4 w-4 shrink-0" />
                <span>2,1% dari bulan sebelumnya</span>
              </p>
            </div>
          </div>

          {/* Right section: Green Trend Badge */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-50 border border-teal-100 text-teal-600 shadow-sm">
            <TrendingUp className="h-8 w-8" />
          </div>
        </article>

        {/* Card 3: Medical Equipment Readiness */}
        <article
          onClick={() => setSelectedCard('alkes')}
          className="flex items-center justify-between p-6 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.07)] transition-all active:scale-[0.98] min-h-[160px] h-full"
        >
          {/* Left section: Icon + Text Stack */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {/* Circular Icon Badge */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-inner">
              <Stethoscope className="h-8 w-8" />
            </div>
            
            {/* Text Stack */}
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-xs sm:text-[13px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                Rata-rata Ketersediaan Alkes
              </span>
              <span className="text-5xl font-black text-slate-800 tracking-tight leading-none py-1">
                {loading ? '...' : `${stats.avgAlkes}%`}
              </span>
              <p className="text-xs sm:text-[13px] text-slate-500 font-semibold truncate">
                Target Kesiapan: <span className="text-slate-800 font-bold">60%</span>
              </p>
            </div>
          </div>

          {/* Right section: Circle Progress Ring */}
          <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="24"
                cx="32"
                cy="32"
              />
              <circle
                className="text-emerald-605 transition-all duration-500 ease-in-out"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - (loading ? 0 : stats.avgAlkes) / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="24"
                cx="32"
                cy="32"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800">
              {loading ? '...' : `${stats.avgAlkes}%`}
            </span>
          </div>
        </article>

        {/* Card 4: Essential Medicine Availability */}
        <article
          onClick={() => setSelectedCard('obat')}
          className="flex items-center justify-between p-6 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.07)] transition-all active:scale-[0.98] min-h-[160px] h-full"
        >
          {/* Left section: Icon + Text Stack */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {/* Circular Icon Badge */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
              <Pill className="h-8 w-8" />
            </div>
            
            {/* Text Stack */}
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-xs sm:text-[13px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                Ketersediaan Obat Esensial
              </span>
              <span className="text-5xl font-black text-slate-800 tracking-tight leading-none py-1">
                {loading ? '...' : `${stats.obatJenis} Jenis`}
              </span>
              <p className="text-xs sm:text-[13px] text-slate-500 font-semibold truncate">
                Ambang batas: <span className="text-slate-800 font-bold">40 Obat</span>
              </p>
            </div>
          </div>

          {/* Right section: Circle Progress Ring */}
          <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="24"
                cx="32"
                cy="32"
              />
              <circle
                className="text-indigo-605 transition-all duration-500 ease-in-out"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - (loading ? 0 : stats.avgObat) / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="24"
                cx="32"
                cy="32"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800">
              {loading ? '...' : `${stats.avgObat}%`}
            </span>
          </div>
        </article>

        {/* Card 5: Kecamatan Tanpa Puskesmas (Bonus Alert Card) */}
        <article
          onClick={() => setSelectedCard('kecamatan_tanpa')}
          className="flex items-center justify-between p-6 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.07)] transition-all active:scale-[0.98] min-h-[160px] h-full"
        >
          {/* Left section: Icon + Text Stack */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {/* Circular Icon Badge */}
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-inner ${
              (loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0
                ? 'bg-red-50 border border-red-100 text-red-650'
                : 'bg-green-50 border border-green-100 text-green-600'
            }`}>
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            {/* Text Stack */}
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-xs sm:text-[13px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                Kecamatan Tanpa Puskesmas
              </span>
              <div className="flex items-center gap-2 py-1">
                <span className={`text-5xl font-black tracking-tight leading-none ${
                  (loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0 ? 'text-red-600' : 'text-slate-800'
                }`} style={{ color: (loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0 ? '#dc2626' : undefined }}>
                  {loading ? '...' : data?.kecamatan_tanpa_puskesmas || 0}
                </span>
                {(loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0 && (
                  <span className="bg-red-105 text-red-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    Mendesak
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 font-semibold truncate">
                Status Ketersediaan: <span className={(loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0 ? 'font-bold' : 'text-green-600 font-bold'} style={{ color: (loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0 ? '#dc2626' : undefined }}>
                  {(loading ? 0 : data?.kecamatan_tanpa_puskesmas || 0) > 0 ? 'Perlu Intervensi' : 'Ideal'}
                </span>
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Map + AI Insight Section - Matches Homepage Aesthetics */}
      <section className="w-full bg-[#fbffff] pb-5">
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-start">

          <div className="space-y-3">
            {/* ── AI Insight Card ── */}
            <article
              className="relative overflow-hidden border border-[#b7d9d8] p-5 xl:h-[415px] xl:w-[381px]"
              style={{
                backgroundImage: "url('/bg insght.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,251,250,0.72)_0%,rgba(231,247,246,0.60)_100%)]" />

              <div className="relative z-10 flex h-full flex-col">
                {/* Icon + Title */}
                <div className="flex items-start gap-3">
                  <Image
                    src="/insight.svg"
                    alt="Insight"
                    width={52}
                    height={52}
                    className="h-13 w-13 flex-shrink-0"
                  />
                  <h3 className="text-[15px] font-bold leading-[1.3] text-[#1a3535] sm:text-[17px]">
                    Analisis Penilaian Risiko Krisis Kesehatan Akibat Bencana
                  </h3>
                </div>

                {/* Body text */}
                <div className="mt-3 rounded-xl border-l-[3px] border-l-[#16b7b2] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto max-h-[180px] min-h-[140px]">
                  <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px] whitespace-pre-line">
                    {aiInsight || 'Klik tombol di bawah untuk membuat analisis.'}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-[rgba(0,0,0,0.08)]" />

                <div className="mt-auto">
                  <button
                    onClick={generateAiInsight}
                    disabled={generatingAi}
                    className="group flex w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-[#4d90d0] to-[#6c5ce7] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(77,144,208,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(108,92,231,0.42)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                      {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">
                      {generatingAi ? 'Sedang Menganalisis...' : 'Analisis AI'}
                    </span>
                  </button>
                </div>
              </div>
            </article>

            {/* Source card */}
            <article
              className="border border-[#b7c8c9] bg-[#e9f1f2] p-4 xl:h-[183px] xl:w-[381px]"
              style={{
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <h4 className="text-[18px] font-bold text-[#2f3a3a] sm:text-[22px]">Sumber Data:</h4>
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">
                Kementerian Kesehatan Republik Indonesia
              </p>
              <h4 className="mt-4 text-[18px] font-bold text-[#2f3a3a] sm:text-[22px]">Data per:</h4>
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">22 Juni 2026 10.00 WIB</p>
            </article>
          </div>

          {/* Map Card */}
          <article
            className="border border-[#cdcdcd] bg-white p-4 xl:h-[615px]"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            <h3 className="text-[22px] font-bold leading-tight text-[#2f2f2f] sm:text-[30px] uppercase">
              SEBARAN SPASIAL PUSKESMAS - {getRegionLabel()}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4b4b4b] sm:text-[16px]">
              Pemetaan ini menyajikan gambaran komprehensif mengenai sebaran geografis fasilitas kesehatan tingkat pertama (Puskesmas) beserta status evaluasinya di wilayah {getRegionLabel()}.
            </p>
            <div className="mt-4 h-[300px] sm:h-[350px] md:h-[420px] xl:h-[470px]">
              <DisasterMap
                markers={data?.markers || []}
                userScope={activeUserScope}
                onSelectProvince={(prov) => setProvince(prov)}
                isGuest={!token || !user}
              />
            </div>
          </article>

        </div>
      </section>
      {/* ── Dashboard Charts Section: Middle Analytics Row (full-width) ── */}
      <section className="w-full bg-[#fbffff] pb-5">
        {/* Full-width card: Line Chart + Donut Chart side by side */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] min-h-[420px] flex flex-col"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg sm:text-[22px] font-black text-[#047D78] uppercase tracking-wide leading-tight">Analitik Pertumbuhan & Kepatuhan Nakes</h3>
              <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">Data teregistrasi 2021–2026 · Standar 9 Jenis Tenaga Kesehatan Wajib</p>
            </div>
            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-3 py-1 uppercase tracking-wider">{getRegionLabel()}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 flex-1 min-h-[340px]">
            {/* Sub-column 1: Area/Line Chart — Tren Pertumbuhan */}
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">Tren Pertumbuhan Puskesmas Teregistrasi</h4>
                <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1 leading-relaxed">
                  Jumlah puskesmas yang teregistrasi secara digital dari tahun 2021 hingga 2026.
                </p>
              </div>
              <div className="flex-1 min-h-[280px] w-full">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#047D78" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#047D78" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.97)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${Number(value).toLocaleString('id-ID')} Puskesmas`, 'Jumlah Teregistrasi']}
                      />
                      <Area type="monotone" dataKey="jumlah" stroke="none" fill="url(#colorGrowth)" />
                      <Line
                        type="monotone"
                        dataKey="jumlah"
                        stroke="#047D78"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: '#047D78', strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 7, stroke: '#047D78', strokeWidth: 2, fill: '#047D78' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Sub-column 2: Donut Chart — Kepatuhan 9 Nakes */}
            <div className="flex flex-col h-full border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-8">
              <div className="mb-4">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">Kepatuhan Standar 9 Jenis Nakes</h4>
                <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1 leading-relaxed">
                  Proporsi puskesmas yang memenuhi standard minimal 9 jenis nakes wajib.
                </p>
              </div>
              <div className="flex-1 min-h-[240px] w-full relative flex items-center justify-center">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={98}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#334155" />
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [`${value} Puskesmas (${props.payload.pct}%)`, name]}
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.97)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[26px] font-black text-slate-800 leading-none">
                        {donutData[0].pct}%
                      </span>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mt-1">
                        Lengkap
                      </span>
                    </div>
                  </>
                )}
              </div>
              {/* Donut Legend */}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-[11px] font-semibold text-slate-600">Lengkap ({donutData[0].value})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#334155]" />
                  <span className="text-[11px] font-semibold text-slate-600">Belum ({donutData[1].value})</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* ── Analytics Charts: 3-Column Grid ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full bg-[#fbffff] pb-5">

        {/* Chart 1: 10 Penyakit Terbanyak */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="mb-4">
            <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
              10 Penyakit Terbanyak
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
              Distribusi 10 penyakit dengan kasus terbanyak di Puskesmas — {getRegionLabel()}
            </p>
          </div>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={topDiseasesData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} unit=" kasus" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value ?? 0).toLocaleString('id-ID')} kasus`, name]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="kasus" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {topDiseasesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#047D78' : index === 1 ? '#0ea5e9' : index === 2 ? '#6366f1' : index < 5 ? '#10b981' : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>


        {/* Chart 3: Beban Kerja SDM per Puskesmas */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="mb-4">
            <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
              {cakupan === 'nasional'
                ? 'Beban Kerja SDM per Provinsi'
                : cakupan === 'provinsi'
                  ? 'Beban Kerja SDM per Kab/Kota'
                  : 'Beban Kerja SDM per Puskesmas'}
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
              {cakupan === 'nasional'
                ? 'Rasio beban kerja (penduduk / nakes aktual) rata-rata tiap Provinsi.'
                : cakupan === 'provinsi'
                  ? 'Rasio beban kerja (penduduk / nakes aktual) rata-rata tiap Kabupaten/Kota.'
                  : 'Rasio beban kerja (penduduk / nakes aktual) tiap Puskesmas. Titik merah = rasio tinggi.'}
            </p>
          </div>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sdmWorkloadData.slice(0, 15)} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value) => [`1 : ${Number(value).toLocaleString('id-ID')} jiwa`, 'Rasio Beban']}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="beban" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {sdmWorkloadData.slice(0, 15).map((entry, index) => (
                      <Cell
                        key={`cell-beban-${index}`}
                        fill={entry.beban > 20000 ? '#ef4444' : entry.beban > 10000 ? '#f59e0b' : '#047D78'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Chart 4: Kinerja per Kategori Puskesmas */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="mb-4">
            <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
              Kinerja per Kategori Puskesmas
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
              Perbandingan rata-rata Tata Kelola, Kesiapan Alkes, dan Ketersediaan Obat per kategori layanan / wilayah.
            </p>
          </div>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kategoriPerformanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => [`${value}%`]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{value}</span>}
                  />
                  <Bar dataKey="Tata Kelola" fill="#047D78" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Kesiapan Alkes" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Ketersediaan Obat" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

      </section>

      {/* ── Matrix Table Section ── */}
      <section className="w-full bg-[#fbffff] pt-2 pb-8">
        <article
          className="border border-[#cdcdcd] bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
                TABEL CAPAIAN KINERJA PUSKESMAS PER WILAYAH - {getRegionLabel()}
              </h3>
              <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
                Rekapitulasi status evaluasi, kapasitas tempat tidur (Rawat Inap), dan indeks kepatuhan standard fasilitas kesehatan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Wilayah (Kabupaten/Kota)</th>
                  <th className="py-3.5 px-4 text-center">Total Puskesmas</th>
                  <th className="py-3.5 px-4 text-center">Rawat Inap</th>
                  <th className="py-3.5 px-4 text-center">Non Rawat Inap</th>
                  <th className="py-3.5 px-4 text-center">Kepatuhan Alkes</th>
                  <th className="py-3.5 px-4 text-center">Kepatuhan Obat</th>
                  <th className="py-3.5 px-4 text-center">Kepatuhan Nakes</th>
                  <th className="py-3.5 px-4 text-center">Status Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Memuat data tabel...
                    </td>
                  </tr>
                ) : !data?.wilayah_breakdown || data.wilayah_breakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data wilayah untuk filter terpilih.
                    </td>
                  </tr>
                ) : (
                  data.wilayah_breakdown.map((wil, idx) => {
                    const statusColors = {
                      Baik: 'bg-emerald-50 text-emerald-700 border-emerald-150',
                      Sedang: 'bg-amber-50 text-amber-700 border-amber-150',
                      Kurang: 'bg-red-50 text-red-700 border-red-150',
                    }
                    const badgeClass = statusColors[wil.status] || statusColors.Sedang

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800 uppercase tracking-wide">
                          {wil.nama}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {wil.total_puskesmas}
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#0f8f96] font-semibold">
                          {wil.ranap}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">
                          {wil.non_ranap}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div className="bg-teal-500 h-full" style={{ width: `${wil.alkes_pct}%` }} />
                            </div>
                            <span className="font-bold">{wil.alkes_pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div className="bg-teal-500 h-full" style={{ width: `${wil.obat_pct}%` }} />
                            </div>
                            <span className="font-bold">{wil.obat_pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div className="bg-teal-500 h-full" style={{ width: `${wil.nakes_pct}%` }} />
                            </div>
                            <span className="font-bold">{wil.nakes_pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                            {wil.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* ── Provincial Performance Breakdown Table Section ── */}
      <section className="w-full bg-[#fbffff] pb-8">
        <PerformanceBreakdownTable selectedProvince={province} />
      </section>

      {/* ── Detail Card Modal ── */}
      {selectedCard && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedCard(null)}
          />
          <div
            className="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white shadow-2xl border border-slate-200 flex flex-col"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-[#fafcfc]">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  {selectedCard === 'tata_kelola' && `Rincian Evaluasi Tata Kelola Kinerja Puskesmas - ${getRegionLabel()}`}
                  {selectedCard === 'jumlah' && `Rincian Puskesmas - ${getRegionLabel()}`}
                  {selectedCard === 'beban' && `Rasio Beban Kerja Penduduk - ${getRegionLabel()}`}
                  {selectedCard === 'sdm' && `Rasio Distribusi Dokter & Nakes - ${getRegionLabel()}`}
                  {selectedCard === 'nakes' && `Kelengkapan 9 Jenis Nakes Wajib - ${getRegionLabel()}`}
                  {selectedCard === 'alkes' && `Rata-rata Ketersediaan Alat Kesehatan - ${getRegionLabel()}`}
                  {selectedCard === 'obat' && `Rata-rata Ketersediaan Obat Esensial - ${getRegionLabel()}`}
                  {selectedCard === 'kategori_ranap' && `Rincian Puskesmas Rawat Inap & Non-Ranap - ${getRegionLabel()}`}
                  {selectedCard === 'kategori_puskesmas' && `Karakteristik Wilayah Puskesmas (T/ST/Desa/Kota) - ${getRegionLabel()}`}
                  {selectedCard === 'kecamatan_tanpa' && `Status Distribusi Kecamatan & Puskesmas - ${getRegionLabel()}`}
                  {selectedCard === 'teregistrasi' && `Status Registrasi & Izin Puskesmas - ${getRegionLabel()}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedCard === 'kecamatan_tanpa' 
                    ? `Menampilkan analisis kecamatan yang telah memiliki fasilitas Puskesmas maupun yang belum memiliki.`
                    : `Menampilkan data rincian dari fasilitas kesehatan tingkat pertama yang terdaftar di wilayah ini.`}
                </p>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Table / Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">
                        {selectedCard === 'kecamatan_tanpa' ? 'Nama Kecamatan' : 'Nama Puskesmas'}
                      </th>
                      <th className="py-2.5 px-3">
                        {selectedCard === 'kecamatan_tanpa' ? 'Kabupaten/Kota' : 'Kecamatan'}
                      </th>
                      <th className="py-2.5 px-3 text-center">
                        {selectedCard === 'kecamatan_tanpa' ? 'Status Ketersediaan' : 'Karakteristik'}
                      </th>
                      
                      {selectedCard === 'tata_kelola' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Status Tata Kelola</th>
                          <th className="py-2.5 px-3 text-center">Indeks Kelengkapan Nakes</th>
                          <th className="py-2.5 px-3 text-center">Kesiapan Alkes</th>
                          <th className="py-2.5 px-3 text-center">Ketersediaan Obat</th>
                        </>
                      )}
                      {selectedCard === 'jumlah' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Layanan</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </>
                      )}
                      {selectedCard === 'beban' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Pop. Terlayani</th>
                          <th className="py-2.5 px-3 text-center">Rasio Beban</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </>
                      )}
                      {selectedCard === 'sdm' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Estimasi Dokter</th>
                          <th className="py-2.5 px-3 text-center">Estimasi Nakes</th>
                          <th className="py-2.5 px-3 text-center">Rasio Dokter</th>
                          <th className="py-2.5 px-3 text-center">Rasio Nakes</th>
                        </>
                      )}
                      {selectedCard === 'nakes' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Nakes Compl.</th>
                          <th className="py-2.5 px-3 text-center">Status 9 Jenis</th>
                        </>
                      )}
                      {selectedCard === 'alkes' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Persentase Alkes</th>
                          <th className="py-2.5 px-3 text-center">Ambang Batas (≥60%)</th>
                        </>
                      )}
                      {selectedCard === 'obat' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Persentase Obat</th>
                          <th className="py-2.5 px-3 text-center">Ambang Batas (≥40%)</th>
                        </>
                      )}
                      {selectedCard === 'kategori_ranap' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Kategori Layanan</th>
                          <th className="py-2.5 px-3 text-center">Tempat Tidur</th>
                          <th className="py-2.5 px-3 text-center">Pelayanan UGD</th>
                          <th className="py-2.5 px-3 text-center">Unit Ambulans</th>
                        </>
                      )}
                      {selectedCard === 'kategori_puskesmas' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Karakteristik Wilayah</th>
                          <th className="py-2.5 px-3 text-center">Lokasi Kerja</th>
                          <th className="py-2.5 px-3 text-center">Akses Jalan</th>
                          <th className="py-2.5 px-3 text-center">Sinyal Seluler</th>
                        </>
                      )}
                      {selectedCard === 'kecamatan_tanpa' && (
                        <th className="py-2.5 px-3 text-left">Detail Analisis / Rekomendasi</th>
                      )}
                      {selectedCard === 'teregistrasi' && (
                        <>
                          <th className="py-2.5 px-3 text-center">Tahun Registrasi</th>
                          <th className="py-2.5 px-3 text-center">No. Registrasi</th>
                          <th className="py-2.5 px-3 text-center">Status Registrasi</th>
                          <th className="py-2.5 px-3 text-center">Masa Berlaku Izin</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {selectedCard === 'kecamatan_tanpa' ? (
                      kecamatanList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wide">
                            Kec. {item.nama}
                          </td>
                          <td className="py-3 px-3">
                            {item.kabupaten}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.status === 'Ada' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'}`}>
                              {item.status === 'Ada' ? 'Terlayani' : 'Kosong'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-left italic text-slate-500">
                            {item.detail}
                          </td>
                        </tr>
                      ))
                    ) : (
                      data?.markers.map((item, idx) => {
                        const isKota = item.kabupaten.includes('KOTA')
                        const population = isKota ? 16200 : item.kabupaten.includes('TIMUR') ? 21500 : 26500
                        const workloadRatio = `1 : ${population.toLocaleString('id-ID')}`
                        
                        const numDokter = item.nakes_pct >= 90 ? 3 : item.nakes_pct >= 75 ? 2 : 1
                        const numNakes = item.nakes_pct >= 90 ? 28 : item.nakes_pct >= 75 ? 20 : 12
                        const docRatio = `1 : ${Math.round(population / numDokter).toLocaleString('id-ID')}`
                        const nakesRatio = `1 : ${Math.round(population / numNakes).toLocaleString('id-ID')}`

                        const evalColors = {
                          Baik: 'bg-emerald-50 text-emerald-700 border-emerald-150',
                          Sedang: 'bg-amber-50 text-amber-700 border-amber-150',
                          Kurang: 'bg-red-50 text-red-700 border-red-150',
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wide">
                              {item.jenis_bencana}
                            </td>
                            <td className="py-3 px-3">
                              Kec. {item.kecamatan}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border">
                                {item.karakteristik}
                              </span>
                            </td>
                            
                            {selectedCard === 'tata_kelola' && (
                              <>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${evalColors[item.status_evaluasi || 'Sedang']}`}>
                                    {item.status_evaluasi || 'Sedang'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-teal-700">
                                  {item.nakes_pct}% Lengkap
                                </td>
                                <td className="py-3 px-3 text-center text-slate-700">
                                  {item.alkes_pct}% Siap
                                </td>
                                <td className="py-3 px-3 text-center text-indigo-700 font-semibold">
                                  {item.obat_pct}% Tersedia
                                </td>
                              </>
                            )}
                            
                            {selectedCard === 'jumlah' && (
                              <>
                                <td className="py-3 px-3 text-center font-bold text-teal-700">
                                  {item.is_ranap ? 'Rawat Inap' : 'Non Rawat Inap'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${evalColors[item.status_evaluasi || 'Sedang']}`}>
                                    {item.status_evaluasi || 'Sedang'}
                                  </span>
                                </td>
                              </>
                            )}
                            
                            {selectedCard === 'beban' && (
                              <>
                                <td className="py-3 px-3 text-center text-slate-800">
                                  {population.toLocaleString('id-ID')} jiwa
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-[#0f8f96]">
                                  {workloadRatio}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${population <= 20000 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-amber-50 text-amber-700 border-amber-150'}`}>
                                    {population <= 20000 ? 'Ideal' : 'Padat'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCard === 'sdm' && (
                              <>
                                <td className="py-3 px-3 text-center font-semibold">
                                  {numDokter} dokter
                                </td>
                                <td className="py-3 px-3 text-center font-semibold">
                                  {numNakes} nakes
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-[#0f8f96]">
                                  {docRatio}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-[#0f8f96]">
                                  {nakesRatio}
                                </td>
                              </>
                            )}

                            {selectedCard === 'nakes' && (
                              <>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                      <div className="bg-teal-500 h-full" style={{ width: `${item.nakes_pct}%` }} />
                                    </div>
                                    <span className="font-bold">{item.nakes_pct}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.nakes_pct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'}`}>
                                    {item.nakes_pct >= 80 ? 'Lengkap' : 'Kurang'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCard === 'alkes' && (
                              <>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                      <div className="bg-teal-500 h-full" style={{ width: `${item.alkes_pct}%` }} />
                                    </div>
                                    <span className="font-bold">{item.alkes_pct}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.alkes_pct >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'}`}>
                                    {item.alkes_pct >= 60 ? 'Memenuhi' : 'Tidak Memenuhi'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCard === 'obat' && (
                              <>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                      <div className="bg-teal-500 h-full" style={{ width: `${item.obat_pct}%` }} />
                                    </div>
                                    <span className="font-bold">{item.obat_pct}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.obat_pct >= 40 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'}`}>
                                    {item.obat_pct >= 40 ? 'Memenuhi' : 'Tidak Memenuhi'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCard === 'kategori_ranap' && (
                              <>
                                <td className="py-3 px-3 text-center font-bold text-slate-800">
                                  {item.is_ranap ? 'Rawat Inap (Ranap)' : 'Non Rawat Inap'}
                                </td>
                                <td className="py-3 px-3 text-center font-semibold text-teal-700">
                                  {item.is_ranap ? '16 Bed' : '0 Bed'}
                                </td>
                                <td className="py-3 px-3 text-center text-slate-650">
                                  {item.is_ranap ? '24 Jam Non-Stop' : 'Jam Kerja (UGD Darurat)'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="bg-blue-50 text-blue-700 border border-blue-150 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    {item.is_ranap ? '2 Unit Ambulans' : '1 Unit Ambulans'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCard === 'kategori_puskesmas' && (
                              <>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    item.karakteristik === 'Biasa' ? 'bg-slate-100 text-slate-700' :
                                    item.karakteristik === 'Terpencil' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                                    'bg-red-50 text-red-700 border-red-150'
                                  }`}>
                                    {item.karakteristik}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-slate-700">
                                  {item.karakteristik === 'Biasa' ? 'Wilayah Perkotaan' : 'Wilayah Perdesaan'}
                                </td>
                                <td className="py-3 px-3 text-center text-slate-650 font-semibold">
                                  {item.karakteristik === 'Sangat Terpencil' ? 'Akses Darat & Sungai (Sulit)' : 'Akses Darat (Baik)'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    item.karakteristik === 'Sangat Terpencil' ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {item.karakteristik === 'Sangat Terpencil' ? 'Sinyal Lemah' : '4G LTE Stabil'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCard === 'teregistrasi' && (
                              <>
                                <td className="py-3 px-3 text-center font-bold text-teal-700">
                                  {item.kode_trans.includes('7505') ? '2021' : item.kode_trans.includes('7502') ? '2022' : item.kode_trans.includes('7501') ? '2023' : item.kode_trans.includes('7503') ? '2024' : '2025'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-600">
                                  {item.kode_trans}/REG/DKK-{item.kode_trans.substring(4, 8)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    Aktif (Terverifikasi)
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-slate-500">
                                  Tetap (Seumur Hidup)
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-[#fafcfc] text-center text-[10px] text-slate-400">
              Kementerian Kesehatan Republik Indonesia · Sistem Informasi Evaluasi Kinerja Puskesmas
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
