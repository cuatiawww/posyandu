/**
 * URL builder untuk request frontend.
 *
 * Semua request ke backend dilakukan via API proxy Next.js (server-side)
 * untuk menghindari CORS issue. Tidak ada lagi referensi ke /web_api/.
 *
 * Backend utama: web.php → ApiController
 */

const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

/**
 * Base URL API backend (untuk client-side direct calls seperti login/captcha
 * yang sudah dikonfigurasi CORS di backend).
 */
export function getApiBaseUrl(): string {
  return `${BACKEND_BASE_URL}/api`
}

/**
 * Build URL langsung ke backend (untuk login, captcha, regions, dll).
 * Hanya gunakan ini untuk endpoint yang sudah CORS-safe.
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (normalizedPath === '/api') {
    return getApiBaseUrl()
  }

  // Semua /api/... → langsung ke backend utama (web.php / ApiController)
  if (normalizedPath.startsWith('/api/')) {
    return `${BACKEND_BASE_URL}${normalizedPath}`
  }

  // Fallback
  return `${getApiBaseUrl()}${normalizedPath}`
}

/**
 * URL untuk bencana-stats — selalu via proxy Next.js (server-side)
 * agar tidak ada CORS. Endpoint ini PUBLIC — tidak perlu token.
 * Wilayah scope dikirim terpisah jika diperlukan.
 */
export function buildBencanaStatsUrl(): string {
  return `/api/bencana-stats`
}

/**
 * URL regions — langsung ke backend (public endpoint, CORS sudah dikonfigurasi).
 */
export function buildRegionsUrl(query?: Record<string, string>): string {
  const params = query ? new URLSearchParams(query).toString() : ''
  const queryString = params ? `?${params}` : ''
  return `${BACKEND_BASE_URL}/api/regions${queryString}`
}
