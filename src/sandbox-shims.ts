/**
 * Cribl apps run in a sandboxed iframe without allow-same-origin.
 * Touching localStorage/sessionStorage throws SecurityError and can tear down React.
 * Capra (and host-injected scripts) may still probe storage — give them memory stubs.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null
    },
    setItem(key: string, value: string) {
      map.set(key, String(value))
    },
    removeItem(key: string) {
      map.delete(key)
    },
    clear() {
      map.clear()
    },
  }
}

function storageWorks(storage: Storage): boolean {
  const probe = '__claw_storage_probe__'
  storage.setItem(probe, '1')
  storage.removeItem(probe)
  return true
}

function installStorageShim(name: 'localStorage' | 'sessionStorage'): void {
  try {
    const storage = window[name]
    storageWorks(storage)
  } catch {
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        value: createMemoryStorage(),
      })
    } catch {
      // Property may be non-configurable in some embeds; leave as-is.
    }
  }
}

export function installSandboxShims(): void {
  installStorageShim('localStorage')
  installStorageShim('sessionStorage')
}
