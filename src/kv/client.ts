export async function kvGet<T>(path: string): Promise<T | null> {
  const base = window.CRIBL_API_URL
  if (!base) return null
  try {
    const res = await fetch(`${base}/kvstore/${path}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`KV GET ${path} ${res.status}`)
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function kvPut(
  path: string,
  value: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const base = window.CRIBL_API_URL
  if (!base) return { ok: false, error: 'CRIBL_API_URL missing' }
  try {
    const res = await fetch(`${base}/kvstore/${path}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    })
    if (!res.ok) return { ok: false, error: `KV PUT ${path} ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'KV PUT failed' }
  }
}
