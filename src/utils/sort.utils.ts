import { LiveToken } from "@/types/token.types"
import { parseMarketCap } from "./format.utils"
import { parseFormattedAge } from "./time.utils"

/**
 * Sort tokens by age (creation time)
 */
export const sortByAge = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    // First try to parse the formatted age string
    let aTime = parseFormattedAge(a.creator_info.created_formatted || '')
    let bTime = parseFormattedAge(b.creator_info.created_formatted || '')
    
    // If parsing failed, try to use raw timestamp if available
    if (aTime === 0 && a.activity_info.created_timestamp) {
      aTime = a.activity_info.created_timestamp
    }
    if (bTime === 0 && b.activity_info.created_timestamp) {
      bTime = b.activity_info.created_timestamp
    }
    
    // Fallback: try to parse as date string
    if (aTime === 0) {
      const parsedA = new Date(a.creator_info.created_formatted || 0).getTime()
      if (!isNaN(parsedA)) aTime = parsedA
    }
    if (bTime === 0) {
      const parsedB = new Date(b.creator_info.created_formatted || 0).getTime()
      if (!isNaN(parsedB)) bTime = parsedB
    }
    
    // Sort by timestamp (newer tokens have higher timestamps)
    // For age sorting: asc = oldest first, desc = newest first
    return order === 'asc' ? aTime - bTime : bTime - aTime
  })
}

/**
 * Sort tokens by market cap
 */
export const sortByMarketCap = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = parseMarketCap(a.market_data.usd_market_cap)
    const bValue = parseMarketCap(b.market_data.usd_market_cap)
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by all-time high (ATH)
 */
export const sortByATH = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = parseMarketCap(a.market_data.ath || '0')
    const bValue = parseMarketCap(b.market_data.ath || '0')
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by volume
 */
export const sortByVolume = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = a.trading_info[`volume_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bValue = b.trading_info[`volume_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by transaction count
 */
export const sortByTransactions = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = a.trading_info[`txns_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bValue = b.trading_info[`txns_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by trader count
 */
export const sortByTraders = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = a.trading_info[`traders_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bValue = b.trading_info[`traders_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by price change
 */
export const sortByPriceChange = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = a.trading_info[`price_change_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bValue = b.trading_info[`price_change_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by viewer count
 */
export const sortByViewers = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = a.activity_info.viewers || 0
    const bValue = b.activity_info.viewers || 0
    return order === 'asc' ? aValue - bValue : bValue - aValue
  })
}

/**
 * Sort tokens by symbol (alphabetically)
 */
export const sortBySymbol = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  return [...tokens].sort((a, b) => {
    const aValue = (a.token_info.symbol || '').toLowerCase()
    const bValue = (b.token_info.symbol || '').toLowerCase()
    return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
  })
}

/**
 * Sort tokens by creator (group by creator with most tokens first)
 */
export const sortByCreator = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
  // Count tokens per creator
  const creatorCounts = tokens.reduce((acc, token) => {
    const creator = token.creator_info.creator || 'Unknown'
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
      .filter(token => (token.creator_info.creator || 'Unknown') === creator)
      .sort((a, b) => {
        const aTime = new Date(a.creator_info.created_formatted || 0).getTime()
        const bTime = new Date(b.creator_info.created_formatted || 0).getTime()
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
    // Prefer timestamps.created_at (could be ISO string or numeric seconds/ms)
    const created = t.timestamps?.created_at ?? t.activity_info?.created_timestamp ?? null
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
    const aVolume = a.trading_info[`volume_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bVolume = b.trading_info[`volume_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    
    if (Math.abs(aVolume - bVolume) > 100) { // Significant difference
      return bVolume - aVolume
    }

    // Secondary: Transactions
    const aTxns = a.trading_info[`txns_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bTxns = b.trading_info[`txns_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    
    if (Math.abs(aTxns - bTxns) > 10) { // Significant difference
      return bTxns - aTxns
    }

    // Tertiary: Traders
    const aTraders = a.trading_info[`traders_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bTraders = b.trading_info[`traders_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    
    if (Math.abs(aTraders - bTraders) > 5) { // Significant difference
      return bTraders - aTraders
    }

    // Final: Price change (positive changes preferred)
    const aPriceChange = a.trading_info[`price_change_${timePeriod}` as keyof typeof a.trading_info] as number || 0
    const bPriceChange = b.trading_info[`price_change_${timePeriod}` as keyof typeof b.trading_info] as number || 0
    return bPriceChange - aPriceChange
  })
}