'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Check,
  Minus,
  Download,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react'
import { getPosyanduStats, type WilayahBreakdownItem } from '@/lib/posyanduData'

export type PerformanceDataRow = {
  provinsi: string // Represents Province name OR Kabupaten name depending on filter
  valid: number
  aktif: number
  pctAktif: number
  statusAktif: 'MEMENUHI' | 'TIDAK MEMENUHI'
  siklusHidup: number
  pctSiklusHidup: number
  statusSiklusHidup: 'MEMENUHI' | 'TIDAK MEMENUHI'
  kunjunganRumah: number
  laporPustu: number
}

type SortKey = keyof PerformanceDataRow

interface PerformanceBreakdownTableProps {
  selectedProvince?: string
}

export default function PerformanceBreakdownTable({ selectedProvince = '' }: PerformanceBreakdownTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('valid')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Check if a specific province is filtered
  const isFiltered = useMemo(() => {
    return (
      selectedProvince &&
      selectedProvince.trim() !== '' &&
      selectedProvince.toLowerCase() !== 'nasional' &&
      selectedProvince.toLowerCase() !== 'semua provinsi'
    )
  }, [selectedProvince])

  // Get raw list based on province selection
  const rawData = useMemo<PerformanceDataRow[]>(() => {
    // Call data access layer function to fetch breakdown for the scope
    const stats = getPosyanduStats(selectedProvince)
    return stats.wilayahBreakdown.map((wil) => ({
      provinsi: wil.nama,
      valid: wil.valid,
      aktif: wil.aktif,
      pctAktif: wil.pctAktif,
      statusAktif: wil.statusAktif,
      siklusHidup: wil.siklusHidup,
      pctSiklusHidup: wil.pctSiklusHidup,
      statusSiklusHidup: wil.statusSiklusHidup,
      kunjunganRumah: wil.kunjunganRumah,
      laporPustu: wil.laporPustu,
    }))
  }, [selectedProvince])

  // Handle column sorting toggle
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc') // Default to descending order on new click
    }
  }

  // Filter and sort the dataset
  const processedData = useMemo(() => {
    let result = [...rawData]

    // Search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((item) =>
        item.provinsi.toLowerCase().includes(q)
      )
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [rawData, searchQuery, sortKey, sortDirection])

  // CSV/Excel Export function
  const handleExportCSV = () => {
    const geoColumnName = isFiltered ? 'Kabupaten/Kota' : 'Provinsi'
    const headers = [
      'NO',
      geoColumnName,
      'Posyandu Valid',
      'Posyandu Aktif',
      'Persentase Aktif (%)',
      'Status Aktif',
      'Posyandu Siklus Hidup Aktif',
      'Persentase Siklus Hidup (%)',
      'Status Siklus Hidup',
      'Estimasi Kunjungan Rumah',
      'Estimasi Lapor Pustu'
    ]

    const csvRows = processedData.map((item, idx) => [
      idx + 1,
      item.provinsi,
      item.valid,
      item.aktif,
      `${item.pctAktif}%`,
      item.statusAktif,
      item.siklusHidup,
      `${item.pctSiklusHidup}%`,
      item.statusSiklusHidup,
      item.kunjunganRumah,
      item.laporPustu
    ])

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    
    const scopeName = isFiltered ? `kabupaten_${selectedProvince.toLowerCase()}` : 'nasional'
    link.setAttribute(
      'download',
      `breakdown_kinerja_posyandu_${scopeName}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Render sorting arrows
  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40 hover:opacity-100 transition-opacity" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5 text-teal-700" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5 text-teal-700" />
    )
  }

  // Helper for rendering performance badges
  const renderPctBadge = (val: number, type: 'aktif' | 'siklus') => {
    let classes = ''
    const target = type === 'aktif' ? 80 : 75
    if (val >= target) {
      classes = 'bg-emerald-50 text-emerald-800 border-emerald-200'
    } else {
      classes = 'bg-red-50 text-red-850 border-red-200'
    }

    return (
      <span
        className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-black tracking-wide transition-all ${classes}`}
      >
        {val}%
      </span>
    )
  }

  // Helper for rendering status badges
  const renderStatusBadge = (status: 'MEMENUHI' | 'TIDAK MEMENUHI') => {
    if (status === 'MEMENUHI') {
      return (
        <span className="inline-flex items-center rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 border border-emerald-200 uppercase tracking-wide">
          Memenuhi
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-800 border border-red-200 uppercase tracking-wide">
        Tidak Memenuhi
      </span>
    )
  }

  return (
    <article
      className="border border-[#cdcdcd] bg-white p-6 shadow-[0_10px_30px_rgba(15,118,110,0.04)]"
      style={{
        borderTopLeftRadius: '17px',
        borderTopRightRadius: '17px',
        borderBottomRightRadius: '22px',
        borderBottomLeftRadius: '17px',
      }}
    >
      {/* Table Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
        <div>
          <h3 className="text-lg sm:text-[22px] font-black text-slate-900 uppercase tracking-wide leading-tight">
            TABEL ANALISIS CAPAIAN KINERJA POSYANDU {isFiltered ? `WILAYAH - ${selectedProvince}` : 'PROVINSI (NASIONAL)'}
          </h3>
          <p className="text-sm sm:text-[15px] font-medium text-slate-500 mt-1.5 leading-relaxed">
            Matriks evaluasi Posyandu Valid, Posyandu Aktif (Target ≥80%), serta Posyandu Siklus Hidup Aktif (Target ≥75%) tingkat {isFiltered ? 'kabupaten/kota' : 'provinsi'}.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] sm:flex-none">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFiltered ? 'Cari Kabupaten/Kota...' : 'Cari Provinsi...'}
              className="w-full sm:w-[280px] rounded-full border border-slate-200 bg-white h-12 pl-10 pr-4 text-base font-bold text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#047D78] focus:ring-1 focus:ring-[#047D78]"
            />
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 rounded-full bg-[#047D78] hover:bg-[#036662] text-white px-6 h-12 text-base font-black shadow-[0_4px_10px_rgba(4,125,120,0.15)] transition active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table Grid with horizontal overflow & sticky province column */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm relative no-scrollbar">
        <table className="w-full text-left text-sm md:text-base border-collapse min-w-[1000px]">
          <thead>
            {/* Top Level Group Headers */}
            <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-800 font-extrabold uppercase tracking-wider text-xs md:text-sm">
              <th className="py-4 px-4 sticky left-0 bg-slate-50/95 z-20 w-12 text-center border-r border-slate-100">
                NO
              </th>
              <th className="py-4 px-5 sticky left-12 bg-slate-50/95 z-20 w-48 font-bold border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                {isFiltered ? 'Kabupaten/Kota' : 'Provinsi'}
              </th>
              <th
                onClick={() => handleSort('valid')}
                className="py-4 px-4 text-center font-bold border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Posyandu Valid</span>
                  {renderSortIndicator('valid')}
                </div>
              </th>
              <th colSpan={3} className="py-3 px-4 text-center font-extrabold text-slate-900 border-r border-slate-100 bg-slate-100/30">
                Indikator Posyandu Aktif (Target ≥80%)
              </th>
              <th colSpan={3} className="py-3 px-4 text-center font-extrabold text-slate-900 border-r border-slate-100 bg-slate-100/10">
                Posyandu Siklus Hidup Aktif (Target ≥75%)
              </th>
              <th colSpan={2} className="py-3 px-4 text-center font-extrabold text-slate-900 bg-slate-100/30">
                Kinerja Penunjang (Kunjungan & Lapor)
              </th>
            </tr>
            {/* Sub headers (Columns with sorting interaction) */}
            <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-700 font-black uppercase tracking-wider text-xs select-none">
              {/* Posyandu Aktif Sub-headers */}
              <th
                onClick={() => handleSort('aktif')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Jumlah</span>
                  {renderSortIndicator('aktif')}
                </div>
              </th>
              <th
                onClick={() => handleSort('pctAktif')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Persentase</span>
                  {renderSortIndicator('pctAktif')}
                </div>
              </th>
              <th
                onClick={() => handleSort('statusAktif')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Status</span>
                  {renderSortIndicator('statusAktif')}
                </div>
              </th>
              {/* Siklus Hidup Sub-headers */}
              <th
                onClick={() => handleSort('siklusHidup')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Jumlah</span>
                  {renderSortIndicator('siklusHidup')}
                </div>
              </th>
              <th
                onClick={() => handleSort('pctSiklusHidup')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Persentase</span>
                  {renderSortIndicator('pctSiklusHidup')}
                </div>
              </th>
              <th
                onClick={() => handleSort('statusSiklusHidup')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Status</span>
                  {renderSortIndicator('statusSiklusHidup')}
                </div>
              </th>
              {/* Kinerja Penunjang Sub-headers */}
              <th
                onClick={() => handleSort('kunjunganRumah')}
                className="py-3 px-4 text-center border-r border-slate-100 hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Kunjungan Rumah</span>
                  {renderSortIndicator('kunjunganRumah')}
                </div>
              </th>
              <th
                onClick={() => handleSort('laporPustu')}
                className="py-3 px-4 text-center hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">
                  <span>Lapor Pustu</span>
                  {renderSortIndicator('laporPustu')}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-400 italic font-semibold">
                  Tidak ada data {isFiltered ? 'kabupaten/kota' : 'provinsi'} yang cocok dengan "{searchQuery}".
                </td>
              </tr>
            ) : (
              processedData.map((item, idx) => (
                <tr
                  key={item.provinsi}
                  className="hover:bg-slate-100/70 transition-colors odd:bg-slate-50 even:bg-white"
                >
                  {/* Sticky Number */}
                  <td className="py-4 px-4 text-center text-slate-700 font-black sticky left-0 bg-inherit z-10 border-r border-slate-100">
                    {idx + 1}
                  </td>
                  {/* Sticky Province/Kabupaten Column */}
                  <td className="py-4 px-5 font-black text-slate-955 sticky left-12 bg-inherit z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] uppercase tracking-wide">
                    {item.provinsi}
                  </td>
                  {/* Posyandu Valid */}
                  <td className="py-4 px-4 text-center font-black text-slate-955 border-r border-slate-100">
                    {item.valid.toLocaleString('id-ID')}
                  </td>
                  {/* Posyandu Aktif */}
                  <td className="py-4 px-4 text-center border-r border-slate-100 font-extrabold text-slate-900">
                    {item.aktif.toLocaleString('id-ID')}
                  </td>
                  <td className="py-4 px-4 text-center border-r border-slate-100">
                    {renderPctBadge(item.pctAktif, 'aktif')}
                  </td>
                  <td className="py-4 px-4 text-center border-r border-slate-100">
                    {renderStatusBadge(item.statusAktif)}
                  </td>
                  {/* Siklus Hidup */}
                  <td className="py-4 px-4 text-center border-r border-slate-100 font-extrabold text-slate-900">
                    {item.siklusHidup.toLocaleString('id-ID')}
                  </td>
                  <td className="py-4 px-4 text-center border-r border-slate-100">
                    {renderPctBadge(item.pctSiklusHidup, 'siklus')}
                  </td>
                  <td className="py-4 px-4 text-center border-r border-slate-100">
                    {renderStatusBadge(item.statusSiklusHidup)}
                  </td>
                  {/* Kinerja Penunjang */}
                  <td className="py-4 px-4 text-center border-r border-slate-100 text-teal-850 font-black">
                    {item.kunjunganRumah.toLocaleString('id-ID')}
                  </td>
                  <td className="py-4 px-4 text-center text-indigo-850 font-black">
                    {item.laporPustu.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  )
}
