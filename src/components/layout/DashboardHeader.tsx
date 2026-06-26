'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/authStore'
import {
  BarChart3,
  Bell,
  ChevronDown,
  Download,
  Flame,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
  X,
  RefreshCw,
  Clock,
  LayoutDashboard,
  Users,
} from 'lucide-react'


type DashboardHeaderProps = {
  onToggleSidebar: () => void
}

type DashboardSidebarProps = {
  open: boolean
  onClose: () => void
}

const sidebarMenu = [
  {
    title: 'Menu Utama',
    items: [
      { label: 'Dashboard Posyandu', href: '/', icon: LayoutDashboard },
      { label: 'Dashboard Kader', href: '/dashboard-kader', icon: Users },
    ],
  },
  {
    title: 'Pengelolaan',
    items: [
      { label: 'Verifikasi Data', href: '#', icon: ShieldCheck },
      { label: 'Pengaturan', href: '#', icon: Settings },
    ],
  },
]

const notificationsData = [
  {
    id: 1,
    title: 'Krisis Banjir Bandang',
    description: 'Terjadi banjir bandang di Bandung. 12 korban luka, Puskesmas tergenang.',
    time: '2m',
    icon: Flame,
    iconBg: 'bg-red-50 text-red-600 border-red-100',
    unread: true,
  },
  {
    id: 2,
    title: 'Siaga Gempa Bumi',
    description: 'Gempa M 5.6 di Karangasem, Bali. 5 korban jiwa dilaporkan.',
    time: '15m',
    icon: ShieldCheck,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    unread: true,
  },
  {
    id: 3,
    title: 'Peringatan KLB Diare',
    description: 'Kasus diare Tangerang melebihi ambang batas normal.',
    time: '1j',
    icon: Bell,
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    unread: true,
  },
  {
    id: 4,
    title: 'Evakuasi Tanah Longsor',
    description: 'Evakuasi pengungsi mandiri sedang berlangsung di posko Bogor.',
    time: '3j',
    icon: MapPinned,
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    unread: false,
  },
  {
    id: 5,
    title: 'Logistik Darurat NTT',
    description: 'Puskesmas melaporkan kekurangan stok obat-obatan darurat.',
    time: '1h',
    icon: Settings,
    iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
    unread: false,
  },
]

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Tutup sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[1px]"
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[310px] border-r border-slate-200 bg-white text-slate-800 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-[3px] bg-teal-600" />
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-5 bg-[#fafcfc]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal-100 bg-white p-1.5 shadow-sm">
              <Image
                src="/kemenkes.png"
                alt="Logo Kementerian Kesehatan"
                width={38}
                height={38}
                className="h-auto w-full"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black tracking-wide text-slate-950">ASISTENSI PUSKESMAS</p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-600">Kementerian Kesehatan RI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="rounded-lg p-1.5 text-slate-550 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="h-[calc(100vh-80px)] space-y-5 overflow-y-auto px-3 py-4 bg-white">
          {sidebarMenu.map((group) => (
            <section key={group.title}>
              <p className="px-2 text-sm font-black uppercase tracking-[0.1em] text-slate-650">
                {group.title}
              </p>
              <div className="mt-2 space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = item.href !== '#' && pathname === item.href
 
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={(event) => {
                        if (item.href === '#') event.preventDefault()
                        else onClose()
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-lg font-black uppercase tracking-[0.03em] transition ${
                        active
                          ? 'bg-teal-50 text-teal-850 font-black shadow-[inset_0_0_0_1px_rgba(20,184,166,0.3)]'
                          : 'text-slate-750 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  
  const { user, logout, isAuthenticated } = useAuthStore()
  const [activeRegion, setActiveRegion] = useState('NASIONAL')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    window.dispatchEvent(new CustomEvent('sipkk-refresh-data'))
    setTimeout(() => {
      setIsRefreshing(false)
    }, 850)
  }


  useEffect(() => {
    if (user?.wilayah_scope) {
      const scope = user.wilayah_scope
      if (scope.mode === 'kabupaten' && scope.kabupaten?.label) {
        setActiveRegion(`${scope.kabupaten.label.toUpperCase()}, PROV. ${scope.provinsi?.label?.toUpperCase()}`)
      } else if (scope.mode === 'provinsi' && scope.provinsi?.label) {
        setActiveRegion(`PROV. ${scope.provinsi.label.toUpperCase()}`)
      }
    }

    const handleRegionChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      setActiveRegion(customEvent.detail)
    }

    window.addEventListener('sipkk-region-changed', handleRegionChange)
    return () => {
      window.removeEventListener('sipkk-region-changed', handleRegionChange)
    }
  }, [user])
  const initialName = isAuthenticated ? (user?.nama_lengkap || user?.username || 'Pengguna') : 'Tamu (Guest)'
  const roleName = isAuthenticated ? (user?.level_name || (user?.level_user_id === 1 ? 'Super Administrator' : 'Admin')) : 'Akses Publik'
  const userEmail = isAuthenticated ? (user?.email || `${user?.username || 'admin'}@puskesmas.go.id`) : 'guest@puskesmas.go.id'
  const accessLabel = isAuthenticated ? (user?.wilayah_scope?.access_label || 'Pusat pemantauan nasional Puskesmas') : 'Pusat pemantauan publik Puskesmas'

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }
  const initials = getInitials(initialName)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false)
    }

    if (profileOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [profileOpen])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false)
    }

    if (notifOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [notifOpen])

  return (
    <header className="w-full border-b-2 border-teal-400/25 bg-white">
      <div className="relative flex min-h-[118px] items-stretch overflow-visible">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
          style={{ backgroundImage: "url('/bg header.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/82 to-white/92" />
        <div className="relative grid w-full gap-5 px-4 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={onToggleSidebar}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-5">
              <Image
                src="/Logo-Kemenkes.png"
                alt="Logo Kemenkes"
                width={170}
                height={62}
                className="h-auto w-[132px] shrink-0 md:w-[168px]"
                priority
              />
              <div className="min-w-0 border-teal-200/80 md:border-l md:pl-5">
                <h1 className="max-w-[850px] text-3xl font-black leading-tight tracking-normal text-slate-950 md:text-4xl">
                  DASHBOARD TATAKELOLA KEGIATAN DAN KADER POSYANDU
                </h1>
                <p className="mt-2 max-w-[850px] text-sm md:text-base font-medium leading-relaxed text-slate-500">
                  Asistensi pemantauan kualitas pelayanan kesehatan primer dan evaluasi capaian indikator keaktifan Posyandu secara real-time di wilayah {activeRegion}.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-700 hover:shadow-md disabled:cursor-wait"
                aria-label="Refresh Data"
                title="Refresh Data"
              >
                <RefreshCw className={`h-[18px] w-[18px] text-slate-600 ${isRefreshing ? 'animate-spin text-teal-650' : ''}`} />
              </button>
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-700 hover:shadow-md"
                  aria-label="Notifikasi"
                >
                  <Bell className="h-[19px] w-[19px]" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-teal-600 px-1 text-xs font-black text-white">
                    5
                  </span>
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-14 z-30 w-[320px] sm:w-[380px] rounded-2xl border border-slate-200 bg-white/98 backdrop-blur-md p-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] flex flex-col animate-in slide-in-from-top-2 duration-155">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-950">Notifikasi</span>
                        <span className="rounded-full bg-teal-50 border border-teal-100 px-2.5 py-0.5 text-xs font-black text-teal-800 uppercase tracking-wide">
                          5 Baru
                        </span>
                      </div>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* List */}
                    <div className="mt-2 divide-y divide-slate-100 max-h-[320px] overflow-y-auto pr-1 no-scrollbar space-y-1">
                      {notificationsData.map((notif) => {
                        const NotifIcon = notif.icon;
                        return (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 py-2.5 px-2 transition hover:bg-slate-50/80 rounded-xl cursor-pointer ${
                              notif.unread ? 'bg-teal-50/10' : ''
                            }`}
                          >
                            {/* Left: Icon */}
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${notif.iconBg}`}>
                              <NotifIcon className="h-4.5 w-4.5" />
                            </div>

                            {/* Middle: Title & Desc */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-xs md:text-sm font-black text-slate-900 truncate leading-tight ${notif.unread ? 'text-teal-955 font-black' : ''}`}>
                                  {notif.title}
                                </p>
                                {/* Right: Time */}
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 whitespace-nowrap pt-0.5 shrink-0">
                                  <Clock className="h-2.5 w-2.5" />
                                  {notif.time}
                                </span>
                              </div>
                              <p className="mt-1 text-xs md:text-sm text-slate-700 leading-normal line-clamp-2 font-semibold">
                                {notif.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          alert('Buka halaman detail notifikasi');
                          setNotifOpen(false);
                        }}
                        className="w-full py-2.5 text-center text-xs md:text-sm font-black uppercase tracking-widest text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all"
                      >
                        LIHAT SEMUA NOTIFIKASI
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-xl border border-teal-200 bg-white/95 px-4 text-sm font-black uppercase tracking-[0.05em] text-teal-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-md"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-teal-600">
                  <Download className="h-4 w-4" />
                </span>
                Unduh Laporan
              </button>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-2.5 pr-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-xs font-extrabold text-white shadow-sm">
                    {initials}
                  </div>
                   <div className="hidden sm:block">
                    <p className="text-sm font-black uppercase tracking-[0.04em] leading-4 text-slate-950">{initialName}</p>
                    <p className="text-xs font-black uppercase tracking-[0.05em] text-teal-800">{roleName}</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen ? (
                  isAuthenticated ? (
                    <div className="absolute right-0 top-14 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-sm font-extrabold text-white">
                            {initials}
                          </div>
                           <div>
                            <p className="text-base font-black text-slate-950">{initialName}</p>
                            <p className="text-sm font-bold text-slate-700">{userEmail}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfileOpen(false)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-650"
                          aria-label="Tutup"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-teal-850">Akses</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-700">{accessLabel}</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-black uppercase tracking-[0.03em] text-slate-800 transition hover:bg-slate-50">
                          <UserCircle className="h-4 w-4 text-teal-650" />
                          Profil Saya
                        </button>
                        <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-black uppercase tracking-[0.03em] text-slate-800 transition hover:bg-slate-50">
                          <Settings className="h-4 w-4 text-teal-650" />
                          Pengaturan Akun
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-left text-sm font-black uppercase tracking-[0.03em] text-red-700 transition hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Keluar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute right-0 top-14 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-slate-950">Akses Pengunjung</p>
                          <p className="text-sm font-bold text-slate-700">Silakan login untuk fitur lengkap.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfileOpen(false)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-650"
                          aria-label="Tutup"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-teal-850">Akses</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-750">{accessLabel}</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Link 
                          href="/login" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-center text-sm font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-teal-800"
                        >
                          Masuk (Login)
                        </Link>
                        <Link 
                          href="/register" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-center text-sm font-black uppercase tracking-wider text-teal-700 shadow-sm transition hover:bg-teal-50"
                        >
                          Daftar Sekarang
                        </Link>
                        <button 
                          type="button" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-center text-sm font-black uppercase tracking-wider text-red-600 shadow-sm transition hover:bg-red-50"
                        >
                          Keluar Akses Tamu
                        </button>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-teal-400/80 via-teal-400/40 to-transparent" />
    </header>
  )
}
