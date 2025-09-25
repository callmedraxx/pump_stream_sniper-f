import { LiveToken } from "@/types/token.types"
import { parseMarketCap } from "./format.utils"
import { parseFormattedAge } from "./time.utils"

/**
 * Sort tokens by age (creation time)
 */
export const sortByAge = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    // Normalize created times using created_at or age
    const getTime = (t: LiveToken) => {
      let ts = 0
      if (t.created_at) ts = parseFormattedAge(t.created_at)
      if (!ts && t.age) ts = parseFormattedAge(t.age)
      return ts
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
        const aTime = parseFormattedAge(a.created_at || a.age || '')
        const bTime = parseFormattedAge(b.created_at || b.age || '')
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
    const created = t.created_at ?? t.live_since ?? t.age ?? null
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