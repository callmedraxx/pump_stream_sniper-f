import { LiveToken } from "@/types/token.types"
import { parseMarketCap } from "./format.utils"
import { parseFormattedAge } from "./time.utils"

/**
 * Sort tokens by age (creation time)
 */
export const sortByAge = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    // Normalize times using `age` (preferred - Supabase timestamp) then `created_at`
    const getTime = (t: LiveToken) => {
      const ageVal = t.age ?? null
      // If age is a number (seconds or ms), convert to ms
      if (typeof ageVal === 'number' && ageVal > 0) {
        return ageVal < 1e12 ? ageVal * 1000 : ageVal
      }

      // If age is a string (ISO or relative), parse via parseFormattedAge
      if (typeof ageVal === 'string' && ageVal.trim() !== '') {
        return parseFormattedAge(ageVal)
      }

      // Fallback to created_at if age missing
      const created = t.created_at ?? null
      if (typeof created === 'number' && created > 0) return created < 1e12 ? created * 1000 : created
      if (typeof created === 'string' && created.trim() !== '') return parseFormattedAge(created)
      return 0
    }

    const aTime = getTime(a)
    const bTime = getTime(b)
    return order === 'asc' ? aTime - bTime : bTime - aTime
  })
}

/**
 * Sort tokens by market cap
 */
export const sortByMarketCap = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = parseMarketCap(a.mcap || 0)
    const bValue = parseMarketCap(b.mcap || 0)
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by all-time high (ATH)
 */
export const sortByATH = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = parseMarketCap(a.ath || 0)
    const bValue = parseMarketCap(b.ath || 0)
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by volume
 */
export const sortByVolume = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = (a as any)[`volume_${timePeriod}`] as number || 0
    const bValue = (b as any)[`volume_${timePeriod}`] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by transaction count
 */
export const sortByTransactions = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = (a as any)[`txns_${timePeriod}`] as number || 0
    const bValue = (b as any)[`txns_${timePeriod}`] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by trader count
 */
export const sortByTraders = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = (a as any)[`traders_${timePeriod}`] as number || 0
    const bValue = (b as any)[`traders_${timePeriod}`] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by price change
 */
export const sortByPriceChange = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = (a as any)[`price_change_${timePeriod}`] as number || 0
    const bValue = (b as any)[`price_change_${timePeriod}`] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by viewer count
 */
export const sortByViewers = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = a.viewers || 0
    const bValue = b.viewers || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by symbol (alphabetically)
 */
export const sortBySymbol = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = (a.symbol || '').toLowerCase()
    const bValue = (b.symbol || '').toLowerCase()
    return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
  })
}

/**
 * Sort tokens by creator (group by creator with most tokens first)
 */
export const sortByCreator = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  // Count tokens per creator
  const creatorCounts = tokens.reduce((acc, token) => {
    const creator = token.creator || 'Unknown'
    acc[creator] = (acc[creator] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Sort creators by token count
  const sortedCreators = Object.entries(creatorCounts)
    .sort(([, countA], [, countB]) => order === 'desc' ? countB - countA : countA - countB)
    .map(([creator]) => creator)

  // Group tokens by creator and sort within each group by age (newest first)
  const groupedTokens: LiveToken[] = []
  sortedCreators.forEach(creator => {
    const creatorTokens = tokens
      .filter(token => (token.creator || 'Unknown') === creator)
      .sort((a, b) => {
        const getTimeFor = (t: LiveToken) => {
          const ageVal = t.age ?? null
          if (typeof ageVal === 'number' && ageVal > 0) return ageVal < 1e12 ? ageVal * 1000 : ageVal
          if (typeof ageVal === 'string' && ageVal.trim() !== '') return parseFormattedAge(ageVal)
          const created = t.created_at ?? null
          if (typeof created === 'number' && created > 0) return created < 1e12 ? created * 1000 : created
          if (typeof created === 'string' && created.trim() !== '') return parseFormattedAge(created)
          return 0
        }
        const aTime = getTimeFor(a)
        const bTime = getTimeFor(b)
        return bTime - aTime // Newest first within each creator group
      })
    groupedTokens.push(...creatorTokens)
  })

  return groupedTokens
}

/**
 * Sort tokens by live since (timestamps.created_at or activity_info.created_timestamp)
 */
export const sortByLiveSince = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  const normalize = (t: LiveToken) => {
    // Prefer created_at (could be ISO string or numeric seconds/ms) then live_since/age
    const created = t.created_at ?? t.live_since ?? null
    if (!created) return 0

    if (typeof created === 'string') {
      const parsed = Date.parse(created)
      return isNaN(parsed) ? 0 : parsed
    }

    if (typeof created === 'number') {
      // convert seconds to ms if needed
      return created < 1e12 ? created * 1000 : created
    }

    return 0
  }

  return [...tokens].sort((a, b) => {
    const aTime = normalize(a)
    const bTime = normalize(b)
    // For live_since: asc = oldest first, desc = newest first
    return order === 'asc' ? aTime - bTime : bTime - aTime
  })
}

/**
 * Sort tokens by trending criteria (complex multi-criteria sorting)
 */
export const sortByTrending = (tokens: LiveToken[], timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
  // Primary: Volume
  const aVolume = (a as any)[`volume_${timePeriod}`] as number || 0
  const bVolume = (b as any)[`volume_${timePeriod}`] as number || 0
    
    if (Math.abs(aVolume - bVolume) > 100) { // Significant difference
      return bVolume - aVolume
    }

    // Secondary: Transactions
  const aTxns = (a as any)[`txns_${timePeriod}`] as number || 0
  const bTxns = (b as any)[`txns_${timePeriod}`] as number || 0
    
    if (Math.abs(aTxns - bTxns) > 10) { // Significant difference
      return bTxns - aTxns
    }

    // Tertiary: Traders
  const aTraders = (a as any)[`traders_${timePeriod}`] as number || 0
  const bTraders = (b as any)[`traders_${timePeriod}`] as number || 0
    
    if (Math.abs(aTraders - bTraders) > 5) { // Significant difference
      return bTraders - aTraders
    }

    // Final: Price change (positive changes preferred)
    const aPriceChange = (a as any)[`price_change_${timePeriod}`] as number || 0
    const bPriceChange = (b as any)[`price_change_${timePeriod}`] as number || 0
    return bPriceChange - aPriceChange
  })
}