/**
 * Single source of truth for the API base URL.
 *
 * The environment picks itself from the hostname the app is served on, so
 * nobody has to remember to swap a `.env` between local, testing and
 * production — and a stale local file cannot point a dev server at the wrong
 * backend, which is exactly how testing traffic ended up in the wrong place.
 *
 * `VITE_API_BASE_URL` still wins when it is set, as a deliberate override for
 * one-off runs (pointing a local UI at production, say).
 */

/** Backend for each frontend host. Keys are hostnames, no protocol or port. */
const HOST_TO_API: Record<string, string> = {
  // Testing
  'testing-storybrand-frontend.bakano.ec': 'https://testing-storybrand-backapp.bakano.ec/api',

  // Production
  'tequecruncheese.com': 'https://tequecrunchesse-backapp.vercel.app/api',
  'www.tequecruncheese.com': 'https://tequecrunchesse-backapp.vercel.app/api',
  'tequecrunchesse.netlify.app': 'https://tequecrunchesse-backapp.vercel.app/api',
}

const LOCAL_API = 'http://localhost:8101/api'
const PRODUCTION_API = 'https://tequecrunchesse-backapp.vercel.app/api'

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local') ||
    // Vite's --host exposes the dev server on the LAN address.
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname)
  )
}

/** Normalise to a base that always ends in exactly one `/api`. */
function normalize(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/api') || /\/api\//.test(trimmed) ? trimmed : `${trimmed}/api`
}

function resolveApiBaseUrl(): string {
  const override = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (override) return normalize(override)

  // SSR or a non-browser context has no location to read.
  if (typeof window === 'undefined') return PRODUCTION_API

  const { hostname } = window.location

  if (isLocalHost(hostname)) return LOCAL_API

  const mapped = HOST_TO_API[hostname]
  if (mapped) return mapped

  // An unlisted host is more likely a new production domain than a new dev
  // box, so default to production rather than to a backend that is not there.
  console.warn(
    `[api] Host "${hostname}" is not in HOST_TO_API — falling back to production. ` +
      'Add it to src/config/api.ts.',
  )
  return PRODUCTION_API
}

export const API_BASE_URL = resolveApiBaseUrl()
