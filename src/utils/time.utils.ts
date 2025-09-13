/**
 * Parse ISO timestamp strings or formatted age strings into timestamps
 * Handles formats like:
 * - "2025-09-13T16:50:42.796000" (ISO timestamp)
 * - "5m ago", "2h ago", "3d ago" (relative age)
 */
export const parseFormattedAge = (ageString: string): number => {
  if (!ageString) return 0

  const cleanAge = ageString.trim()

  // Check if it's an ISO timestamp format
  if (isISOTimestamp(cleanAge)) {
    return parseISOTimestamp(cleanAge)
  }

  // Otherwise, parse as relative age format
  return parseRelativeAge(cleanAge)
}

/**
 * Check if a string is an ISO timestamp format
 */
const isISOTimestamp = (str: string): boolean => {
  // Match ISO 8601 formats: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss.sss
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?$/
  return isoPattern.test(str)
}

/**
 * Parse ISO timestamp string to milliseconds
 */
const parseISOTimestamp = (isoString: string): number => {
  try {
    // Handle microseconds by truncating to milliseconds
    let processedString = isoString
    
    // If there are more than 3 decimal places, truncate to 3 (milliseconds)
    const microsecondMatch = isoString.match(/\.(\d{4,6})/)
    if (microsecondMatch) {
      const microseconds = microsecondMatch[1]
      const milliseconds = microseconds.substring(0, 3)
      processedString = isoString.replace(/\.\d{4,6}/, `.${milliseconds}`)
    }
    
    // Add 'Z' if no timezone info is present
    if (!processedString.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(processedString)) {
      processedString += 'Z'
    }

    const timestamp = new Date(processedString).getTime()
    
    if (isNaN(timestamp)) {
      console.warn(`Failed to parse ISO timestamp: "${isoString}"`)
      return 0
    }
    
    return timestamp
  } catch (error) {
    console.warn(`Error parsing ISO timestamp: "${isoString}"`, error)
    return 0
  }
}

/**
 * Parse relative age strings like "5m ago", "2h ago", "3d ago"
 */
const parseRelativeAge = (ageString: string): number => {
  // Convert to lowercase and remove extra whitespace
  const cleanAge = ageString.toLowerCase().trim()

  // Handle "just now" or "now" cases
  if (cleanAge.includes('now') || cleanAge === '0s') {
    return Date.now()
  }

  // Remove "ago" and other common suffixes
  const withoutSuffix = cleanAge
    .replace(/\s*ago\s*/gi, '')
    .replace(/\s*old\s*/gi, '')
    .trim()

  // Try multiple regex patterns for different formats
  const patterns = [
    /^(\d+(?:\.\d+)?)(mo)$/,                                        // "5mo" (months)
    /^(\d+(?:\.\d+)?)\s*([smhdy]|sec|min|hour|day|month|year)s?$/,  // "5m", "2h", "3d"
    /^(\d+(?:\.\d+)?)\s*(second|minute|hour|day|month|year)s?$/,    // "5 minutes", "2 hours"
    /^(\d+(?:\.\d+)?)\s*([smhdy])$/,                                // "5m", "2h" (no space)
    /^(\d+(?:\.\d+)?)([smhdy])$/,                                   // "5m", "2h" (no space at all)
  ]

  let match = null
  for (const pattern of patterns) {
    match = withoutSuffix.match(pattern)
    if (match) break
  }

  if (!match) {
    console.warn(`Failed to parse relative age format: "${ageString}"`)
    return 0
  }

  const value = parseFloat(match[1])
  const unit = match[2] || 's'

  if (isNaN(value)) {
    console.warn(`Invalid age value: "${ageString}" -> value: ${match[1]}`)
    return 0
  }

  const now = Date.now()
  let millisecondsAgo = 0

  // Map units to milliseconds
  switch (unit) {
    case 'mo': // months (special case)
      millisecondsAgo = value * 30 * 24 * 60 * 60 * 1000 // ~30 days per month
      break
    case 's': // seconds
    case 'sec':
      millisecondsAgo = value * 1000
      break
    case 'm': // minutes
    case 'min':
      millisecondsAgo = value * 60 * 1000
      break
    case 'h': // hours
    case 'hour':
      millisecondsAgo = value * 60 * 60 * 1000
      break
    case 'd': // days
    case 'day':
      millisecondsAgo = value * 24 * 60 * 60 * 1000
      break
    case 'y': // years
    case 'year':
      millisecondsAgo = value * 365 * 24 * 60 * 60 * 1000
      break
    default:
      // Fallback: try first character
      switch (unit.charAt(0)) {
        case 's': millisecondsAgo = value * 1000; break
        case 'm': millisecondsAgo = value * 60 * 1000; break
        case 'h': millisecondsAgo = value * 60 * 60 * 1000; break
        case 'd': millisecondsAgo = value * 24 * 60 * 60 * 1000; break
        case 'y': millisecondsAgo = value * 365 * 24 * 60 * 60 * 1000; break
        default:
          console.warn(`Unknown age unit: "${unit}" in "${ageString}"`)
          millisecondsAgo = value * 1000 // Default to seconds
      }
  }

  return now - millisecondsAgo
}

/**
 * Convert timestamp to human-readable relative time (e.g., "2h", "3d", "1mo")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diffMs = now - timestamp

  // Handle future timestamps (should not happen, but just in case)
  if (diffMs < 0) return 'now'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  // Return the most appropriate unit
  if (years > 0) return `${years}y`
  if (months > 0) return `${months}mo`
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  if (seconds > 10) return `${seconds}s`
  return 'now'
}

/**
 * Convert age string (ISO or relative) directly to human-readable format
 */
export const getHumanReadableAge = (ageString: string): string => {
  const timestamp = parseFormattedAge(ageString)
  if (timestamp === 0) return 'unknown'
  return formatRelativeTime(timestamp)
}
