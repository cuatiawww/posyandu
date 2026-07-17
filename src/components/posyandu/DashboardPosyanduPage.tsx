'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  HelpCircle,
  Loader2,
  RefreshCw,
  Users,
  Sparkles,
  MapPin,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Info,
  ShieldCheck,
  Building2,
  FileText,
  Home,
  CheckCircle2,
  Download,
  BarChart3,
  Table as TableIcon,
  Eye,
  Video,
  Play,
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
  ReferenceLine,
} from 'recharts'
import { useAuthStore } from '@/lib/authStore'
import FilterDropdownBar, { type FilterSummary } from '@/components/landing/FilterDropdownBar'
import Modal from '@/components/Modal'

import { type PosyanduDashboardData } from '@/lib/posyanduData'
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

const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#a855f7']

const CustomPosyanduTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload

    const activeStatusColor = data.statusAktif === 'MEMENUHI'
      ? 'text-emerald-600'
      : 'text-red-600'

    const lifecycleStatusColor = data.statusSiklusHidup === 'MEMENUHI'
      ? 'text-emerald-600'
      : 'text-red-600'

    return (
      <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-xl p-4 max-w-[320px] backdrop-blur-sm text-xs font-bold text-slate-800">
        <p className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 mb-3 uppercase tracking-wide">
          {data.nama}
        </p>

        {/* General stats */}
        <div className="mb-3 flex justify-between items-center text-slate-700">
          <span>Jumlah Posyandu Valid:</span>
          <span className="font-extrabold text-slate-900">{data.valid.toLocaleString('id-ID')}</span>
        </div>

        {/* Keaktifan breakdown */}
        <div className="mb-3 border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between text-teal-900 mb-1">
            <span className="font-extrabold uppercase text-[10px] tracking-wider">Keaktifan Posyandu</span>
            <span className="font-black text-sm text-teal-700">
              {data.aktif.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-600 font-bold pl-1">
            <span>Persentase:</span>
            <span className="text-right text-slate-950">{data.pctAktif}%</span>
            <span>Status (≥80%):</span>
            <span className={`text-right font-black ${activeStatusColor}`}>
              {data.statusAktif === 'MEMENUHI' ? 'MEMENUHI' : 'BELUM MEMENUHI'}
            </span>
          </div>
        </div>

        {/* Siklus Hidup breakdown */}
        <div className="border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between text-indigo-900 mb-1">
            <span className="font-extrabold uppercase text-[10px] tracking-wider">Siklus Hidup Aktif</span>
            <span className="font-black text-sm text-indigo-700">
              {data.siklusHidup.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-600 font-bold pl-1">
            <span>Persentase:</span>
            <span className="text-right text-slate-950">{data.pctSiklusHidup}%</span>
            <span>Status (≥75%):</span>
            <span className={`text-right font-black ${lifecycleStatusColor}`}>
              {data.statusSiklusHidup === 'MEMENUHI' ? 'MEMENUHI' : 'BELUM MEMENUHI'}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function parseBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function renderMarkdown(text: string) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    if (line.startsWith('# ')) {
      return <h1 key={idx} className="text-2xl font-black text-slate-900 mt-5 mb-3">{line.replace('# ', '')}</h1>
    }
    if (line.startsWith('## ')) {
      return <h2 key={idx} className="text-xl font-black text-slate-800 mt-4 mb-2.5 border-b pb-1.5">{line.replace('## ', '')}</h2>
    }
    if (line.startsWith('### ')) {
      return <h3 key={idx} className="text-lg font-bold text-slate-800 mt-3.5 mb-2">{line.replace('### ', '')}</h3>
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <ul key={idx} className="list-disc pl-5 mb-2 text-slate-700 text-sm">
          <li>{parseBoldText(line.substring(2))}</li>
        </ul>
      )
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <ol key={idx} className="list-decimal pl-5 mb-2 text-slate-700 text-sm">
          <li>{parseBoldText(line.replace(/^\d+\.\s/, ''))}</li>
        </ol>
      )
    }
    if (line.trim() === '') {
      return <div key={idx} className="h-1.5" />
    }
    return <p key={idx} className="text-sm text-slate-700 leading-relaxed mb-2.5">{parseBoldText(line)}</p>
  })
}

const isYouTubeUrl = (url: string) => {
  if (!url) return false
  return url.includes('youtube.com') || url.includes('youtu.be')
}

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return ''
  let id = ''
  if (url.includes('youtu.be/')) {
    id = url.split('youtu.be/')[1]?.split(/[?#]/)[0]
  } else if (url.includes('v=')) {
    id = url.split('v=')[1]?.split('&')[0]?.split(/[?#]/)[0]
  } else if (url.includes('embed/')) {
    id = url.split('embed/')[1]?.split(/[?#]/)[0]
  }

  if (id) {
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`
  }
  return url
}

export default function DashboardPosyanduPage() {

  const { token, isInitialized, user } = useAuthStore()

  const [data, setData] = useState<PosyanduDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([])
  const [detailedAnalysis, setDetailedAnalysis] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'text' | 'video' | 'info'>('text')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  // Variabel state baru untuk fitur Riwayat AI & Video Presenter
  const [historyList, setHistoryList] = useState<{ id: string; createdAt: string }[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoScript, setVideoScript] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<string>('PENDING')
  const [aiCreatedAt, setAiCreatedAt] = useState<string | null>(null)



  // Primitive states for region filtering
  const [cakupan, setCakupan] = useState('nasional')
  const [province, setProvince] = useState('')
  const [kabupaten, setKabupaten] = useState('')

  // Temporal filters
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedTimeframe, setSelectedTimeframe] = useState('Tahunan')
  const [selectedPeriod, setSelectedPeriod] = useState('')

  // Smart search bar states
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Dynamic status filter for spatial markers mapping
  const [selectedKategoriPosyandu, setSelectedKategoriPosyandu] = useState<'all' | 'aktif' | 'siklus-hidup'>('all')

  // Table search & export states
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    pctAktif: true,
    pctSiklusHidup: true,
  })

  const handleLegendClick = (entry: any) => {
    const dataKey = entry.dataKey
    if (dataKey) {
      setVisibleSeries((prev) => ({
        ...prev,
        [dataKey]: !prev[dataKey],
      }))
    }
  }

  const formatLegendText = (value: any, entry: any) => {
    const dataKey = entry.dataKey
    const isVisible = visibleSeries[dataKey] ?? true
    return (
      <span className={`select-none cursor-pointer transition-all ${isVisible ? 'text-[#0f172a] font-bold' : 'text-slate-400 font-normal line-through'}`}>
        {value}
      </span>
    )
  }

  // Debounced search queries
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
    }, 400)

    return () => clearTimeout(handler)
  }, [searchQuery, token])

  const handleSelectSuggestion = useCallback((sug: any) => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)

    setProvince(sug.province_name)
    if (sug.type === 'provinsi') {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setKabupaten(sug.kabupaten_name)
      setCakupan('kabupaten')
    }
  }, [])

  // Sync locked user scope
  const isProvLocked = user?.wilayah_scope?.mode === 'provinsi'
  const isKabLocked = user?.wilayah_scope?.mode === 'kabupaten'

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

  const showResetButton = useMemo(() => {
    if (isKabLocked) return false
    if (isProvLocked) return kabupaten !== '' || selectedYear !== '2026' || selectedTimeframe !== 'Tahunan' || selectedPeriod !== ''
    return province !== '' || selectedYear !== '2026' || selectedTimeframe !== 'Tahunan' || selectedPeriod !== ''
  }, [isKabLocked, isProvLocked, province, kabupaten, selectedYear, selectedTimeframe, selectedPeriod])

  const handleResetFilter = () => {
    setSelectedYear('2026')
    setSelectedTimeframe('Tahunan')
    setSelectedPeriod('')
    if (isProvLocked && user?.wilayah_scope?.provinsi?.label) {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setProvince('')
      setKabupaten('')
      setCakupan('nasional')
    }
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
      const queryParams = new URLSearchParams({
        province: province || '',
        kabupaten: kabupaten || '',
        timeFrame: selectedTimeframe || 'Tahunan',
        year: selectedYear || '2026',
        period: selectedPeriod || ''
      })
      const res = await fetch(`/api/posyandu-stats?${queryParams.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.statusText}`)
      }
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      } else {
        throw new Error(json.error || 'Gagal memuat data statistik.')
      }
    } catch (err) {
      console.error('[posyandu-stats]', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }, [province, kabupaten, selectedTimeframe, selectedYear, selectedPeriod])

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

  // Filter map markers based on Kategori Posyandu
  const filteredMarkers = useMemo(() => {
    if (!data?.markers) return []
    return data.markers.filter(m => {
      if (selectedKategoriPosyandu === 'aktif' && !m.is_ranap) return false
      if (selectedKategoriPosyandu === 'siklus-hidup' && m.status_evaluasi !== 'Baik') return false
      return true
    })
  }, [data?.markers, selectedKategoriPosyandu])

  // Donut chart: Aktif vs Tidak Aktif
  const donutData = useMemo(() => {
    if (!data) return []
    const aktif = data.totalAktif
    const tidakAktif = Math.max(0, data.totalValid - data.totalAktif)
    const pctAktif = data.totalValid > 0 ? Math.round((aktif / data.totalValid) * 100) : 0
    return [
      { name: 'Aktif', value: aktif, pct: pctAktif },
      { name: 'Tidak Aktif', value: tidakAktif, pct: 100 - pctAktif }
    ]
  }, [data])

  // Stacked Bar Chart per Wilayah (Aktif vs Tidak Aktif) - screenshot 2 matching
  const regionalStackedData = useMemo(() => {
    if (!data?.wilayahBreakdown) return []
    // Sort by total Valid descending, slice top 16 for cleaner layout
    return data.wilayahBreakdown
      .map(wb => ({
        name: wb.nama.replace('PROVINSI ', '').replace('KABUPATEN ', '').replace('KOTA ', ''),
        aktif: wb.aktif,
        tidakAktif: Math.max(0, wb.valid - wb.aktif),
        total: wb.valid
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 16)
  }, [data?.wilayahBreakdown])

  // AI Insight Generator
  const generateAiInsight = async (historyId?: string) => {
    if (!data) return
    setGeneratingAi(true)

    // Reset state hanya jika kita membuat analisis baru (bukan memuat lama)
    if (!historyId) {
      setAiInsight(null)
      setAiRecommendations([])
      setDetailedAnalysis('')
      setVideoUrl(null)
      setVideoScript(null)
      setVideoStatus('PENDING')
      setSelectedHistoryId('')
      setAiCreatedAt(null)
    }

    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          province,
          kabupaten,
          year: selectedYear,
          timeFrame: selectedTimeframe,
          period: selectedPeriod,
          historyId,
          force: !historyId,
        }),
      })

      if (!response.ok) {
        throw new Error('Gagal mengambil analisis AI')
      }

      const result = await response.json()
      setAiInsight(result.summary)
      setAiRecommendations(result.recommendations || [])
      setDetailedAnalysis(result.detailedAnalysis || '')
      setVideoUrl(result.videoUrl || null)
      setVideoScript(result.videoScript || null)
      setVideoStatus(result.videoStatus || 'PENDING')
      setHistoryList(result.historyList || [])
      setAiCreatedAt(result.createdAt || null)
      if (result.id) {
        setSelectedHistoryId(result.id)
      }
    } catch (err) {
      console.error('Error generating AI insight:', err)

      // Fallback lokal jika terjadi error jaringan / server
      const totalValid = data.totalValid
      const totalAktif = data.totalAktif
      const totalSiklusHidup = data.totalSiklusHidupAktif
      const pctAktif = Math.round((totalAktif / totalValid) * 100)
      const pctSiklusHidup = Math.round((totalSiklusHidup / totalValid) * 100)

      let analysisText = `[ANALISIS KINERJA LAYANAN POSYANDU TAHUN ${selectedYear}]`
      analysisText += `\nDi wilayah ${getRegionLabel()}, tercatat sebanyak ${totalValid.toLocaleString('id-ID')} Posyandu Valid.`
      analysisText += `\n- Posyandu Aktif operasional bulanan: ${totalAktif.toLocaleString('id-ID')} (${pctAktif}%).`
      analysisText += `\n- Posyandu Siklus Hidup yang Aktif: ${totalSiklusHidup.toLocaleString('id-ID')} (${pctSiklusHidup}%).`

      const localRecs = [
        `<strong>Optimalisasi Keaktifan</strong> - Hubungi dinas setempat untuk menaikkan persentase keaktifan bulanan wilayah di bawah target.`,
        `<strong>Pelatihan Layanan Siklus Hidup</strong> - Selenggarakan bimtek kader terpadu agar Posyandu mampu melayani seluruh sasaran usia.`,
        `<strong>Integrasi Pelaporan Pustu</strong> - Sempurnakan sistem pencatatan kunjungan rumah agar pelaporan ke Pustu terkirim secara tepat waktu.`
      ]

      setAiInsight(analysisText)
      setAiRecommendations(localRecs)
      setDetailedAnalysis(`# Analisis Penilaian Kepatuhan & Keaktifan Layanan Posyandu - ${getRegionLabel()}\n\nAnalisis fallback lokal diaktifkan. Silakan cek koneksi internet dan API Key Anda.`)
      setAiCreatedAt(new Date().toISOString())
    } finally {
      setGeneratingAi(false)
    }
  }

  // Format waktu generate untuk label info modal
  const formattedAiTime = useMemo(() => {
    if (!aiCreatedAt) return ''
    const dateObj = new Date(aiCreatedAt)
    const dateStr = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const timeStr = dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${dateStr} pukul ${timeStr} WIB`
  }, [aiCreatedAt])

  // Polling status video jika masih PENDING atau GENERATING
  useEffect(() => {
    if (!isModalOpen || !selectedHistoryId) return
    if (videoStatus !== 'PENDING' && videoStatus !== 'GENERATING') return

    let isMounted = true
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            province,
            kabupaten,
            year: selectedYear,
            timeFrame: selectedTimeframe,
            period: selectedPeriod,
            historyId: selectedHistoryId,
          }),
        })

        if (response.ok && isMounted) {
          const result = await response.json()
          if (result.videoStatus) {
            setVideoStatus(result.videoStatus)
          }
          if (result.videoUrl) {
            setVideoUrl(result.videoUrl)
          }
        }
      } catch (err) {
        console.error('Error polling video status:', err)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isModalOpen, selectedHistoryId, videoStatus])

  // Pre-generate AI insight once data is loaded
  useEffect(() => {
    if (data) {
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
        <p className="mt-2 text-sm text-slate-600">{error || 'Gagal memuat data statistik posyandu.'}</p>
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

  const filteredMatrixData = useMemo(() => {
    if (!data?.wilayahBreakdown) return []
    if (!matrixSearchQuery.trim()) return data.wilayahBreakdown
    const q = matrixSearchQuery.toLowerCase().trim()
    return data.wilayahBreakdown.filter((wil) =>
      wil.nama.toLowerCase().includes(q)
    )
  }, [data?.wilayahBreakdown, matrixSearchQuery])

  const handleExportMatrixCSV = () => {
    if (!data?.wilayahBreakdown) return
    const isFiltered = province && province.trim() !== '' && province.toLowerCase() !== 'nasional' && province.toLowerCase() !== 'semua provinsi'
    const geoColumnName = isFiltered ? 'Kabupaten/Kota' : 'Provinsi'
    const headers = [
      'NO',
      geoColumnName,
      'Jumlah Posyandu Valid',
      'Jumlah Posyandu Aktif',
      'Persentase Posyandu Aktif (%)',
      'Status Posyandu Aktif',
      'Jumlah Posyandu Siklus Hidup Yang Aktif',
      'Persentase Posyandu Siklus Hidup Yang Aktif (%)',
      'Status Posyandu Siklus Hidup Yang Aktif'
    ]
    const csvRows = filteredMatrixData.map((wil, idx) => [
      idx + 1,
      wil.nama,
      wil.valid,
      wil.aktif,
      `${wil.pctAktif}%`,
      wil.statusAktif,
      wil.siklusHidup,
      `${wil.pctSiklusHidup}%`,
      wil.statusSiklusHidup
    ])
    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `matriks_posyandu_${getRegionLabel().toLowerCase().replace(/\s+/g, '_')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff]">
      {/* Smart Search, Info Filter & Reset Button Grid */}
      <section className="grid grid-cols-1 md:grid-cols-[7fr_10fr_3fr] gap-4 w-full items-end z-20 relative">

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
              className="w-full rounded-2xl border border-slate-200 bg-white h-12 pl-11 pr-10 text-base font-bold shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-slate-800"
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
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-teal-50/50 transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 truncate">{sug.label}</span>
                      <span className={`rounded-lg border px-2 py-0.5 text-xs font-black uppercase tracking-wider ${badgeClass}`}>
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
                <p className="text-sm font-bold text-slate-500 italic">Tidak ditemukan wilayah dengan kata kunci "{searchQuery}"</p>
              </div>
            </>
          )}
        </div>

        {/* Column 2: Info Filter Panel */}
        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
            Info Filter Aktif
          </p>
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs shadow-sm h-auto min-h-12 py-2.5 w-full">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-700 font-bold w-full">
              <span className="hidden h-4 w-px bg-slate-300 sm:inline-block" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-800">
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold text-slate-500">Cakupan:</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{cakupan}</span>
                </span>
                <span className="text-slate-300" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold text-slate-500">Provinsi:</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{province || 'Semua Provinsi'}</span>
                </span>
                <span className="text-slate-300" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold text-slate-500">Kab/Kota:</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{kabupaten || 'Semua Kab/Kota'}</span>
                </span>
                <span className="text-slate-300" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold text-slate-500">Tipe Waktu:</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{selectedTimeframe}</span>
                </span>
                {selectedTimeframe !== 'Tahunan' && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">|</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-bold text-slate-500">Periode:</span>
                      <span className="font-black text-slate-800 uppercase text-xs">{selectedPeriod}</span>
                    </span>
                  </>
                )}
                <span className="text-slate-300" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold text-slate-500">Tahun:</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{selectedYear}</span>
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
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm transition-all outline-none h-12 uppercase tracking-wider ${showResetButton
              ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:-translate-y-0.5 active:scale-95'
              : 'border-slate-200 bg-slate-50/50 text-slate-450 cursor-not-allowed'
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
          {/* Card Body: Filter Controls */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-end gap-4 px-6 py-5">
            {/* Filter Wilayah */}
            <div className="flex-1 min-w-0 font-bold">
              <FilterDropdownBar
                onSummaryChange={handleSummaryChange}
                selectedProvinceName={province}
                selectedKabupatenName={kabupaten}
                showLabel={true}
              />
            </div>

            {/* Timeframe Dropdown */}
            <div className="w-full sm:w-[180px] shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-[0.12em] block mb-1.5">
                Tipe Waktu
              </span>
              <select
                value={selectedTimeframe}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedTimeframe(val)
                  setAiInsight(null)
                  if (val === 'Bulanan') {
                    setSelectedPeriod('Januari')
                  } else if (val === 'Triwulanan') {
                    setSelectedPeriod('TW 1')
                  } else {
                    setSelectedPeriod('')
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 h-[46px] text-sm font-black text-slate-800 hover:bg-slate-105 outline-none transition-all cursor-pointer"
              >
                <option value="Tahunan">Tahunan</option>
                <option value="Triwulanan">Triwulanan</option>
                <option value="Bulanan">Bulanan</option>
              </select>
            </div>

            {/* Period Dropdown */}
            {selectedTimeframe !== 'Tahunan' && (
              <div className="w-full sm:w-[170px] shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-[0.12em] block mb-1.5">
                  Pilih {selectedTimeframe === 'Bulanan' ? 'Bulan' : 'Triwulan'}
                </span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value)
                    setAiInsight(null)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 h-[46px] text-sm font-black text-slate-800 hover:bg-slate-100 outline-none transition-all cursor-pointer"
                >
                  {selectedTimeframe === 'Bulanan' ? (
                    <>
                      <option value="Januari">Januari</option>
                      <option value="Februari">Februari</option>
                      <option value="Maret">Maret</option>
                      <option value="April">April</option>
                      <option value="Mei">Mei</option>
                      <option value="Juni">Juni</option>
                      <option value="Juli">Juli</option>
                      <option value="Agustus">Agustus</option>
                      <option value="September">September</option>
                      <option value="Oktober">Oktober</option>
                      <option value="November">November</option>
                      <option value="Desember">Desember</option>
                    </>
                  ) : (
                    <>
                      <option value="TW 1">Triwulan 1</option>
                      <option value="TW 2">Triwulan 2</option>
                      <option value="TW 3">Triwulan 3</option>
                      <option value="TW 4">Triwulan 4</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Year Dropdown */}
            <div className="w-full sm:w-[150px] shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-[0.12em] block mb-1.5">
                Tahun
              </span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  setAiInsight(null)
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 h-[46px] text-sm font-black text-slate-800 hover:bg-slate-105 outline-none transition-all cursor-pointer"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            {/* Kategori Pin Peta */}
            <div className="w-full sm:w-[180px] shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-[0.12em] block mb-1.5">
                Kategori Pin Peta
              </span>
              <select
                value={selectedKategoriPosyandu}
                onChange={(e) => setSelectedKategoriPosyandu(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 h-[46px] text-sm font-black text-slate-800 hover:bg-slate-100 outline-none transition-all cursor-pointer"
              >
                <option value="all">Semua Posyandu</option>
                <option value="aktif">Posyandu Aktif</option>
                <option value="siklus-hidup">Siklus Hidup Aktif</option>
              </select>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 w-full">
        {/* Card 1: Posyandu Valid */}
        <article
          onClick={() => setSelectedCard('total_valid')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-inner">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-655 uppercase tracking-wider truncate">
                Posyandu Valid
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalValid)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold truncate">
                Terdaftar nasional
              </p>
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </article>

        {/* Card 2: Posyandu Aktif */}
        <article
          onClick={() => setSelectedCard('total_aktif')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-650 shadow-inner">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-655 uppercase tracking-wider truncate">
                Posyandu Aktif
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalAktif)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold flex items-center gap-0.5 truncate">
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                <span>{data?.totalValid ? ((data.totalAktif / data.totalValid) * 100).toFixed(1) : 0}% dari Valid</span>
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="18" cx="24" cy="24" />
              <circle
                className="text-teal-600 transition-all duration-500 ease-in-out"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - (loading ? 0 : (data?.totalValid ? (data.totalAktif / data.totalValid) : 0)))}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="18"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-sm font-black text-slate-950">
              {loading ? '...' : `${data?.totalValid ? Math.round((data.totalAktif / data.totalValid) * 100) : 0}%`}
            </span>
          </div>
        </article>

        {/* Card 3: Posyandu Siklus Hidup */}
        <article
          onClick={() => setSelectedCard('total_siklus')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-655 uppercase tracking-wider truncate">
                Siklus Hidup Aktif
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalSiklusHidupAktif)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold flex items-center gap-0.5 truncate">
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                <span>{data?.totalValid ? ((data.totalSiklusHidupAktif / data.totalValid) * 100).toFixed(1) : 0}% dari Valid</span>
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="18" cx="24" cy="24" />
              <circle
                className="text-emerald-600 transition-all duration-500 ease-in-out"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - (loading ? 0 : (data?.totalValid ? (data.totalSiklusHidupAktif / data.totalValid) : 0)))}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="18"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-sm font-black text-slate-950">
              {loading ? '...' : `${data?.totalValid ? Math.round((data.totalSiklusHidupAktif / data.totalValid) * 100) : 0}%`}
            </span>
          </div>
        </article>

        {/* Card 4: Kunjungan Rumah */}
        <article
          onClick={() => setSelectedCard('kunjungan_rumah')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-650 shadow-inner">
              <Home className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-655 uppercase tracking-wider truncate">
                Kunjungan Rumah
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalKunjunganRumah)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold truncate">
                {data?.totalSiklusHidupAktif ? ((data.totalKunjunganRumah / data.totalSiklusHidupAktif) * 100).toFixed(0) : 0}% dari Siklus Hidup
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="18" cx="24" cy="24" />
              <circle
                className="text-indigo-655 transition-all duration-500 ease-in-out"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - (loading ? 0 : (data?.totalSiklusHidupAktif ? (data.totalKunjunganRumah / data.totalSiklusHidupAktif) : 0)))}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="18"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-sm font-black text-slate-950">
              {loading ? '...' : `${data?.totalSiklusHidupAktif ? Math.round((data.totalKunjunganRumah / data.totalSiklusHidupAktif) * 100) : 0}%`}
            </span>
          </div>
        </article>

        {/* Card 5: Melapor ke Pustu */}
        <article
          onClick={() => setSelectedCard('lapor_pustu')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-inner">
              <FileText className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-655 uppercase tracking-wider truncate">
                Melapor Ke Pustu
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalLaporPustu)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold truncate">
                {data?.totalSiklusHidupAktif ? ((data.totalLaporPustu / data.totalSiklusHidupAktif) * 100).toFixed(0) : 0}% dari Siklus Hidup
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="18" cx="24" cy="24" />
              <circle
                className="text-amber-600 transition-all duration-500 ease-in-out"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - (loading ? 0 : (data?.totalSiklusHidupAktif ? (data.totalLaporPustu / data.totalSiklusHidupAktif) : 0)))}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="18"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-sm font-black text-slate-950">
              {loading ? '...' : `${data?.totalSiklusHidupAktif ? Math.round((data.totalLaporPustu / data.totalSiklusHidupAktif) * 100) : 0}%`}
            </span>
          </div>
        </article>
      </section>

      {/* Map + AI Insight Section */}
      <section className="w-full bg-[#fbffff] pb-5">
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-stretch">

          {/* ── AI Insight Card ── */}
          <article
            className="relative overflow-hidden border border-[#b7d9d8] p-5 xl:h-auto xl:w-[381px] flex flex-col flex-1"
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
                  Analisis Penilaian Kepatuhan & Keaktifan Layanan Posyandu
                </h3>
              </div>

              {/* Video Embed Container */}
              <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-xl border border-teal-200/60 bg-black/5 shadow-inner group/video shrink-0">
                <iframe
                  src="https://app.heygen.com/embeds/07445718ccb54423a319f7df5d830a0f"
                  title="Check out a new AI Video I just made!"
                  className="absolute inset-0 h-full w-full border-0"
                  allow="encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>

              {/* Body text */}
              <div className="mt-3 rounded-xl border-l-[3px] border-l-[#16b7b2] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto flex-1 min-h-[140px]">
                <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px] whitespace-pre-line text-slate-800">
                  {aiInsight || 'Klik tombol di bawah untuk membuat analisis.'}
                </p>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-[rgba(0,0,0,0.08)]" />

              <div className="mt-auto shrink-0">
                <button
                  onClick={() => {
                    if (!aiInsight) {
                      generateAiInsight()
                    } else {
                      setIsModalOpen(true)
                    }
                  }}
                  disabled={generatingAi}
                  className="group flex w-full items-center justify-center gap-3 rounded-[14px] bg-[#047D78] hover:bg-[#03605c] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(4,125,120,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(4,125,120,0.42)] active:scale-[0.99] disabled:cursor-wait"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                    {generatingAi ? <Loader2 className="h-4 w-4 animate-spin text-[#047D78]" /> : <Sparkles className="h-4 w-4 text-[#047D78]" />}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em]">
                    {generatingAi ? 'Sedang Menganalisis...' : 'Lihat Analisis Lengkap'}
                  </span>
                </button>
              </div>
            </div>
          </article>

          {/* Map Card */}
          <article
            className="border border-[#cdcdcd] bg-white p-4 xl:h-auto flex flex-col flex-1"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            <h3 className="text-2xl font-black leading-tight text-[#2f2f2f] sm:text-3xl uppercase">
              SEBARAN SPASIAL POSYANDU - {getRegionLabel()}
            </h3>
            <p className="mt-1 text-base font-semibold text-[#4b4b4b] sm:text-lg">
              Pemetaan geografis sebaran posyandu serta pencapaian kinerjanya (Aktif, Kunjungan Rumah, Melapor ke Pustu) di wilayah {getRegionLabel()}.
            </p>
            <div className="mt-4 flex-1 min-h-[300px]">
              <DisasterMap
                markers={filteredMarkers}
                userScope={activeUserScope}
                onSelectProvince={(prov) => setProvince(prov)}
                isGuest={!token || !user}
              />
            </div>
          </article>

        </div>
      </section>

      {/* ── Middle Analytics Row (Growth & Proportions) ── */}
      <section className="w-full bg-[#fbffff] pb-5">
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
              <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">Analitik Pertumbuhan & Kepatuhan Layanan</h3>
              <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">Data Terdaftar 2021–2026 · Standar Posyandu Siklus Hidup yang Aktif</p>
            </div>
            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-3 py-1 uppercase tracking-wider">{getRegionLabel()}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 flex-1 min-h-[340px]">
            {/* Sub-column 1: Growth Trend Line Chart */}
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">Tren Pertumbuhan Registrasi & Keaktifan</h4>
                <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1 leading-relaxed">
                  Jumlah posyandu Valid, Aktif, dan Siklus Hidup Aktif secara digital tahun 2021 s.d. 2026.
                </p>
              </div>
              <div className="flex-1 min-h-[280px] w-full">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.yearlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="tahun" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.97)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                          fontSize: '14px',
                          fontWeight: 700,
                        }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, fontWeight: 800, paddingTop: 10 }} />
                      <Line name="Posyandu Valid" type="monotone" dataKey="valid" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} />
                      <Line name="Posyandu Aktif" type="monotone" dataKey="aktif" stroke="#0f8f96" strokeWidth={3} dot={{ r: 3 }} />
                      <Line name="Siklus Hidup Aktif" type="monotone" dataKey="siklusHidup" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Sub-column 2: Donut Chart — Keaktifan */}
            <div className="flex flex-col h-full border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-8">
              <div className="mb-4">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">Proporsi Keaktifan Posyandu</h4>
                <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1 leading-relaxed">
                  Perbandingan posyandu aktif bulanan terhadap total posyandu valid.
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
                          <Cell fill="#0f8f96" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [`${Number(value).toLocaleString('id-ID')} Posyandu (${props.payload.pct}%)`, name]}
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.97)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                            fontSize: '14px',
                            fontWeight: 700,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-slate-950 leading-none">
                        {donutData[0]?.pct}%
                      </span>
                      <span className="text-xs font-black uppercase text-slate-600 tracking-wider mt-1">
                        Aktif
                      </span>
                    </div>
                  </>
                )}
              </div>
              {/* Donut Legend */}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0f8f96]" />
                  <span className="text-xs font-bold text-slate-805">Aktif ({donutData[0]?.value.toLocaleString('id-ID')})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e2e8f0]" />
                  <span className="text-xs font-bold text-slate-805">Tidak Aktif ({donutData[1]?.value.toLocaleString('id-ID')})</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* ── Lower Analytics Row (Stacked Wilayah & Funnel) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full bg-[#fbffff] pb-5">

        {/* Horizontal Stacked Bar Chart per Wilayah - screenshot 2 matching */}
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
              Sebaran Keaktifan per Wilayah
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
              Jumlah Posyandu Aktif berbanding Posyandu Valid berdasarkan sebaran wilayah.
            </p>
          </div>
          <div className="flex-1 min-h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={regionalStackedData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 800 }} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString('id-ID')} Posyandu`]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, fontWeight: 800 }} />
                  <Bar name="Aktif" dataKey="aktif" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} maxBarSize={18} />
                  <Bar name="Tidak Aktif" dataKey="tidakAktif" stackId="a" fill="#eab308" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Funnel Indicators Chart */}
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
              Funnel Pencapaian Indikator
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
              Langkah konversi pencapaian mutu layanan Posyandu (Valid ke Aktif ke pelaporan Pustu).
            </p>
          </div>
          <div className="flex-1 min-h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={data?.funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <YAxis type="category" dataKey="stage" width={110} axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 800 }} />
                  <Tooltip
                    formatter={(value, name, props) => [`${Number(value).toLocaleString('id-ID')} Posyandu (${props.payload.percentage}%)`]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {data?.funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      {/* ── Matrix Table Section (screenshot 1 matching) ── */}
      <section className="w-full bg-[#fbffff] pt-2 pb-5">
        <article
          className="border border-[#cdcdcd] bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
            <div>
              <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
                MATRIKS POSYANDU AKTIF DAN POSYANDU SIKLUS HIDUP YANG AKTIF - {getRegionLabel()}
              </h3>
              <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
                Rekapitulasi status keaktifan (Target ≥80%) dan integrasi layanan Siklus Hidup yang Aktif (Target ≥75%).
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[240px] sm:flex-none">
                <input
                  type="text"
                  value={matrixSearchQuery}
                  onChange={(e) => setMatrixSearchQuery(e.target.value)}
                  placeholder={province ? 'Cari Kabupaten/Kota...' : 'Cari Provinsi...'}
                  className="w-full sm:w-[280px] rounded-full border border-slate-200 bg-white h-11 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Toggle Chart/Table Button */}
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')}
                className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 h-11 text-sm font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
                title={viewMode === 'table' ? 'Lihat Visualisasi Chart' : 'Lihat Matriks Tabel'}
              >
                {viewMode === 'table' ? (
                  <>
                    <BarChart3 className="h-4 w-4 text-[#047D78]" />
                    <span>Visualisasi Chart</span>
                  </>
                ) : (
                  <>
                    <TableIcon className="h-4 w-4 text-[#047D78]" />
                    <span>Matriks Tabel</span>
                  </>
                )}
              </button>

              {/* Export CSV Button */}
              <button
                onClick={handleExportMatrixCSV}
                className="flex items-center justify-center gap-2 rounded-full bg-[#047D78] hover:bg-[#036662] text-white px-6 h-11 text-sm font-bold shadow-[0_4px_10px_rgba(4,125,120,0.15)] transition active:scale-[0.98] cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm md:text-base border-collapse text-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-850 font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Provinsi / Wilayah</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Posyandu Valid</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Posyandu Aktif</th>
                    <th className="py-3.5 px-4 text-center">Persentase Posyandu Aktif</th>
                    <th className="py-3.5 px-4 text-center">Status Posyandu Aktif</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Posyandu Siklus Hidup Yang Aktif</th>
                    <th className="py-3.5 px-4 text-center">Persentase Posyandu Siklus Hidup Yang Aktif</th>
                    <th className="py-3.5 px-4 text-center">Status Posyandu Siklus Hidup Yang Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        Memuat data matriks...
                      </td>
                    </tr>
                  ) : !data?.wilayahBreakdown || data.wilayahBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        Tidak ada data wilayah untuk filter terpilih.
                      </td>
                    </tr>
                  ) : filteredMatrixData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic font-semibold">
                        Tidak ada data wilayah yang cocok dengan "{matrixSearchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredMatrixData.map((wil, idx) => {
                      const activeBadgeColor = wil.statusAktif === 'MEMENUHI'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                        : 'bg-red-50 text-red-700 border-red-150'

                      const lifecycleBadgeColor = wil.statusSiklusHidup === 'MEMENUHI'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                        : 'bg-red-50 text-red-700 border-red-150'

                      return (
                        <tr key={idx} className="hover:bg-slate-100/70 transition-colors odd:bg-slate-50">
                          <td className="py-4 px-4 text-center text-slate-700 font-bold">{idx + 1}</td>
                          <td className="py-4 px-4 font-extrabold text-slate-950 uppercase tracking-wide">
                            {wil.nama}
                          </td>
                          <td className="py-4 px-4 text-center font-extrabold text-slate-950">
                            {wil.valid.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-center text-teal-800 font-extrabold">
                            {wil.aktif.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-center font-black text-slate-950">
                            {wil.pctAktif}%
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center rounded-lg border px-3.5 py-1.5 text-xs font-black uppercase tracking-wide ${activeBadgeColor}`}>
                              {wil.statusAktif === 'MEMENUHI' ? 'Memenuhi' : 'Tidak Memenuhi'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center text-emerald-800 font-extrabold">
                            {wil.siklusHidup.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-center font-black text-slate-950">
                            {wil.pctSiklusHidup}%
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center rounded-lg border px-3.5 py-1.5 text-xs font-black uppercase tracking-wide ${lifecycleBadgeColor}`}>
                              {wil.statusSiklusHidup === 'MEMENUHI' ? 'Memenuhi' : 'Tidak Memenuhi'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="w-full py-4">
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
                </div>
              ) : !filteredMatrixData || filteredMatrixData.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center text-slate-500 italic">
                  Tidak ada data wilayah untuk filter terpilih.
                </div>
              ) : (
                <div className="w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-4 sm:p-6">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="text-base font-black text-slate-900 uppercase">
                        Komparasi Keaktifan vs Siklus Hidup Posyandu Terintegrasi
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-bold">
                        Grafik batang komparatif status keaktifan posyandu (Target ≥80%) dan integrasi Siklus Hidup (Target ≥75%) untuk setiap wilayah.
                      </p>
                    </div>
                  </div>

                  <div className="h-[480px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredMatrixData}
                        margin={{ top: 20, right: 10, left: -10, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="nama"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                          unit="%"
                          domain={[0, 100]}
                        />
                        <Tooltip content={<CustomPosyanduTooltip />} />
                        <Legend
                          verticalAlign="top"
                          height={45}
                          iconType="circle"
                          onClick={handleLegendClick}
                          formatter={formatLegendText}
                          wrapperStyle={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            paddingBottom: '20px',
                          }}
                        />

                        <ReferenceLine
                          y={80}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          label={{
                            value: 'Target Keaktifan ≥80%',
                            position: 'insideBottomRight',
                            fill: '#ef4444',
                            fontSize: 10,
                            fontWeight: 'bold',
                          }}
                        />
                        <ReferenceLine
                          y={75}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          label={{
                            value: 'Target Siklus Hidup ≥75%',
                            position: 'insideBottomLeft',
                            fill: '#10b981',
                            fontSize: 10,
                            fontWeight: 'bold',
                          }}
                        />

                        <Bar
                          name="Persentase Posyandu Aktif"
                          dataKey="pctAktif"
                          fill="#047D78"
                          radius={[4, 4, 0, 0]}
                          hide={!visibleSeries.pctAktif}
                          maxBarSize={30}
                        />
                        <Bar
                          name="Persentase Siklus Hidup Aktif"
                          dataKey="pctSiklusHidup"
                          fill="#8c5ce7"
                          radius={[4, 4, 0, 0]}
                          hide={!visibleSeries.pctSiklusHidup}
                          maxBarSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </article>
      </section>

      {/* ── Interactive Breakdown Search and Export ── */}
      {/*
      <section className="w-full bg-[#fbffff] pb-8">
        <PerformanceBreakdownTable selectedProvince={province} />
      </section>
      */}

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
                  {selectedCard === 'total_valid' && `Daftar Posyandu Valid / Terdaftar - ${getRegionLabel()}`}
                  {selectedCard === 'total_aktif' && `Daftar Posyandu Aktif Operasional - ${getRegionLabel()}`}
                  {selectedCard === 'total_siklus' && `Daftar Posyandu Siklus Hidup yang Aktif - ${getRegionLabel()}`}
                  {selectedCard === 'kunjungan_rumah' && `Detail Kunjungan Rumah oleh Kader - ${getRegionLabel()}`}
                  {selectedCard === 'lapor_pustu' && `Detail Pelaporan Berkas ke Pustu - ${getRegionLabel()}`}
                  {selectedCard === 'kepatuhan' && `Indeks Kepatuhan Target Kabupaten - ${getRegionLabel()}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Menampilkan data rincian dari fasilitas kesehatan tingkat pertama yang terdaftar di wilayah ini.
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
                <table className="w-full text-left text-sm border-collapse text-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-850 font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3">Nama Posyandu</th>
                      <th className="py-2.5 px-3">Kecamatan</th>
                      <th className="py-2.5 px-3 text-center">Karakteristik Wilayah</th>
                      <th className="py-2.5 px-3 text-center">Status Keaktifan</th>
                      <th className="py-2.5 px-3 text-center">Kunjungan Rumah (%)</th>
                      <th className="py-2.5 px-3 text-center">Lapor Pustu (%)</th>
                      <th className="py-2.5 px-3 text-center">Integrasi Siklus Hidup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                    {data?.markers.map((item, idx) => {
                      const isSiklus = item.status_evaluasi === 'Baik'

                      return (
                        <tr key={idx} className="hover:bg-slate-100/70 transition-colors odd:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wide">
                            {item.jenis_bencana}
                          </td>
                          <td className="py-3 px-3">
                            Kec. {item.kecamatan}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-xs font-black text-slate-750 bg-slate-100 px-2.5 py-1 rounded border">
                              {item.karakteristik}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-wider ${item.is_ranap ? 'bg-teal-50 text-teal-700 border-teal-150' : 'bg-slate-50 text-slate-450 border-slate-200'
                              }`}>
                              {item.is_ranap ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            {item.alkes_pct}%
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            {item.obat_pct}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-wider ${isSiklus ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'
                              }`}>
                              {isSiklus ? 'Lengkap' : 'Belum Lengkap'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-[#fafcfc] text-center text-[10px] text-slate-400">

              Kementerian Kesehatan Republik Indonesia · Sistem Informasi Evaluasi Kinerja Posyandu
            </div>
          </div>
        </div>
      )}

      {/* AI Detailed Analysis Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setActiveTab('text') // Reset tab on close
        }}
        title={`Analisis AI Detail: ${getRegionLabel()}`}
        size="lg"
      >
        {/* Dropdown Histori Analisis */}
        {historyList.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-teal-650 animate-[spin_4s_linear_infinite]" />
              Pilih Riwayat Analisis:
            </span>
            <select
              value={selectedHistoryId}
              onChange={(e) => generateAiInsight(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
            >
              {historyList.map((hist, idx) => {
                const dateStr = new Date(hist.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' WIB'
                return (
                  <option key={hist.id} value={hist.id}>
                    {idx === 0 ? `[Terbaru] - ${dateStr}` : dateStr}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mb-6 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'text'
              ? 'border-teal-650 text-teal-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <FileText className="h-4 w-4" />
            Laporan Analisis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'video'
              ? 'border-teal-650 text-teal-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <Video className="h-4 w-4" />
            AI Video Presenter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'info'
              ? 'border-teal-650 text-teal-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <Info className="h-4 w-4" />
            Informasi Sumber Data & AI
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Detailed analysis / Video section (left) */}
          <div className="flex-1 space-y-4 min-w-0">
            {activeTab === 'text' ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 shadow-inner">
                <div className="prose max-w-none text-slate-700">
                  {renderMarkdown(detailedAnalysis) || (
                    <p className="text-slate-400 italic">Tidak ada analisis terperinci yang tersedia.</p>
                  )}
                </div>
              </div>
            ) : activeTab === 'video' ? (
              <div className="space-y-4">
                {/* Video Player Box */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg">
                  <iframe
                    src="https://app.heygen.com/embeds/07445718ccb54423a319f7df5d830a0f"
                    title="Check out a new AI Video I just made!"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>

                {/* Audio Waveform/Visualizer & Subtitles Explaining the AI analysis */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-0.5">
                      <span className={`h-3 w-1 bg-indigo-500 rounded-full ${videoStatus === 'COMPLETED' ? 'animate-[bounce_1.2s_infinite_100ms]' : ''}`} />
                      <span className={`h-5 w-1 bg-indigo-650 rounded-full ${videoStatus === 'COMPLETED' ? 'animate-[bounce_1.2s_infinite_200ms]' : ''}`} />
                      <span className={`h-4 w-1 bg-indigo-500 rounded-full ${videoStatus === 'COMPLETED' ? 'animate-[bounce_1.2s_infinite_300ms]' : ''}`} />
                      <span className={`h-2 w-1 bg-indigo-400 rounded-full ${videoStatus === 'COMPLETED' ? 'animate-[bounce_1.2s_infinite_400ms]' : ''}`} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                      Naskah Presenter AI (Virtual Speaker Script)
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">
                    "{videoScript || 'Membacakan ringkasan analisis untuk wilayah terpilih...'}"
                  </p>
                </div>
              </div>
            ) : (
              // activeTab === 'info'
              <div className="space-y-4">
                {(() => {
                  if (!data) return null
                  const totalValid = data.totalValid || 0
                  const keaktifanPct = totalValid ? Math.round((data.totalAktif / totalValid) * 100) : 0
                  const lifecyclePct = totalValid ? Math.round((data.totalSiklusHidupAktif / totalValid) * 100) : 0
                  const isMemenuhi = data.statusTarget === 'MEMENUHI'

                  const warnings = []
                  if (keaktifanPct < 80) {
                    warnings.push(`Tingkat keaktifan bulanan (${keaktifanPct}%) berada di bawah target standar nasional 80%`)
                  }
                  if (lifecyclePct < 60) {
                    warnings.push(`Tingkat keaktifan siklus hidup (${lifecyclePct}%) di bawah target optimal 60%`)
                  }
                  if (!isMemenuhi) {
                    warnings.push(`Pencapaian target kepatuhan (${data?.pctKabKotaMemenuhi || 0}%) belum memenuhi target nasional (${data?.targetPct || 0}%)`)
                  }

                  let severity: 'critical' | 'warning' | 'safe' = 'safe'
                  if (keaktifanPct < 60 || lifecyclePct < 40 || (!isMemenuhi && (data.pctKabKotaMemenuhi || 0) < 10)) {
                    severity = 'critical'
                  } else if (keaktifanPct < 80 || lifecyclePct < 60 || !isMemenuhi) {
                    severity = 'warning'
                  }

                  return (
                    <div className={`p-5 rounded-2xl border flex gap-3.5 items-start shadow-sm leading-relaxed ${severity === 'critical'
                      ? 'bg-rose-50 border-rose-100 text-rose-800'
                      : severity === 'warning'
                        ? 'bg-amber-50 border-amber-100 text-amber-800'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      }`}>
                      {severity === 'critical' ? (
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                      ) : severity === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h5 className="font-extrabold text-sm mb-1 uppercase tracking-wide">
                          {severity === 'critical'
                            ? 'Rekomendasi Utama: Perlu Perhatian Khusus (Kritis)'
                            : severity === 'warning'
                              ? 'Rekomendasi Utama: Status Siaga / Perlu Antisipasi'
                              : 'Rekomendasi Utama: Kondisi Baik & Stabil'}
                        </h5>
                        <p className="text-xs font-semibold">
                          {severity === 'critical'
                            ? `Wilayah ini berada dalam kondisi KRITIS dan memerlukan intervensi darurat segera karena: ${warnings.join(', serta ')}.`
                            : severity === 'warning'
                              ? `Wilayah ini berada dalam status SIAGA (perlu perhatian sedang) karena: ${warnings.join(', serta ')}.`
                              : `Kinerja Posyandu di wilayah ini dalam kondisi prima. Seluruh indikator utama (keaktifan bulanan, siklus hidup, dan pencapaian target kepatuhan) telah memenuhi target standar nasional.`}
                        </p>
                      </div>
                    </div>
                  )
                })()}

                {/* Disclaimer Info Box */}
                <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/20 text-blue-900 text-xs font-semibold space-y-3.5 shadow-sm leading-relaxed">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Info className="h-4 w-4 shrink-0" />
                    <span className="font-black uppercase tracking-wider">Informasi Generate AI</span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    Analisis Detail AI ini merupakan hasil generate otomatis berdasarkan kalkulasi database Posyandu untuk wilayah <strong className="font-extrabold">{getRegionLabel()}</strong>. AI ini dikonfigurasi khusus hanya untuk menganalisis data dashboard <strong className="font-extrabold">{getRegionLabel()}</strong>.
                  </p>
                  {aiCreatedAt && (
                    <p className="text-[11px] text-blue-800/80 font-bold flex items-center gap-1.5 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                      🕒 Yang Anda lihat saat ini adalah hasil generate AI pada tanggal <strong className="font-extrabold">{formattedAiTime}</strong>.
                    </p>
                  )}
                  <div className="border-t border-blue-100 pt-3 text-[10.5px] text-blue-700/80 font-medium leading-relaxed">
                    <strong className="font-bold">DISCLAIMER:</strong> Semua informasi, estimasi tren, dan rekomendasi taktis yang disajikan merupakan analisis dari model AI (Google Gemini). Hasil analisis ini ditujukan sebagai referensi pembantu pengambilan keputusan dinas kesehatan setempat dan tidak menggantikan keputusan medis formal maupun regulasi resmi dari kementerian terkait.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key metadata & highlights section (right) */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-4">
            <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5">
              <h4 className="text-sm font-black uppercase text-teal-800 tracking-wider mb-3">Ringkasan Wilayah</h4>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-teal-50 pb-2">
                  <span className="text-slate-500 font-bold">Total Valid:</span>
                  <span className="font-extrabold text-slate-800">{data?.totalValid?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between border-b border-teal-50 pb-2">
                  <span className="text-slate-500 font-bold">Keaktifan:</span>
                  <span className="font-extrabold text-slate-800">
                    {data?.totalValid ? Math.round((data.totalAktif / data.totalValid) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-teal-50 pb-2">
                  <span className="text-slate-500 font-bold">Siklus Hidup:</span>
                  <span className="font-extrabold text-slate-800">
                    {data?.totalValid ? Math.round((data.totalSiklusHidupAktif / data.totalValid) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-teal-50 pb-2">
                  <span className="text-slate-500 font-bold">Kunjungan Rumah:</span>
                  <span className="font-extrabold text-slate-800">{data?.totalKunjunganRumah?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500 font-bold">Target Kepatuhan:</span>
                  <span className={`font-black ${data?.statusTarget === 'MEMENUHI' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {data?.pctKabKotaMemenuhi}% / {data?.targetPct}%
                  </span>
                </div>
              </div>
            </div>

            {aiRecommendations && aiRecommendations.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <h4 className="text-sm font-black uppercase text-slate-800 tracking-wider mb-3">Rekomendasi</h4>
                <ul className="space-y-3">
                  {aiRecommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5 border-l-2 border-l-[#4d90d0]"
                      dangerouslySetInnerHTML={{ __html: rec }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

