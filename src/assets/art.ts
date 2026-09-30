const speciesArt = import.meta.glob('./art/species/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const silhouetteArt = import.meta.glob('./art/silhouettes/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const emptyArt = import.meta.glob('./art/empty-states/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const facilityArtModules = import.meta.glob('./art/facilities/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function byFilename(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split('/').pop()?.replace(/\.webp$/, '')
    if (name) out[name] = url
  }
  return out
}

const speciesById = byFilename(speciesArt)
const silhouetteById = byFilename(silhouetteArt)
const emptyById = byFilename(emptyArt)
const facilityById = byFilename(facilityArtModules)

export function speciesIllustration(speciesId: string): string | undefined {
  return speciesById[speciesId]
}

export function speciesSilhouette(speciesId: string): string | undefined {
  return silhouetteById[speciesId]
}

export function emptyState(id: string): string | undefined {
  return emptyById[id]
}

/** Facility keys: vehicle | charger | incubator | cold-storage */
export function facilityArt(id: string): string | undefined {
  return facilityById[id]
}
