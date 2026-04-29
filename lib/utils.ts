import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

export function formatCurrency(value: number, currency: string = 'USD', unit: string = 'Mn'): string {
  return `${currency} ${value.toFixed(2)} ${unit}`
}

// Get currency symbol based on currency preference
export function getCurrencySymbol(currency: 'USD' | 'INR'): string {
  return currency === 'INR' ? '₹' : '$'
}

// Format unit based on currency preference
export function formatUnit(unit: string, currency: 'USD' | 'INR'): string {
  if (currency === 'INR') {
    return unit.replace('USD Million', '').replace('USD', '').replace('Million', '').trim()
  }
  return unit
}

// Format number according to Indian number system (lakhs, crores)
export function formatIndianNumber(value: number, decimals: number = 2): string {
  const absValue = Math.abs(value)
  let formatted: string
  
  if (absValue >= 10000000) {
    // Crores (1 crore = 10 million)
    formatted = (value / 10000000).toFixed(decimals) + ' Cr'
  } else if (absValue >= 100000) {
    // Lakhs (1 lakh = 100,000)
    formatted = (value / 100000).toFixed(decimals) + ' L'
  } else {
    formatted = value.toFixed(decimals)
  }
  
  return formatted
}

// Format number with Indian comma system (first 3 digits, then groups of 2)
export function formatIndianNumberWithCommas(value: number, decimals: number = 2): string {
  const parts = value.toFixed(decimals).split('.')
  const integerPart = parts[0]
  const decimalPart = parts[1]
  
  // Indian numbering: first 3 digits, then groups of 2
  let formatted = integerPart
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3)
    const remaining = integerPart.slice(0, -3)
    const groups = remaining.match(/.{1,2}/g) || []
    formatted = groups.join(',') + ',' + lastThree
  }
  
  return decimalPart ? `${formatted}.${decimalPart}` : formatted
}

// Format currency value based on currency preference
export function formatCurrencyValue(value: number, currency: 'USD' | 'INR', showUnit: boolean = true): string {
  if (currency === 'INR') {
    const symbol = '₹'
    // For INR, use Indian number system without "Million"
    if (value >= 10000000) {
      return `${symbol} ${formatIndianNumber(value)}${showUnit ? '' : ''}`
    } else if (value >= 100000) {
      return `${symbol} ${formatIndianNumber(value)}${showUnit ? '' : ''}`
    } else {
      return `${symbol} ${formatIndianNumberWithCommas(value)}`
    }
  } else {
    // USD: use standard formatting with Million
    const symbol = '$'
    if (value >= 1000000) {
      return `${symbol} ${(value / 1000000).toFixed(2)} Million`
    }
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function calculateGrowth(startValue: number, endValue: number): number {
  if (startValue === 0) return 0
  return ((endValue - startValue) / startValue) * 100
}

/** True when value_unit is thousands (USD implied elsewhere or omitted on purpose). */
export function isThousandsValueUnit(valueUnit: string | undefined): boolean {
  return (valueUnit || '').trim().toLowerCase() === 'thousands'
}

/**
 * Match KPI cards: stored values are full USD thousands; charts show ÷1000 for readability.
 */
export function getValueChartDisplayDivisor(
  dataType: 'value' | 'volume',
  isINR: boolean,
  valueUnit: string | undefined,
): number {
  if (dataType !== 'value' || isINR) return 1
  return isThousandsValueUnit(valueUnit) ? 1000 : 1
}

/**
 * Scale Recharts row objects: divide numeric series keys, keep `year` (and other non-numeric) as-is.
 */
export function scaleChartDataPointsForDisplay<T extends Record<string, unknown>>(
  data: T[],
  divisor: number,
  preserveKeys: Set<string> = new Set(['year']),
): T[] {
  if (divisor === 1 || data.length === 0) return data
  return data.map((row) => {
    const out = { ...row } as Record<string, unknown>
    for (const key of Object.keys(out)) {
      if (preserveKeys.has(key)) continue
      const v = out[key]
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[key] = v / divisor
      }
    }
    return out as T
  })
}

export function formatCompactAxisTick(value: number): string {
  if (!Number.isFinite(value)) return ''
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}

/**
 * Chart axis title: e.g. Market size (Thousands) — not (USD Thousands).
 */
export function formatMarketValueChartTitle(
  kind: 'Market Value' | 'Market Size',
  opts: {
    dataType: 'value' | 'volume'
    isINR: boolean
    currency: string
    currencySymbol: string
    valueUnit?: string
    volumeUnit?: string
  }
): string {
  const { dataType, isINR, currency, currencySymbol, valueUnit, volumeUnit } = opts
  if (dataType !== 'value') {
    return `Market Volume (${volumeUnit || 'Units'})`
  }
  if (isINR) {
    return `${kind} (${currencySymbol})`
  }
  if (isThousandsValueUnit(valueUnit)) {
    return `${kind} (Thousands)`
  }
  const u = (valueUnit || '').trim()
  return u ? `${kind} (${currency} ${u})` : `${kind} (${currency})`
}

/**
 * Tooltip / table suffix for value mode: Thousands only when applicable; INR uses symbol.
 */
export function formatValueDataUnitLabel(
  dataType: 'value' | 'volume',
  isINR: boolean,
  currency: string,
  valueUnit: string | undefined,
  volumeUnit: string | undefined,
  currencySymbol: string,
): string {
  if (dataType !== 'value') {
    return volumeUnit || 'Units'
  }
  if (isINR) return currencySymbol
  if (isThousandsValueUnit(valueUnit)) return 'Thousands'
  const u = (valueUnit || '').trim()
  return u ? `${currency} ${u}` : currency
}

/**
 * KPI card number line for value: no "$" when unit is Thousands.
 * Values are stored as USD thousands; show compact form (÷1000) e.g. 28,193 not 28,193,463.0.
 */
export function formatKpiValueAmountLine(
  value: number,
  currency: 'USD' | 'INR',
  valueUnit: string | undefined,
  dataType: 'value' | 'volume',
  volumeUnit: string | undefined,
  decimals = 1
): string {
  if (dataType !== 'value') {
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return `${formatted} ${volumeUnit || 'Units'}`
  }
  if (currency === 'INR') {
    return `₹ ${formatIndianNumber(value)}`
  }
  if (isThousandsValueUnit(valueUnit)) {
    const compact = Math.round(value / 1000)
    const compactFormatted = compact.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })
    return `${compactFormatted} Thousands`
  }
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const u = (valueUnit || '').trim()
  return `$ ${formatted}${u ? ` ${u}` : ''}`
}

