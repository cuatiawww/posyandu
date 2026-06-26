'use client'

import { useCallback, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/authStore'
import DashboardHeader, { DashboardSidebar } from './DashboardHeader'
import Footer from './Footer'
import { Loader2 } from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isGuest, isInitialized, initialize } = useAuthStore()

  const publicRoutes = ['/login', '/register', '/forgot-password', '/sso']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isInitialized && !isAuthenticated && !isGuest && !isPublicRoute) {
      router.push('/login')
    }
  }, [isInitialized, isAuthenticated, isGuest, isPublicRoute, router])

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbffff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
      </div>
    )
  }

  if (isPublicRoute) {
    return <main className="min-h-screen bg-slate-50">{children}</main>
  }

  if (!isAuthenticated && !isGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbffff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      <DashboardSidebar open={sidebarOpen} onClose={closeSidebar} />
      <DashboardHeader onToggleSidebar={() => setSidebarOpen((open) => !open)} />
      {children}
      <Footer />
    </main>
  )
}

