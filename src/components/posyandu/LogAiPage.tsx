'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Clock,
  Eye,
  Search,
  Loader2,
  FileText,
  Video,
  Info,
  MapPin,
  Calendar,
  Sparkles,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import Modal from '@/components/Modal'
import { useAuthStore } from '@/lib/authStore'

interface AiLog {
  id: string
  province: string
  kabupaten: string
  year: string
  timeFrame: string
  period: string
  summary: string
  recommendations: string // JSON string
  detailedAnalysis: string
  videoScript: string | null
  videoUrl: string | null
  videoStatus: string
  createdAt: string
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

export default function LogAiPage() {
  const { token } = useAuthStore()
  const [logs, setLogs] = useState<AiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null)
  const [activeTab, setActiveTab] = useState<'text' | 'video' | 'info'>('text')
  const [sortField, setSortField] = useState<'createdAt' | 'province'>('createdAt')
  const [sortAsc, setSortAsc] = useState(false)

  // Force Generate State
  const [generating, setGenerating] = useState(false)
  const [genMessage, setGenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-insight')
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (err) {
      console.error('Failed to load AI logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredAndSortedLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const query = searchQuery.toLowerCase()
        return (
          log.province.toLowerCase().includes(query) ||
          log.kabupaten.toLowerCase().includes(query) ||
          log.summary.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        let fieldA: any = a[sortField]
        let fieldB: any = b[sortField]
        if (sortField === 'createdAt') {
          fieldA = new Date(a.createdAt).getTime()
          fieldB = new Date(b.createdAt).getTime()
        } else {
          fieldA = fieldA.toLowerCase()
          fieldB = fieldB.toLowerCase()
        }
        if (fieldA < fieldB) return sortAsc ? -1 : 1
        if (fieldA > fieldB) return sortAsc ? 1 : -1
        return 0
      })
  }, [logs, searchQuery, sortField, sortAsc])

  const handleSort = (field: 'createdAt' | 'province') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const handleOpenDetail = (log: AiLog) => {
    setSelectedLog(log)
    setActiveTab('text')
  }

  const getRegionLabel = (log: AiLog) => {
    const prov = log.province === 'NASIONAL' ? 'Nasional' : log.province
    const kab = log.kabupaten !== 'SEMUA KAB/KOTA' ? ` - ${log.kabupaten}` : ''
    return `${prov}${kab}`
  }

  const getPeriodLabel = (log: AiLog) => {
    const tf = log.timeFrame
    const p = log.period ? ` (${log.period})` : ''
    return `${tf}${p} - ${log.year}`
  }

  const handleForceGenerate = async () => {
    try {
      setGenerating(true)
      setGenMessage(null)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          province: '', // Nasional
          kabupaten: '',
          year: '2026',
          timeFrame: 'Tahunan',
          period: '',
          force: true, // Bypass cache
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setGenMessage({
          type: 'success',
          text: 'Analisis AI berhasil diproduksi baru untuk wilayah Nasional (Tahun 2026 - Tahunan)!',
        })
        fetchLogs() // Reload logs table
      } else {
        setGenMessage({
          type: 'error',
          text: result.summary || 'Gagal memicu pembuatan analisis AI baru.',
        })
      }
    } catch (err) {
      console.error('Failed to trigger manual generate:', err)
      setGenMessage({
        type: 'error',
        text: 'Terjadi kegagalan koneksi sistem saat memicu analisis baru.',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff]">
      {/* Header Panel */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-teal-100 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-teal-650" />
            Matriks Log Analisis AI
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Riwayat log keluaran analisis kesehatan Posyandu terintegrasi yang diproduksi otomatis oleh kecerdasan buatan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 text-center shadow-inner">
            <span className="block text-xs font-bold text-teal-700 uppercase tracking-widest">Total Simpanan</span>
            <span className="text-xl font-black text-teal-900">{logs.length} Log</span>
          </div>
        </div>
      </section>

      {/* Force Generate Action Section */}
      <article className="border border-teal-100 bg-teal-50/15 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-teal-900">
            <Sparkles className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
            <h4 className="text-sm font-black uppercase tracking-wider">Generate Analisis Baru Sekarang (Bypass Cache Harian)</h4>
          </div>
          <p className="text-xs font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Tekan tombol di samping untuk memicu pembuatan analisis AI baru berskala **Nasional (Tahun 2026 - Tahunan)** secara langsung. Tindakan ini akan mengabaikan cache harian dan memperbarui data analisis.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-stretch md:items-end gap-3 min-w-[200px]">
          <button
            onClick={handleForceGenerate}
            disabled={generating}
            className="w-full group flex items-center justify-center gap-2 rounded-xl bg-[#047D78] hover:bg-[#03605c] px-5 h-[44px] text-white shadow-[0_4px_10px_rgba(4,125,120,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(4,125,120,0.3)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 text-xs font-bold uppercase tracking-wider"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Memproses Baru...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-white" />
                <span>Generate Sekarang</span>
              </>
            )}
          </button>

          {/* Generate success / error feedback messages */}
          {genMessage && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-start gap-1.5 animate-fade-in ${
                genMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              {genMessage.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{genMessage.text}</span>
            </div>
          )}
        </div>
      </article>

      {/* Control & Search Bar */}
      <section className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full sm:w-[380px]">
          <Search className="absolute left-4 h-4 w-4 text-slate-400 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari wilayah atau intisari analisis..."
            className="w-full rounded-2xl border border-slate-200 bg-white h-11 pl-11 pr-4 text-sm font-bold shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-slate-800"
          />
        </div>
      </section>

      {/* Main Content Table Card */}
      <article className="border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,118,110,0.03)] rounded-2xl overflow-hidden flex flex-col w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="h-10 w-10 text-teal-700 animate-spin" />
            <p className="text-sm font-bold text-slate-500">Menghubungkan ke database log...</p>
          </div>
        ) : filteredAndSortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
            <Sparkles className="h-12 w-12 text-slate-300" />
            <div>
              <h4 className="text-base font-black text-slate-800 uppercase tracking-wide">Belum Ada Log Analisis</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm mx-auto">
                Silakan lakukan pemicuan generate analisis AI di halaman dashboard utama terlebih dahulu.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-teal-700 to-[#047D78] text-white font-black text-xs uppercase tracking-wider">
                  <th className="py-4 px-4 cursor-pointer hover:bg-teal-850 select-none transition-colors rounded-tl-2xl" onClick={() => handleSort('createdAt')}>
                    <span className="flex items-center gap-1">
                      Tanggal Pembuatan
                      <ArrowUpDown className="h-3 w-3 shrink-0" />
                    </span>
                  </th>
                  <th className="py-4 px-4 cursor-pointer hover:bg-teal-850 select-none transition-colors" onClick={() => handleSort('province')}>
                    <span className="flex items-center gap-1">
                      Wilayah
                      <ArrowUpDown className="h-3 w-3 shrink-0" />
                    </span>
                  </th>
                  <th className="py-4 px-4">Periode</th>
                  <th className="py-4 px-4 min-w-[280px]">Ringkasan Analisis</th>
                  <th className="py-4 px-4 text-center">Status Video</th>
                  <th className="py-4 px-4 text-center rounded-tr-2xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 text-sm">
                {filteredAndSortedLogs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) + ' WIB'

                  let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200'
                  if (log.videoStatus === 'COMPLETED') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-150'
                  if (log.videoStatus === 'GENERATING' || log.videoStatus === 'PENDING') statusBadge = 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse'
                  if (log.videoStatus === 'FAILED') statusBadge = 'bg-rose-50 text-rose-700 border-rose-150'

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors odd:bg-slate-50/30">
                      <td className="py-3 px-4 text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {dateStr}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {getRegionLabel(log)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-bold">{getPeriodLabel(log)}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs leading-relaxed max-w-[400px] truncate" title={log.summary}>
                        {log.summary}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusBadge}`}>
                          {log.videoStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenDetail(log)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:-translate-y-0.5 transition-all text-xs font-bold px-3 py-1.5"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          <span>Lihat Detail</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Detail Log Analisis AI: ${getRegionLabel(selectedLog)}`}
          size="lg"
        >
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
                    {renderMarkdown(selectedLog.detailedAnalysis) || (
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

                  {/* Presenter script */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                        Naskah Presenter AI (Virtual Speaker Script)
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">
                      "{selectedLog.videoScript || 'Maaf saat ini naskah belum tersedia'}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5">
                    <h5 className="font-extrabold text-sm mb-3 uppercase tracking-wide text-teal-900">
                      Riset & Pembanding Standar Kesehatan
                    </h5>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                      Setiap laporan analisis yang diproduksi oleh kecerdasan buatan (AI) diselaraskan secara otomatis dengan standar pedoman Kementerian Kesehatan Republik Indonesia (Kemenkes), data kependudukan Badan Pusat Statistik (BPS), serta standar global dari World Health Organization (WHO) dan UNICEF terkait keaktifan kader, pemantauan status gizi (KIA), serta pencegahan stunting di tingkat komunitas.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Key metadata panel (right) */}
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5">
                <h4 className="text-sm font-black uppercase text-teal-900 tracking-wider mb-4">Informasi Wilayah</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-teal-50 pb-2">
                    <span className="text-slate-500 font-bold">Provinsi:</span>
                    <span className="text-slate-900 font-black uppercase">{selectedLog.province}</span>
                  </div>
                  <div className="flex justify-between border-b border-teal-50 pb-2">
                    <span className="text-slate-500 font-bold">Kabupaten/Kota:</span>
                    <span className="text-slate-900 font-black uppercase">{selectedLog.kabupaten}</span>
                  </div>
                  <div className="flex justify-between border-b border-teal-50 pb-2">
                    <span className="text-slate-500 font-bold">Jenis Waktu:</span>
                    <span className="text-slate-900 font-black uppercase">{selectedLog.timeFrame}</span>
                  </div>
                  {selectedLog.period && (
                    <div className="flex justify-between border-b border-teal-50 pb-2">
                      <span className="text-slate-500 font-bold">Periode:</span>
                      <span className="text-slate-900 font-black uppercase">{selectedLog.period}</span>
                    </div>
                  )}
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500 font-bold">Tahun Analisis:</span>
                    <span className="text-slate-900 font-black uppercase">{selectedLog.year}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations list */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-black uppercase text-slate-800 tracking-wider mb-3">Rekomendasi Utama</h4>
                <ul className="space-y-3">
                  {(() => {
                    try {
                      const recs: string[] = JSON.parse(selectedLog.recommendations)
                      return recs.map((rec, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5 border-l-2 border-l-teal-600"
                          dangerouslySetInnerHTML={{ __html: rec }}
                        />
                      ))
                    } catch (e) {
                      return <li className="text-xs text-slate-400 italic">Format rekomendasi tidak valid.</li>
                    }
                  })()}
                </ul>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
