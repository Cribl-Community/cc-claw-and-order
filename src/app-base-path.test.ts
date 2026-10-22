import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveAppBaseHref, resolveAppBasePath } from './app-base-path'

describe('resolveAppBasePath', () => {
  const originalPath = window.CRIBL_BASE_PATH
  const originalPathname = window.location.pathname

  afterEach(() => {
    if (originalPath === undefined) {
      Reflect.deleteProperty(window, 'CRIBL_BASE_PATH')
    } else {
      window.CRIBL_BASE_PATH = originalPath
    }
    vi.stubGlobal('location', { ...window.location, pathname: originalPathname })
  })

  it('prefers CRIBL_BASE_PATH without trailing slash', () => {
    window.CRIBL_BASE_PATH = '/app-ui/claw-and-order/'
    expect(resolveAppBasePath()).toBe('/app-ui/claw-and-order')
    expect(resolveAppBaseHref()).toBe('/app-ui/claw-and-order/')
  })

  it('infers /app-ui/<id> from the pathname when the global is missing', () => {
    Reflect.deleteProperty(window, 'CRIBL_BASE_PATH')
    vi.stubGlobal('location', {
      ...window.location,
      pathname: '/app-ui/claw-and-order/enclosures',
    })
    expect(resolveAppBasePath()).toBe('/app-ui/claw-and-order')
    expect(resolveAppBaseHref()).toBe('/app-ui/claw-and-order/')
  })

  it('defaults to /', () => {
    Reflect.deleteProperty(window, 'CRIBL_BASE_PATH')
    vi.stubGlobal('location', { ...window.location, pathname: '/enclosures' })
    expect(resolveAppBasePath()).toBe('/')
    expect(resolveAppBaseHref()).toBe('/')
  })
})
