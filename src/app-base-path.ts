/**
 * Mount path for this Cribl app (no trailing slash), e.g. `/app-ui/claw-and-order`.
 * Prefer the platform global; fall back to parsing `/app-ui/<id>` from the URL
 * so deep links still work if the global is late/missing.
 */
export function resolveAppBasePath(): string {
  let raw = typeof window !== 'undefined' ? window.CRIBL_BASE_PATH : undefined
  if (!raw && typeof window !== 'undefined') {
    const match = String(window.location.pathname || '').match(/^(\/app-ui\/[^/]+)/)
    raw = match?.[1]
  }
  raw = raw || '/'
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/** Document base href (always trailing slash) for Vite `base: './'` asset URLs. */
export function resolveAppBaseHref(): string {
  const base = resolveAppBasePath()
  return base.endsWith('/') ? base : `${base}/`
}
