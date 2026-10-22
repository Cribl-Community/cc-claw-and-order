import { afterEach, describe, expect, it } from 'vitest'
import { installSandboxShims } from './sandbox-shims'

describe('installSandboxShims', () => {
  const originalLocal = window.localStorage
  const originalSession = window.sessionStorage

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: originalLocal,
    })
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      enumerable: true,
      value: originalSession,
    })
  })

  it('replaces throwing localStorage with an in-memory store', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('sandboxed', 'SecurityError')
      },
    })

    installSandboxShims()

    expect(() => window.localStorage.setItem('k', 'v')).not.toThrow()
    expect(window.localStorage.getItem('k')).toBe('v')
    window.localStorage.removeItem('k')
    expect(window.localStorage.getItem('k')).toBeNull()
  })

  it('leaves a working localStorage alone', () => {
    installSandboxShims()
    window.localStorage.setItem('keep', '1')
    expect(window.localStorage.getItem('keep')).toBe('1')
    expect(window.localStorage).toBe(originalLocal)
    window.localStorage.removeItem('keep')
  })
})
