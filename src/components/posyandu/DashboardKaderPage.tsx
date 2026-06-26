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
import { getKaderStats, type KaderDashboardData } from '@/lib/kaderData'

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

  // Smart search bar states
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

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
    if (isProvLocked) return kabupaten !== ''
    return province !== '' || selectedYear !== '2026'
  }, [isKabLocked, isProvLocked, province, kabupaten, selectedYear])

  const handleResetFilter = () => {
    setSelectedYear('2026')
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
      const res = getKaderStats(province, kabupaten, selectedYear)
      setData(res)
    } catch (err) {
      console.error('[kader-stats]', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }, [province, kabupaten, selectedYear])

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
              className="w-full rounded-2xl border border-slate-200 bg-white h-12 pl-11 pr-10 text-sm font-medium shadow-sm outline-none placeholder:text-slate-400 focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] transition-all"
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
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 truncate">{sug.label}</span>
                    <span className="rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-150">
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
          <div className="flex items-center rounded-2xl border border-indigo-100 bg-[#fafaff] px-4 text-xs shadow-[0_6px_18px_rgba(83,74,183,0.03)] h-auto md:h-12 py-3 md:py-0 w-full">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-600 font-semibold w-full">
              <span className="hidden h-4 w-px bg-indigo-200 sm:inline-block" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Cakupan:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{cakupan}</span>
                </span>
                <span className="text-indigo-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Provinsi:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{province || 'Semua Provinsi'}</span>
                </span>
                <span className="text-indigo-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Kab/Kota:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{kabupaten || 'Semua Kab/Kota'}</span>
                </span>
                <span className="text-indigo-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Tahun:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{selectedYear}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Reset Filter */}
        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] md:invisible">
            Aksi
          </p>
          <button
            onClick={handleResetFilter}
            disabled={!showResetButton}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-extrabold shadow-sm transition-all outline-none h-12 uppercase tracking-wider ${
              showResetButton
                ? 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:-translate-y-0.5 active:scale-95'
                : 'border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed'
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
          <div className="grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] items-start gap-6 px-6 py-5">
            <div className="w-full font-bold">
              <FilterDropdownBar
                onSummaryChange={handleSummaryChange}
                selectedProvinceName={province}
                selectedKabupatenName={kabupaten}
                showLabel={true}
              />
            </div>
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em] mb-1.5">Tahun Analisis</span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 w-full">
                {[
                  { id: '2024', label: '2024' },
                  { id: '2025', label: '2025' },
                  { id: '2026', label: '2026' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedYear(opt.id)
                      setAiInsight(null)
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                      selectedYear === opt.id
                        ? 'bg-[#534AB7] text-white shadow-[0_2px_8px_rgba(83,74,183,0.30)]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
        {/* Card 1: Total Kader */}
        <article
          onClick={() => setSelectedCard('total_kader')}
          className="flex flex-col justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              Total Kader Posyandu
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-650 shadow-inner">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
              {loading ? '...' : getCardValue(data?.totalKader)}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Rerata ~5 kader per Posyandu
            </p>
          </div>
        </article>

        {/* Card 2: Kader Terlatih */}
        <article
          onClick={() => setSelectedCard('kader_terlatih')}
          className="flex flex-col justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              Kader Terlatih (25 Aspek)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
              {loading ? '...' : getCardValue(data?.kaderTerlatih)}
            </span>
            <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-0.5">
              <ChevronUp className="h-3 w-3" />
              <span>{data?.pctKaderTerlatih}% dari total kader</span>
            </p>
          </div>
        </article>

        {/* Card 3: Kompetensi Kader */}
        <article
          onClick={() => setSelectedCard('kompetensi')}
          className="flex flex-col justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              Rata-rata Kompetensi
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-650 shadow-inner">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                {loading ? '...' : `${data?.avgKompetensiPct}%`}
              </span>
              {!loading && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  (data?.avgKompetensiPct || 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {(data?.avgKompetensiPct || 0) >= 80 ? 'Lolos' : 'Gagal'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Target Kompetensi: <b className="text-slate-700">≥80%</b>
            </p>
          </div>
        </article>

        {/* Card 4: Kunjungan Rumah */}
        <article
          onClick={() => setSelectedCard('kunjungan')}
          className="flex flex-col justify-between p-5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] min-h-[140px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              Kunjungan Rumah Terlaksana
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-inner">
              <Home className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
              {loading ? '...' : getCardValue(data?.totalKunjunganRumah)}
            </span>
            <p className="text-[11px] text-amber-650 font-bold mt-1">
              Rerata bulanan kunjungan berkala
            </p>
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
                  <h3 className="text-[15px] font-bold leading-[1.3] text-[#1a3535] sm:text-[17px]">
                    Analisis Kesiapan Ketenagaan & Kompetensi Kader Posyandu
                  </h3>
                </div>

                <div className="mt-3 rounded-xl border-l-[3px] border-l-[#534AB7] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto max-h-[180px] min-h-[140px]">
                  <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px] whitespace-pre-line">
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
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">
                      {generatingAi ? 'Menganalisis...' : 'Analisis AI'}
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
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">26 Juni 2026 10.00 WIB</p>
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
              SEBARAN KADER & KOMPETENSI POSYANDU - {getRegionLabel()}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4b4b4b] sm:text-[16px]">
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
            <h3 className="text-lg sm:text-[22px] font-black text-[#534AB7] uppercase tracking-wide leading-tight">
              Tren Kunjungan Rumah Bulanan oleh Kader
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1">
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
                  <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
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
            <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
              Tingkat Penguasaan 25 Kompetensi Dasar
            </h3>
            <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1">
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
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 9, fontWeight: 650 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
                MATRIKS REKAPITULASI DUKUNGAN KADER PER WILAYAH - {getRegionLabel()}
              </h3>
              <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
                Tabel rekapitulasi data Posyandu, total kader aktif, kader terlatih (Target ≥75%), dan jumlah kunjungan rumah yang terlaksana.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Wilayah (Provinsi/Kabupaten)</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Posyandu</th>
                  <th className="py-3.5 px-4 text-center">Total Kader Aktif</th>
                  <th className="py-3.5 px-4 text-center">Kader Terlatih</th>
                  <th className="py-3.5 px-4 text-center">Persentase Kader Terlatih</th>
                  <th className="py-3.5 px-4 text-center">Status Kader Terlatih</th>
                  <th className="py-3.5 px-4 text-center">Total Kunjungan Rumah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Memuat data matriks kader...
                    </td>
                  </tr>
                ) : !data?.wilayahBreakdown || data.wilayahBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data wilayah untuk filter terpilih.
                    </td>
                  </tr>
                ) : (
                  data.wilayahBreakdown.map((wil, idx) => {
                    const statusColor = wil.pctKaderTerlatih >= 75
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                      : 'bg-red-50 text-red-700 border-red-150'

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors odd:bg-slate-50/[0.08]">
                        <td className="py-3.5 px-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 uppercase tracking-wide">
                          {wil.nama}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-550">
                          {wil.jumlahPosyandu.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-900 font-bold">
                          {wil.totalKader.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-center text-indigo-700 font-bold">
                          {wil.kaderTerlatih.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black">
                          {wil.pctKaderTerlatih}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColor}`}>
                            {wil.pctKaderTerlatih >= 75 ? 'Memenuhi' : 'Tidak Memenuhi'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-850 font-bold">
                          {wil.kunjunganRumah.toLocaleString('id-ID')}
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
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Nama Posyandu</th>
                      <th className="py-2.5 px-3">Kecamatan</th>
                      <th className="py-2.5 px-3 text-center">Karakteristik</th>
                      <th className="py-2.5 px-3 text-center">Total Kader</th>
                      <th className="py-2.5 px-3 text-center">Kader Terlatih</th>
                      <th className="py-2.5 px-3 text-center">Persentase Terlatih (%)</th>
                      <th className="py-2.5 px-3 text-center">Kunjungan Rumah (Kader)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {data?.markers.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wide">
                          {item.jenis_bencana}
                        </td>
                        <td className="py-3 px-3">Kec. {item.kecamatan}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border">
                            {item.karakteristik}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">{item.totalKader} orang</td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-700">{item.kaderTerlatih} orang</td>
                        <td className="py-3 px-3 text-center font-black">{item.pctKaderTerlatih}%</td>
                        <td className="py-3 px-3 text-center text-slate-650 font-bold">{item.kunjunganRumahCount} KK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-[#fafcfc] text-center text-[10px] text-slate-400">
              Kementerian Kesehatan Republik Indonesia · Pembinaan Tenaga Kader Posyandu
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
