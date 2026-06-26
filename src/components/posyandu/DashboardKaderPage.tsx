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
  ArrowUpDown,
  Download,
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
import { getKaderStats, type KaderDashboardData, type KaderWilayahItem } from '@/lib/kaderData'

// Dynamically import map component
const DisasterMap = dynamic(() => import('./DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl bg-slate-100/50 backdrop-blur-sm border border-slate-200">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#534AB7]" />
        <p className="text-sm text-slate-500 font-semibold">Memuat peta interaktif...</p>
      </div>
    </div>
  ),
})

export default function DashboardKaderPage() {
  const { token, isInitialized, user } = useAuthStore()

  const [data, setData] = useState<KaderDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

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

    // Table search & sort states
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string>('posyandu_total')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // sync locked user scope
  const isProvLocked = user?.wilayah_scope?.mode === 'provinsi'
  const isKabLocked = user?.wilayah_scope?.mode === 'kabupaten'

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
    return undefined
  }, [province, kabupaten])

  const getRegionLabel = useCallback(() => {
    if (kabupaten) {
      return `${kabupaten.toUpperCase()}, PROV. ${province.toUpperCase()}`
    }
    if (province) {
      return `PROV. ${province.toUpperCase()}`
    }
    return cakupan.toUpperCase()
  }, [province, kabupaten, cakupan])

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
      const res = getKaderStats(province, kabupaten, selectedYear, selectedTimeframe, selectedPeriod)
      setData(res)
    } catch (err) {
      console.error('[kader-stats]', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }, [province, kabupaten, selectedYear, selectedTimeframe, selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // AI Insight Generator
  const generateAiInsight = () => {
    if (!data) return
    setGeneratingAi(true)
    setTimeout(() => {
      if (data.totalKader === 0) {
        setAiInsight(`[ANALISIS KADER POSYANDU]
Tidak ada data kader Posyandu untuk wilayah ini.`)
        setGeneratingAi(false)
        return
      }

      const totalKader = data.totalKader
      const kaderTerlatih = data.kaderTerlatih
      const pctTerlatih = data.pctKaderTerlatih
      const totalVisits = data.totalKunjunganRumah

      let analysisText = `[ANALISIS KERJA & KOMPETENSI KADER POSYANDU TAHUN ${selectedYear}]`
      analysisText += `\nDi wilayah ${getRegionLabel()}, tercatat sebanyak ${totalKader.toLocaleString('id-ID')} kader aktif.`
      analysisText += `\n- Kader Terlatih (25 Kompetensi Dasar): ${kaderTerlatih.toLocaleString('id-ID')} (${pctTerlatih}%).`
      analysisText += `\n- Rerata Pemenuhan Indeks Kompetensi: ${data.avgKompetensiPct}%.`
      analysisText += `\n- Total Kunjungan Rumah Terlaksana: ${totalVisits.toLocaleString('id-ID')} kunjungan.`
      
      let recommendations = `\n\nREKOMENDASI PENGEMBANGAN KADER:`
      if (pctTerlatih < 75) {
        recommendations += `\n1. Tingkatkan program pelatihan sertifikasi 25 kompetensi dasar kader melalui modul digital dan workshop Puskesmas.`
      }
      if (data.avgKompetensiPct < 70) {
        recommendations += `\n2. Fokuskan pembinaan kader pada modul yang memiliki persentase rendah (misalnya Layanan Usia Dewasa & Lansia).`
      }
      recommendations += `\n3. Lakukan monitoring berkala pelaksanaan Kunjungan Rumah agar setiap Posyandu dapat mencakup seluruh sasaran wilayah kerja.`

      setAiInsight(analysisText + recommendations)
      setGeneratingAi(false)
    }, 1200)
  }

  // Pre-generate AI insight
  useEffect(() => {
    if (data && !aiInsight) {
      generateAiInsight()
    }
  }, [data])

    const getCardValue = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0'
    return val.toLocaleString('id-ID')
  }

    // Filter and sort matrix table data
  const processedTableData = useMemo(() => {
    if (!data?.wilayahBreakdown) return []
    let result = [...data.wilayahBreakdown]

    if (tableSearchQuery.trim() !== '') {
      const q = tableSearchQuery.toLowerCase().trim()
      result = result.filter(item => item.nama.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      const getSortVal = (item: KaderWilayahItem, key: string) => {
        if (key === 'nama') return item.nama
        if (key === 'jumlahPosyandu') return item.jumlahPosyandu
        if (key === 'totalKader') return item.totalKader
        if (key === 'kunjunganRumah') return item.kunjunganRumah
        
        // Posyandu keys
        if (key === 'posyandu_total') return item.kaderPosyandu.total
        if (key === 'posyandu_purwa') return item.kaderPosyandu.purwa
        if (key === 'posyandu_purwaPct') return item.kaderPosyandu.purwaPct
        if (key === 'posyandu_madya') return item.kaderPosyandu.madya
        if (key === 'posyandu_madyaPct') return item.kaderPosyandu.madyaPct
        if (key === 'posyandu_utama') return item.kaderPosyandu.utama
        if (key === 'posyandu_utamaPct') return item.kaderPosyandu.utamaPct
        if (key === 'posyandu_belum') return item.kaderPosyandu.belum
        if (key === 'posyandu_belumPct') return item.kaderPosyandu.belumPct
        
        // Pustu keys
        if (key === 'pustu_total') return item.kaderPustu.total
        if (key === 'pustu_purwa') return item.kaderPustu.purwa
        if (key === 'pustu_purwaPct') return item.kaderPustu.purwaPct
        if (key === 'pustu_madya') return item.kaderPustu.madya
        if (key === 'pustu_madyaPct') return item.kaderPustu.madyaPct
        if (key === 'pustu_utama') return item.kaderPustu.utama
        if (key === 'pustu_utamaPct') return item.kaderPustu.utamaPct
        if (key === 'pustu_belum') return item.kaderPustu.belum
        if (key === 'pustu_belumPct') return item.kaderPustu.belumPct
        
        return 0
      }

      const aVal = getSortVal(a, sortKey)
      const bVal = getSortVal(b, sortKey)

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      const aNum = Number(aVal) || 0
      const bNum = Number(bVal) || 0
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    })

    return result
  }, [data?.wilayahBreakdown, tableSearchQuery, sortKey, sortDirection])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const renderSortIndicator = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30 hover:opacity-100 transition-opacity inline-block align-middle" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3 text-indigo-700 inline-block align-middle" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-indigo-700 inline-block align-middle" />
    )
  }

  const handleExportKaderCSV = () => {
    if (!data?.wilayahBreakdown) return
    const isFiltered = province && province.trim() !== '' && province.toLowerCase() !== 'nasional' && province.toLowerCase() !== 'semua provinsi'
    const geoColumnName = isFiltered ? 'Kabupaten/Kota' : 'Provinsi'
    const headers = [
      'NO',
      geoColumnName,
      'Posyandu Total Kader',
      'Posyandu Purwa',
      'Posyandu Purwa (%)',
      'Posyandu Madya',
      'Posyandu Madya (%)',
      'Posyandu Utama',
      'Posyandu Utama (%)',
      'Posyandu Belum Ada Status',
      'Posyandu Belum Ada Status (%)',
      'Pustu Total Kader',
      'Pustu Purwa',
      'Pustu Purwa (%)',
      'Pustu Madya',
      'Pustu Madya (%)',
      'Pustu Utama',
      'Pustu Utama (%)',
      'Pustu Belum Ada Status',
      'Pustu Belum Ada Status (%)',
    ]

    const csvRows = processedTableData.map((item, idx) => [
      idx + 1,
      item.nama,
      item.kaderPosyandu.total,
      item.kaderPosyandu.purwa,
      `${item.kaderPosyandu.purwaPct}%`,
      item.kaderPosyandu.madya,
      `${item.kaderPosyandu.madyaPct}%`,
      item.kaderPosyandu.utama,
      `${item.kaderPosyandu.utamaPct}%`,
      item.kaderPosyandu.belum,
      `${item.kaderPosyandu.belumPct}%`,
      item.kaderPustu.total,
      item.kaderPustu.purwa,
      `${item.kaderPustu.purwaPct}%`,
      item.kaderPustu.madya,
      `${item.kaderPustu.madyaPct}%`,
      item.kaderPustu.utama,
      `${item.kaderPustu.utamaPct}%`,
      item.kaderPustu.belum,
      `${item.kaderPustu.belumPct}%`,
    ])

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    
    const scopeName = isFiltered ? `kabupaten_${province.toLowerCase()}` : 'nasional'
    link.setAttribute(
      'download',
      `breakdown_kader_posyandu_${scopeName}_${new Date().toISOString().slice(0, 10)}.csv`
    )
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
              className="w-full rounded-2xl border border-slate-200 bg-white h-12 pl-11 pr-10 text-base font-bold shadow-sm outline-none placeholder:text-slate-400 focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] transition-all text-slate-800"
            />
            {isSearching ? (
              <Loader2 className="absolute right-4 h-4 w-4 animate-spin text-[#534AB7]" />
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

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[320px] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-black text-slate-800 hover:bg-[#534AB7]/5 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 truncate">{sug.label}</span>
                    <span className="rounded-lg border px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-150">
                      {sug.type}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Column 2: Info Filter */}
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

        {/* Column 3: Reset Filter */}
        <div className="w-full">
          <p className="mb-2 text-xs md:text-sm font-black uppercase tracking-widest text-[#534AB7] md:invisible">
            Aksi
          </p>
          <button
            onClick={handleResetFilter}
            disabled={!showResetButton}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm md:text-base font-black shadow-sm transition-all outline-none h-12 uppercase tracking-wider ${
              showResetButton
                ? 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:-translate-y-0.5 active:scale-95'
                : 'border-slate-200 bg-slate-50/50 text-slate-455 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span>RESET FILTER</span>
          </button>
        </div>
      </section>

      {/* Filter Card */}
      <section className="w-full bg-[#fbffff] pt-2 pb-4">
        <article
          className="border border-[#cdcdcd] bg-white shadow-[0_10px_30px_rgba(83,74,183,0.03)] w-full overflow-visible"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 h-[46px] text-sm font-black text-slate-800 hover:bg-slate-100 outline-none transition-all cursor-pointer"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 h-[46px] text-sm font-black text-slate-800 hover:bg-slate-100 outline-none transition-all cursor-pointer"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        </article>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
        {/* Card 1: Total Kader */}
        <article
          onClick={() => setSelectedCard('total_kader')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-655 shadow-inner">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-600 uppercase tracking-wider truncate">
                Total Kader Posyandu
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalKader)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold truncate">
                Rerata ~5 kader per Posyandu
              </p>
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </article>

        {/* Card 2: Kader Terlatih */}
        <article
          onClick={() => setSelectedCard('kader_terlatih')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-600 uppercase tracking-wider truncate">
                Kader Terlatih (25 Aspek)
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.kaderTerlatih)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold flex items-center gap-0.5 truncate">
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                <span>{data?.pctKaderTerlatih}% dari total kader</span>
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
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - (loading ? 0 : (data?.pctKaderTerlatih ? (data.pctKaderTerlatih / 100) : 0)))}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="18"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-xs md:text-sm font-black text-slate-900">
              {loading ? '...' : `${data?.pctKaderTerlatih || 0}%`}
            </span>
          </div>
        </article>

        {/* Card 3: Kompetensi Kader */}
        <article
          onClick={() => setSelectedCard('kompetensi')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-655 shadow-inner">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-600 uppercase tracking-wider truncate">
                Rata-rata Kompetensi
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                  {loading ? '...' : `${data?.avgKompetensiPct}%`}
                </span>
                {!loading && (
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    (data?.avgKompetensiPct || 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {(data?.avgKompetensiPct || 0) >= 80 ? 'Lolos' : 'Gagal'}
                  </span>
                )}
              </div>
              <p className="text-sm md:text-base text-slate-500 font-extrabold truncate">
                Target Kompetensi: <b className="text-slate-800">≥80%</b>
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="18" cx="24" cy="24" />
              <circle
                className="text-purple-600 transition-all duration-500 ease-in-out"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - (loading ? 0 : (data?.avgKompetensiPct ? (data.avgKompetensiPct / 100) : 0)))}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="18"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-xs md:text-sm font-black text-slate-900">
              {loading ? '...' : `${data?.avgKompetensiPct || 0}%`}
            </span>
          </div>
        </article>

        {/* Card 4: Kunjungan Rumah */}
        <article
          onClick={() => setSelectedCard('kunjungan')}
          className="flex items-center justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px] h-full"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706] shadow-inner">
              <Home className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <span className="text-sm md:text-base font-black text-slate-600 uppercase tracking-wider truncate">
                Kunjungan Rumah Terlaksana
              </span>
              <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
                {loading ? '...' : getCardValue(data?.totalKunjunganRumah)}
              </span>
              <p className="text-sm md:text-base text-slate-500 font-bold truncate">
                Rerata bulanan kunjungan berkala
              </p>
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </article>
      </section>

      {/* Map + AI Insight */}
      <section className="w-full bg-[#fbffff] pb-5">
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-start">

          <div className="space-y-3">
            {/* AI Insight Card */}
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
                <div className="flex items-start gap-3">
                  <Image src="/insight.svg" alt="Insight" width={52} height={52} className="h-13 w-13 flex-shrink-0" />
                  <h3 className="text-base sm:text-lg md:text-xl font-black leading-[1.3] text-[#1a3535]">
                    Analisis Kesiapan Ketenagaan & Kompetensi Kader Posyandu
                  </h3>
                </div>

                <div className="mt-3 rounded-xl border-l-[3px] border-l-[#534AB7] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto max-h-[180px] min-h-[140px]">
                  <p className="text-sm sm:text-base md:text-lg font-bold leading-relaxed text-[#2f4040] whitespace-pre-line">
                    {aiInsight || 'Klik tombol di bawah untuk membuat analisis.'}
                  </p>
                </div>

                <div className="my-4 h-px bg-[rgba(0,0,0,0.08)]" />

                <div className="mt-auto">
                  <button
                    onClick={generateAiInsight}
                    disabled={generatingAi}
                    className="group flex w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-[#534AB7] to-[#8c5ce7] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(83,74,183,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(140,92,231,0.42)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                      {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="text-sm md:text-base font-black uppercase tracking-[0.1em]">
                      {generatingAi ? 'Menganalisis...' : 'Analisis AI'}
                    </span>
                  </button>
                </div>
              </div>
            </article>

            {/* Source card */}
            <article
              className="border border-[#b7c8c9] bg-[#e9f1f2] p-4 xl:min-h-[183px] xl:h-auto w-full xl:w-[381px]"
              style={{
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <h4 className="text-lg font-black text-slate-800">Sumber Data:</h4>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Kementerian Kesehatan Republik Indonesia
              </p>
              <h4 className="mt-4 text-lg font-black text-slate-800">Data per:</h4>
              <p className="mt-1 text-sm font-bold text-slate-600">26 Juni 2026 10.00 WIB</p>
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
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight text-[#2f2f2f] uppercase">
              SEBARAN KADER & KOMPETENSI POSYANDU - {getRegionLabel()}
            </h3>
            <p className="mt-1 text-base md:text-lg font-medium leading-relaxed text-slate-500">
              Visualisasi sebaran posyandu beserta persentase pemenuhan kader terlatih di wilayah {getRegionLabel()}.
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

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full bg-[#fbffff] pb-5">
        {/* Chart A: Line Chart Kunjungan Rumah */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col min-h-[380px]"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="mb-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wide leading-tight">
              Tren Kunjungan Rumah Bulanan oleh Kader
            </h3>
            <p className="text-base font-medium text-slate-500 mt-1">
              Rerata pergerakan kunjungan rumah secara berkala oleh kader tahun {selectedYear}.
            </p>
          </div>
          <div className="flex-1 min-h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#534AB7]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.kunjunganTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorKunj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#534AB7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#534AB7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value) => [`${Number(value).toLocaleString('id-ID')} kunjungan`, 'Kunjungan Rumah']}
                  />
                  <Area type="monotone" dataKey="kunjungan" stroke="#534AB7" strokeWidth={3} fill="url(#colorKunj)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Chart B: Horizontal Bar Chart 25 Kompetensi Dasar */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col min-h-[380px]"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div className="mb-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wide leading-tight">
              Tingkat Penguasaan 25 Kompetensi Dasar
            </h3>
            <p className="text-base font-medium text-slate-500 mt-1">
              Persentase pemenuhan kompetensi kader berdasarkan 6 klaster promosi kesehatan utama.
            </p>
          </div>
          <div className="flex-1 min-h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#534AB7]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.kompetensiBreakdown} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12, fontWeight: 800 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar dataKey="pct" fill="#8c5ce7" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {data?.kompetensiBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 || index === 1 ? '#534AB7' : '#8c5ce7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

            {/* ── SEKTOR PROGRESS SERTIFIKASI & MASA BAKTI KADER ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full bg-[#fbffff] pt-2">
        {/* Card 1: Pelatihan / Orientasi */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col justify-between"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wider">
                  Pelatihan / Orientasi
                </h3>
                <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs md:text-sm font-black text-teal-800 uppercase">
                  Tahap 1
                </span>
              </div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                Persentase pencapaian orientasi 25 kompetensi dasar di setiap klaster kelompok layanan.
              </p>
            </div>
            
            <div className="text-center my-4">
              <span className="text-4xl md:text-5xl font-black text-slate-950 block tracking-tight leading-none mb-1.5">
                {loading ? '...' : getCardValue(data?.pelatihan.dilatih)}
              </span>
              <span className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wide">
                Kader dilatih 25 keterampilan
              </span>
            </div>

            {/* List of sub-skill clusters */}
            <div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
              {!loading && data?.pelatihan.subgroups.map((sg, idx) => (
                <div key={idx} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl p-2.5 transition-colors">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-xs md:text-sm font-black text-slate-800 leading-tight">
                      {sg.label}
                    </span>
                    <span className="text-xs md:text-sm font-black text-slate-950 shrink-0">
                      {getCardValue(sg.value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${data?.totalKader ? (sg.value / data.totalKader) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-red-50/50 border border-red-100 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-black text-red-600 uppercase tracking-wide">
                Belum Dilatih
              </span>
              <span className="text-base md:text-lg font-black text-red-750">
                {loading ? '...' : getCardValue(data?.pelatihan.belumDilatih)}
              </span>
            </div>
          </div>
        </article>

        {/* Card 2: Assessment Pasca Pelatihan */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col justify-between"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wider">
                  Asesmen Pasca Pelatihan
                </h3>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs md:text-sm font-black text-indigo-800 uppercase">
                  Tahap 2
                </span>
              </div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                Persentase hasil penilaian langsung kecakapan kompetensi dasar kader pasca pelatihan.
              </p>
            </div>

            <div className="text-center my-4">
              <span className="text-4xl md:text-5xl font-black text-slate-950 block tracking-tight leading-none mb-1.5">
                {loading ? '...' : getCardValue(data?.assessment.dinilai)}
              </span>
              <span className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wide">
                Kader dinilai 25 keterampilan
              </span>
            </div>

            {/* List of sub-skill clusters */}
            <div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
              {!loading && data?.assessment.subgroups.map((sg, idx) => (
                <div key={idx} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl p-2.5 transition-colors">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-xs md:text-sm font-black text-slate-800 leading-tight">
                      {sg.label}
                    </span>
                    <span className="text-xs md:text-sm font-black text-slate-950 shrink-0">
                      {getCardValue(sg.value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${data?.totalKader ? (sg.value / data.totalKader) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-red-50/50 border border-red-100 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-black text-red-600 uppercase tracking-wide">
                Belum Diasesmen
              </span>
              <span className="text-base md:text-lg font-black text-red-750">
                {loading ? '...' : getCardValue(data?.assessment.belumDinilai)}
              </span>
            </div>
          </div>
        </article>

        {/* Card 3: Kelulusan / Sertifikasi */}
        <article
          className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col justify-between"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wider">
                  Kelulusan & Sertifikasi
                </h3>
                <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs md:text-sm font-black text-purple-800 uppercase">
                  Hasil Akhir
                </span>
              </div>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                Distribusi tingkat kemahiran tanda kelulusan sertifikasi kader (Purwa, Madya, Utama).
              </p>
            </div>

            <div className="space-y-4 mt-6">
              {/* Utama */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-extrabold text-lg">
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm md:text-base font-black text-slate-900 uppercase">Kader Utama</span>
                    <span className="text-sm md:text-base font-black text-amber-600">
                      {loading ? '...' : `${getCardValue(data?.kelulusan.utama)} (${data?.kelulusan.utamaPct}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${data?.kelulusan.utamaPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Madya */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-extrabold text-lg">
                  🎖️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm md:text-base font-black text-slate-900 uppercase">Kader Madya</span>
                    <span className="text-sm md:text-base font-black text-blue-700">
                      {loading ? '...' : `${getCardValue(data?.kelulusan.madya)} (${data?.kelulusan.madyaPct}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${data?.kelulusan.madyaPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Purwa */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-650 font-extrabold text-lg">
                  🏅
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm md:text-base font-black text-slate-900 uppercase">Kader Purwa</span>
                    <span className="text-sm md:text-base font-black text-teal-700">
                      {loading ? '...' : `${getCardValue(data?.kelulusan.purwa)} (${data?.kelulusan.purwaPct}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-400 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${data?.kelulusan.purwaPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Belum Ada Status */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-extrabold text-lg">
                  ⚪
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm md:text-base font-black text-slate-900 uppercase">Belum Ada Status</span>
                    <span className="text-sm md:text-base font-black text-slate-600">
                      {loading ? '...' : `${getCardValue(data?.kelulusan.belum)} (${data?.kelulusan.belumPct}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-300 h-full rounded-full transition-all duration-500" style={{ width: `${data?.kelulusan.belumPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <span className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider block">
              Sertifikasi Kemenkes RI
            </span>
          </div>
        </article>
      </section>

      {/* ── SEKTOR DISTRIBUSI MASA BAKTI KADER ── */}
      <section
        className="w-full bg-white p-6 border border-[#cdcdcd] shadow-[0_10px_30px_rgba(15,118,110,0.04)]"
        style={{
          borderTopLeftRadius: '17px',
          borderTopRightRadius: '17px',
          borderBottomRightRadius: '22px',
          borderBottomLeftRadius: '17px',
        }}
      >
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-wider">
            Masa Bakti Kader (Tenure)
          </h3>
          <p className="text-sm md:text-base font-medium text-slate-500 mt-1 leading-relaxed">
            Persentase dan jumlah sebaran lamanya masa pengabdian kader aktif di wilayah terpilih.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* kurangDari5 */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center transition-all hover:bg-slate-100/50">
            <p className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider">
              &lt; 5 Tahun
            </p>
            <span className="text-3xl md:text-4xl font-black text-slate-950 block mt-1 leading-tight">
              {loading ? '...' : getCardValue(data?.masaBakti.kurangDari5)}
            </span>
            <span className="inline-block mt-2 text-xs md:text-sm font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              {loading ? '...' : `${data?.masaBakti.kurangDari5Pct}%`}
            </span>
          </div>

          {/* antara5Dan10 */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center transition-all hover:bg-slate-100/50">
            <p className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider">
              5 - 10 Tahun
            </p>
            <span className="text-3xl md:text-4xl font-black text-slate-950 block mt-1 leading-tight">
              {loading ? '...' : getCardValue(data?.masaBakti.antara5Dan10)}
            </span>
            <span className="inline-block mt-2 text-xs md:text-sm font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              {loading ? '...' : `${data?.masaBakti.antara5Dan10Pct}%`}
            </span>
          </div>

          {/* antara10Dan15 */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center transition-all hover:bg-slate-100/50">
            <p className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider">
              10 - 15 Tahun
            </p>
            <span className="text-3xl md:text-4xl font-black text-slate-950 block mt-1 leading-tight">
              {loading ? '...' : getCardValue(data?.masaBakti.antara10Dan15)}
            </span>
            <span className="inline-block mt-2 text-xs md:text-sm font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              {loading ? '...' : `${data?.masaBakti.antara10Dan15Pct}%`}
            </span>
          </div>

          {/* antara15Dan20 */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center transition-all hover:bg-slate-100/50">
            <p className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider">
              15 - 20 Tahun
            </p>
            <span className="text-3xl md:text-4xl font-black text-slate-950 block mt-1 leading-tight">
              {loading ? '...' : getCardValue(data?.masaBakti.antara15Dan20)}
            </span>
            <span className="inline-block mt-2 text-xs md:text-sm font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              {loading ? '...' : `${data?.masaBakti.antara15Dan20Pct}%`}
            </span>
          </div>

          {/* lebihDari20 */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center col-span-2 md:col-span-1 transition-all hover:bg-slate-100/50">
            <p className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider">
              &gt; 20 Tahun
            </p>
            <span className="text-3xl md:text-4xl font-black text-slate-950 block mt-1 leading-tight">
              {loading ? '...' : getCardValue(data?.masaBakti.lebihDari20)}
            </span>
            <span className="inline-block mt-2 text-xs md:text-sm font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              {loading ? '...' : `${data?.masaBakti.lebihDari20Pct}%`}
            </span>
          </div>
        </div>
      </section>

      {/* Tabel Rekap Wilayah */}
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
            <div>
              <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
                MATRIKS DATA KADER PERPROVINSI/NASIONAL - {getRegionLabel()}
              </h3>
              <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
                Tabel rekapitulasi kualifikasi kelulusan kader (Purwa, Madya, Utama) untuk Kader Posyandu dan Kader Pustu per wilayah.
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[240px] sm:flex-none">
                <input
                  type="text"
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  placeholder={province ? 'Cari Kabupaten/Kota...' : 'Cari Provinsi...'}
                  className="w-full sm:w-[280px] rounded-full border border-slate-200 bg-white h-11 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7]"
                />
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportKaderCSV}
                className="flex items-center justify-center gap-2 rounded-full bg-[#047D78] hover:bg-[#036662] text-white px-6 h-11 text-sm font-bold shadow-[0_4px_10px_rgba(4,125,120,0.15)] transition active:scale-[0.98] cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1500px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider text-center text-sm sm:text-base">
                  <th className="py-3.5 px-2 w-16 text-center" rowSpan={2}>#</th>
                  <th className="py-3.5 px-4 text-left cursor-pointer select-none" rowSpan={2} onClick={() => handleSort('nama')}>
                    <span className="align-middle">{province ? 'Kabupaten/Kota' : 'Provinsi'}</span>
                    {renderSortIndicator('nama')}
                  </th>
                  <th className="py-3 px-2 border-l border-slate-200 text-indigo-900 bg-indigo-50/70 font-black text-sm sm:text-base" colSpan={9}>
                    Kader Posyandu
                  </th>
                  <th className="py-3 px-2 border-l border-slate-200 text-teal-900 bg-teal-50/70 font-black text-sm sm:text-base" colSpan={9}>
                    Kader Pustu
                  </th>
                </tr>
                <tr className="border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-xs sm:text-sm text-center">
                  {/* Posyandu sub-headers */}
                  <th className="py-2.5 px-1 border-l border-slate-100 cursor-pointer select-none text-indigo-900 bg-indigo-50/30" onClick={() => handleSort('posyandu_total')}>
                    <span className="block">Total</span><span className="block">Kader</span>{renderSortIndicator('posyandu_total')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort('posyandu_purwa')}>
                    <span className="block">Jumlah</span><span className="block">Kader Purwa</span>{renderSortIndicator('posyandu_purwa')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort('posyandu_purwaPct')}>
                    <span className="block">Persentase</span><span className="block">Kader Purwa</span>{renderSortIndicator('posyandu_purwaPct')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort('posyandu_madya')}>
                    <span className="block">Jumlah</span><span className="block">Kader Madya</span>{renderSortIndicator('posyandu_madya')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort('posyandu_madyaPct')}>
                    <span className="block">Persentase</span><span className="block">Kader Madya</span>{renderSortIndicator('posyandu_madyaPct')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort('posyandu_utama')}>
                    <span className="block">Jumlah</span><span className="block">Kader Utama</span>{renderSortIndicator('posyandu_utama')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort('posyandu_utamaPct')}>
                    <span className="block">Persentase</span><span className="block">Kader Utama</span>{renderSortIndicator('posyandu_utamaPct')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30 font-extrabold" onClick={() => handleSort('posyandu_belum')}>
                    <span className="block">Kader Belum</span><span className="block">Ada Status</span>{renderSortIndicator('posyandu_belum')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-indigo-50/30 font-extrabold" onClick={() => handleSort('posyandu_belumPct')}>
                    <span className="block">Persentase Kader</span><span className="block">Belum Ada Status</span>{renderSortIndicator('posyandu_belumPct')}
                  </th>

                  {/* Pustu sub-headers */}
                  <th className="py-2.5 px-1 border-l border-slate-200 cursor-pointer select-none text-teal-900 bg-teal-50/30" onClick={() => handleSort('pustu_total')}>
                    <span className="block">Total</span><span className="block">Kader</span>{renderSortIndicator('pustu_total')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30" onClick={() => handleSort('pustu_purwa')}>
                    <span className="block">Jumlah</span><span className="block">Kader Purwa</span>{renderSortIndicator('pustu_purwa')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30" onClick={() => handleSort('pustu_purwaPct')}>
                    <span className="block">Persentase</span><span className="block">Kader Purwa</span>{renderSortIndicator('pustu_purwaPct')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30" onClick={() => handleSort('pustu_madya')}>
                    <span className="block">Jumlah</span><span className="block">Kader Madya</span>{renderSortIndicator('pustu_madya')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30" onClick={() => handleSort('pustu_madyaPct')}>
                    <span className="block">Persentase</span><span className="block">Kader Madya</span>{renderSortIndicator('pustu_madyaPct')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30" onClick={() => handleSort('pustu_utama')}>
                    <span className="block">Jumlah</span><span className="block">Kader Utama</span>{renderSortIndicator('pustu_utama')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30" onClick={() => handleSort('pustu_utamaPct')}>
                    <span className="block">Persentase</span><span className="block">Kader Utama</span>{renderSortIndicator('pustu_utamaPct')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30 font-extrabold" onClick={() => handleSort('pustu_belum')}>
                    <span className="block">Kader Belum</span><span className="block">Ada Status</span>{renderSortIndicator('pustu_belum')}
                  </th>
                  <th className="py-2.5 px-1 cursor-pointer select-none bg-teal-50/30 font-extrabold" onClick={() => handleSort('pustu_belumPct')}>
                    <span className="block">Persentase Kader</span><span className="block">Belum Ada Status</span>{renderSortIndicator('pustu_belumPct')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-center text-sm sm:text-base">
                {loading ? (
                  <tr>
                    <td colSpan={20} className="py-8 text-center text-slate-500 italic">
                      Memuat data matriks kader...
                    </td>
                  </tr>
                ) : !processedTableData || processedTableData.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="py-8 text-center text-slate-500 italic">
                      Tidak ada data wilayah untuk filter terpilih.
                    </td>
                  </tr>
                ) : (
                  processedTableData.map((wil, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-100/70 transition-colors odd:bg-slate-50">
                        <td className="py-4 px-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-4 px-4 font-black text-slate-900 uppercase text-left truncate max-w-[200px]">
                          {wil.nama}
                        </td>
                        
                        {/* Posyandu metrics */}
                        <td className="py-4 px-1 border-l border-slate-100 text-center font-black text-slate-950 bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-slate-700 bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.purwa.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-indigo-700 font-black bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.purwaPct}%
                        </td>
                        <td className="py-4 px-1 text-center text-slate-700 bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.madya.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-indigo-700 font-black bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.madyaPct}%
                        </td>
                        <td className="py-4 px-1 text-center text-slate-700 bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.utama.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-indigo-700 font-black bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.utamaPct}%
                        </td>
                        <td className="py-4 px-1 text-center text-slate-600 bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.belum.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-slate-600 font-black bg-indigo-50/[0.03]">
                          {wil.kaderPosyandu.belumPct}%
                        </td>

                        {/* Pustu metrics */}
                        <td className="py-4 px-1 border-l border-slate-200 text-center font-black text-slate-950 bg-teal-50/[0.03]">
                          {wil.kaderPustu.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-slate-700 bg-teal-50/[0.03]">
                          {wil.kaderPustu.purwa.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-teal-700 font-black bg-teal-50/[0.03]">
                          {wil.kaderPustu.purwaPct}%
                        </td>
                        <td className="py-4 px-1 text-center text-slate-700 bg-teal-50/[0.03]">
                          {wil.kaderPustu.madya.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-teal-700 font-black bg-teal-50/[0.03]">
                          {wil.kaderPustu.madyaPct}%
                        </td>
                        <td className="py-4 px-1 text-center text-slate-700 bg-teal-50/[0.03]">
                          {wil.kaderPustu.utama.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-teal-700 font-black bg-teal-50/[0.03]">
                          {wil.kaderPustu.utamaPct}%
                        </td>
                        <td className="py-4 px-1 text-center text-slate-600 bg-teal-50/[0.03]">
                          {wil.kaderPustu.belum.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-1 text-center text-slate-600 font-black bg-teal-50/[0.03]">
                          {wil.kaderPustu.belumPct}%
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

      {/* Detail Card Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="fixed inset-0" onClick={() => setSelectedCard(null)} />
          <div
            className="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white shadow-2xl border border-slate-200 flex flex-col"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-[#fafcfc]">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  {selectedCard === 'total_kader' && `Rincian Kader per Posyandu - ${getRegionLabel()}`}
                  {selectedCard === 'kader_terlatih' && `Rincian Kader Terlatih (25 Aspek) - ${getRegionLabel()}`}
                  {selectedCard === 'kompetensi' && `Analisis Penguasaan Kompetensi Kader - ${getRegionLabel()}`}
                  {selectedCard === 'kunjungan' && `Rincian Kunjungan Rumah Kader - ${getRegionLabel()}`}
                </h3>
              </div>
              <button onClick={() => setSelectedCard(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-xs sm:text-sm">
                      <th className="py-3.5 px-3">Nama Posyandu</th>
                      <th className="py-3.5 px-3">Kecamatan</th>
                      <th className="py-3.5 px-3 text-center">Karakteristik</th>
                      <th className="py-3.5 px-3 text-center">Total Kader</th>
                      <th className="py-3.5 px-3 text-center">Kader Terlatih</th>
                      <th className="py-3.5 px-3 text-center">Persentase Terlatih (%)</th>
                      <th className="py-3.5 px-3 text-center">Kunjungan Rumah (Kader)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-sm sm:text-base">
                    {data?.markers.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-100/70 transition-colors odd:bg-slate-50">
                        <td className="py-3.5 px-3 font-black text-slate-900 uppercase tracking-wide">
                          {item.jenis_bencana}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-700">Kec. {item.kecamatan}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border">
                            {item.karakteristik}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-extrabold text-slate-950">{item.totalKader} orang</td>
                        <td className="py-3.5 px-3 text-center font-extrabold text-indigo-700">{item.kaderTerlatih} orang</td>
                        <td className="py-3.5 px-3 text-center font-black text-slate-950">{item.pctKaderTerlatih}%</td>
                        <td className="py-3.5 px-3 text-center text-slate-700 font-black">{item.kunjunganRumahCount} KK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-[#fafcfc] text-center text-xs font-bold text-slate-500">
              Kementerian Kesehatan Republik Indonesia · Pembinaan Tenaga Kader Posyandu
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
