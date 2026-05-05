import type { GeographyDimension, SegmentDimension } from './types'

const CONDITIONAL_SEGMENT_TYPES = new Set(['By Region', 'By State'])

/** Matches census blocks in the U.S. Providone workbook / value.json key order. */
export const US_CENSUS_REGIONS_ORDER = ['Northeast', 'Midwest', 'South', 'Southwest', 'West'] as const

const US_GEO_ALIASES = new Set([
  'United States',
  'US',
  'U.S.',
  'U.S.A.',
  'USA',
])

/**
 * When the processor leaves `regions` / `countries` empty but `all_geographies` follows the
 * workbook order (US, region, …states, next region, …), rebuild the map client-side so the tree + segments work.
 */
export function repairUsMarketGeography(geo: GeographyDimension | undefined): GeographyDimension | undefined {
  if (!geo) return undefined

  const all = [...(geo.all_geographies ?? [])]
  let countries = { ...(geo.countries ?? {}) }
  let regions = [...(geo.regions ?? [])]
  let global = [...(geo.global ?? [])]

  const censusSet = new Set<string>(US_CENSUS_REGIONS_ORDER)
  const looksLikeUsCensusLayout =
    all.includes('United States') && US_CENSUS_REGIONS_ORDER.some(reg => all.includes(reg))

  // Rebuild region → states from workbook order whenever lists are missing or empty (the API often
  // fills `regions` + flat `all_geographies` while leaving `countries` blank or partial).
  if (looksLikeUsCensusLayout) {
    for (let r = 0; r < US_CENSUS_REGIONS_ORDER.length; r++) {
      const reg = US_CENSUS_REGIONS_ORDER[r]
      const i = all.indexOf(reg)
      if (i < 0) continue
      const nextStarts = US_CENSUS_REGIONS_ORDER.map(name => all.indexOf(name)).filter(j => j > i)
      const nextIdx = nextStarts.length > 0 ? Math.min(...nextStarts) : all.length
      const chunk = all.slice(i + 1, nextIdx)
      const states = chunk.filter(x => x !== 'United States' && !censusSet.has(x))
      if (states.length === 0) continue
      const existing = countries[reg]
      if (!existing || existing.length === 0) countries[reg] = states
    }
  }

  if (regions.length === 0 && Object.keys(countries).length > 0) {
    regions = US_CENSUS_REGIONS_ORDER.filter(reg => countries[reg] != null || all.includes(reg))
  }

  if (global.length > 1 && global.includes('United States')) {
    global = ['United States']
  } else if (global.length === 0 && all.includes('United States')) {
    global = ['United States']
  }

  return { ...geo, global, regions, countries, all_geographies: all }
}

/** Region → state names after US census repair (for filters and chart matching). */
export function getUsRegionToStates(geo: GeographyDimension | undefined): Record<string, string[]> {
  const fixed = repairUsMarketGeography(geo) ?? geo
  return { ...(fixed?.countries ?? {}) }
}

/** Census region names for matching geography filters (Northeast, Midwest, …). */
export function getCensusRegionsList(geo: GeographyDimension | undefined): string[] {
  if (!geo) return []
  const fixed = repairUsMarketGeography(geo) ?? geo
  const r = fixed.regions ?? []
  if (r.length > 0) return r
  return Object.keys(fixed.countries ?? {})
}

export function isUsCountrySelected(selectedGeographies: string[]): boolean {
  return selectedGeographies.some(g => US_GEO_ALIASES.has(g))
}

/**
 * Ensure By Region / By State exist for US census layouts even if the API payload omitted synthetics.
 */
export function getEffectiveSegments(
  segments: Record<string, SegmentDimension> | undefined,
  geo: GeographyDimension | undefined
): Record<string, SegmentDimension> {
  const out: Record<string, SegmentDimension> = { ...(segments ?? {}) }
  if (!geo) return out
  geo = repairUsMarketGeography(geo) ?? geo

  const regionKeys = getCensusRegionsList(geo)
  if (regionKeys.length === 0) return out

  if (!out['By Region']) {
    out['By Region'] = {
      type: 'flat',
      items: [...regionKeys].sort((a, b) => a.localeCompare(b)),
      hierarchy: {},
    }
  }

  const stateSet = new Set<string>()
  for (const sts of Object.values(geo.countries ?? {})) {
    for (const s of sts) {
      if (s && !/^\d{4}$/.test(String(s))) stateSet.add(s)
    }
  }
  if (stateSet.size > 0) {
    const items = Array.from(stateSet).sort((a, b) => a.localeCompare(b))
    const existing = out['By State']
    if (!existing) {
      out['By State'] = {
        type: 'flat',
        items,
        hierarchy: {},
      }
    } else if (!existing.items?.length) {
      out['By State'] = {
        ...existing,
        type: existing.type ?? 'flat',
        items,
        hierarchy: existing.hierarchy ?? {},
      }
    }
  }

  return out
}

/**
 * US market UX: "By Region" when the country is selected; "By State" when a census region is selected.
 */
export function getSegmentTypesForFilters(
  segments: Record<string, SegmentDimension> | undefined,
  selectedGeographies: string[],
  geo: GeographyDimension | undefined
): string[] {
  if (!segments || Object.keys(segments).length === 0) return []
  segments = getEffectiveSegments(segments, geo)

  const allKeys = Object.keys(segments)
  const base = allKeys.filter(k => !CONDITIONAL_SEGMENT_TYPES.has(k))
  const censusRegions = getCensusRegionsList(geo)
  const usSelected = isUsCountrySelected(selectedGeographies)
  const regionSelected = selectedGeographies.some(g => censusRegions.includes(g))

  const tail: string[] = []
  if (usSelected && allKeys.includes('By Region')) tail.push('By Region')
  if (regionSelected && allKeys.includes('By State')) tail.push('By State')

  return [...base, ...tail]
}
