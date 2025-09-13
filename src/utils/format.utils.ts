/**
 * Parse market cap strings (e.g., "35.0K" -> 35000, "1.2M" -> 1200000)
 */
export const parseMarketCap = (mcapStr: string | number | null | undefined): number => {
  // Handle null, undefined, or non-string/non-number values
  if (mcapStr == null) return 0
  
  // If it's already a number, return it
  if (typeof mcapStr === 'number') return mcapStr
  
  // Convert to string if it's not already
  const strValue = String(mcapStr)
  
  // Handle empty strings or 'N/A'
  if (!strValue || strValue === 'N/A' || strValue === 'null' || strValue === 'undefined') return 0
  
  // Remove dollar signs, commas, and other formatting characters
  const cleanStr = strValue.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleanStr)
  
  // Return 0 if parsing failed
  if (isNaN(num)) return 0
  
  if (cleanStr.includes('K')) return num * 1000
  if (cleanStr.includes('M')) return num * 1000000
  if (cleanStr.includes('B')) return num * 1000000000
  
  return num
}

/**
 * Format market cap values for display
 */
export const formatMarketCap = (value: number): string => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

/**
 * Format volume values
 */
export const formatVolume = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}