'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useDashboardStore } from '@/lib/store'
import { getCensusRegionsList, US_CENSUS_REGIONS_ORDER } from '@/lib/segment-type-options'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'

/** U.S. layout: single country parent + census regions. States are chosen under Segment → By State, not here. */
export function isUsNestedGeographyLayout(
  globalItems: string[],
  regions: string[],
  _countries: Record<string, string[]>
): boolean {
  if (globalItems.length !== 1 || regions.length === 0) return false
  if (globalItems[0] !== 'United States') return false
  const censusSet = new Set<string>(US_CENSUS_REGIONS_ORDER)
  return regions.some(r => censusSet.has(r))
}

export function geographyParentDisplayLabel(parentKey: string): string {
  return parentKey === 'United States' ? 'US' : parentKey
}

export interface GeographyHierarchyListProps {
  selected: string[]
  onToggle: (geography: string) => void
  globalItems: string[]
  regions: string[]
  countries: Record<string, string[]>
  flatOptions: string[]
  searchTerm: string
}

/**
 * Shared tree + search list for US-nested geographies (used by main filters and opportunity matrix).
 */
export function GeographyHierarchyList({
  selected,
  onToggle,
  globalItems,
  regions,
  countries: _countries,
  flatOptions,
  searchTerm,
}: GeographyHierarchyListProps) {
  const [expandedParent, setExpandedParent] = useState(true)

  const parentKey = globalItems[0] || ''
  const parentLabel = geographyParentDisplayLabel(parentKey)

  const searchResults = useMemo(() => {
    if (!searchTerm) return null
    const search = searchTerm.toLowerCase()
    return flatOptions.filter(geo => geo.toLowerCase().includes(search))
  }, [searchTerm, flatOptions])

  const renderCheckbox = (geography: string, indent: number = 0) => (
    <label
      key={geography}
      className="flex items-center py-1.5 hover:bg-blue-50 cursor-pointer"
      style={{ paddingLeft: `${12 + indent * 20}px`, paddingRight: '12px' }}
    >
      <input
        type="checkbox"
        checked={selected.includes(geography)}
        onChange={() => onToggle(geography)}
        className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
      />
      <span className="text-sm text-black flex-1">{geography}</span>
      {selected.includes(geography) && (
        <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
      )}
    </label>
  )

  if (searchResults !== null) {
    if (searchResults.length === 0) {
      return (
        <div className="px-3 py-4 text-sm text-black text-center">
          No geographies found matching your search
        </div>
      )
    }
    return <>{searchResults.map(geo => renderCheckbox(geo, 0))}</>
  }

  return (
    <>
      <div>
        <div className="flex items-center hover:bg-blue-50">
          <button
            type="button"
            onClick={() => setExpandedParent(!expandedParent)}
            className="p-1 ml-1 hover:bg-gray-200 rounded"
          >
            {expandedParent
              ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
          </button>
          <label
            className="flex items-center py-1.5 cursor-pointer flex-1"
            style={{ paddingLeft: '2px', paddingRight: '12px' }}
          >
            <input
              type="checkbox"
              checked={selected.includes(parentKey)}
              onChange={() => onToggle(parentKey)}
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-black font-semibold flex-1">{parentLabel}</span>
            {selected.includes(parentKey) && (
              <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            )}
          </label>
        </div>

        {expandedParent &&
          regions.map(region => (
            <div key={region} className="flex items-center hover:bg-blue-50" style={{ paddingLeft: '28px' }}>
              <label
                className="flex items-center py-1.5 cursor-pointer flex-1"
                style={{ paddingRight: '12px' }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(region)}
                  onChange={() => onToggle(region)}
                  className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-black font-medium flex-1">{region}</span>
                {selected.includes(region) && (
                  <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                )}
              </label>
            </div>
          ))}
      </div>
    </>
  )
}

export function GeographyMultiSelect() {
  const { data, filters, updateFilters } = useDashboardStore()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const { globalItems, regions, countries, hasHierarchy, flatOptions, useUsNestedTree } = useMemo(() => {
    if (!data || !data.dimensions?.geographies) {
      return {
        globalItems: [] as string[],
        regions: [] as string[],
        countries: {} as Record<string, string[]>,
        hasHierarchy: false,
        flatOptions: [] as string[],
        useUsNestedTree: false,
      }
    }

    const geo = data.dimensions.geographies
    const globalItems = geo.global || []
    const countries = geo.countries || {}
    const censusRegions = getCensusRegionsList(geo)
    const hasHierarchy = censusRegions.length > 0
    const flatOptions = geo.all_geographies || []
    const useUsNestedTree = isUsNestedGeographyLayout(globalItems, censusRegions, countries)

    return { globalItems, regions: censusRegions, countries, hasHierarchy, flatOptions, useUsNestedTree }
  }, [data])

  const searchResults = useMemo(() => {
    if (!searchTerm) return null
    const search = searchTerm.toLowerCase()
    return flatOptions.filter(geo => geo.toLowerCase().includes(search))
  }, [searchTerm, flatOptions])

  const handleToggle = (geography: string) => {
    const current = filters.geographies
    const updated = current.includes(geography)
      ? current.filter(g => g !== geography)
      : [...current, geography]

    updateFilters({ geographies: updated })
  }

  const handleSelectAll = () => {
    if (!data) return
    updateFilters({
      geographies: data.dimensions.geographies.all_geographies,
    })
  }

  const handleClearAll = () => {
    updateFilters({ geographies: [] })
  }

  if (!data) return null

  const selectedCount = filters.geographies.length

  const renderCheckbox = (geography: string, indent: number = 0) => (
    <label
      key={geography}
      className="flex items-center py-1.5 hover:bg-blue-50 cursor-pointer"
      style={{ paddingLeft: `${12 + indent * 20}px`, paddingRight: '12px' }}
    >
      <input
        type="checkbox"
        checked={filters.geographies.includes(geography)}
        onChange={() => handleToggle(geography)}
        className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
      />
      <span className="text-sm text-black flex-1">{geography}</span>
      {filters.geographies.includes(geography) && (
        <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
      )}
    </label>
  )

  const renderRegion = (region: string) => (
    <div key={region} className="flex items-center hover:bg-blue-50" style={{ paddingLeft: '12px' }}>
      <label className="flex items-center py-1.5 cursor-pointer flex-1" style={{ paddingRight: '12px' }}>
        <input
          type="checkbox"
          checked={filters.geographies.includes(region)}
          onChange={() => handleToggle(region)}
          className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-black font-medium flex-1">{region}</span>
        {filters.geographies.includes(region) && (
          <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
        )}
      </label>
    </div>
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="text-sm text-black">
          {selectedCount === 0
            ? 'Select geographies...'
            : `${selectedCount} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search geographies..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="px-3 py-2 bg-gray-50 border-b flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1 text-xs bg-gray-100 text-black rounded hover:bg-gray-200"
            >
              Clear All
            </button>
          </div>

          <div className="overflow-y-auto max-h-64">
            {useUsNestedTree ? (
              <GeographyHierarchyList
                selected={filters.geographies}
                onToggle={handleToggle}
                globalItems={globalItems}
                regions={regions}
                countries={countries}
                flatOptions={flatOptions}
                searchTerm={searchTerm}
              />
            ) : searchResults !== null ? (
              searchResults.length === 0 ? (
                <div className="px-3 py-4 text-sm text-black text-center">
                  No geographies found matching your search
                </div>
              ) : (
                searchResults.map(geo => renderCheckbox(geo, 0))
              )
            ) : hasHierarchy ? (
              <>
                {globalItems.map(geo => renderCheckbox(geo, 0))}
                {globalItems.length > 0 && regions.length > 0 && (
                  <div className="border-t border-gray-200 my-1" />
                )}
                {regions.map(region => renderRegion(region))}
              </>
            ) : flatOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-black text-center">
                No geographies available
              </div>
            ) : (
              flatOptions.map(geo => renderCheckbox(geo, 0))
            )}
          </div>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-black">
            {selectedCount} {selectedCount === 1 ? 'geography' : 'geographies'} selected
          </span>
        </div>
      )}
    </div>
  )
}
