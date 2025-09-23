import { LiveToken } from '@/types/token.types'
import { parseFormattedAge } from '@/utils/time.utils'

export interface FilterPreferences {
  minViewers?: number
  maxViewers?: number
  minTraders?: number
  maxTraders?: number
  minUsdMarketCap?: number
  maxUsdMarketCap?: number
  minAgeDays?: number
  maxAgeDays?: number
  minVolume24h?: number
  maxVolume24h?: number
  minTxns24h?: number
  maxTxns24h?: number
  creatorContains?: string
  excludeMigrated?: boolean
  // if true, only show migrated tokens
  onlyMigrated?: boolean
  // Developer-related filters
  minCreatedCount?: number
  maxCreatedCount?: number
  minCreatorBalanceSol?: number
  maxCreatorBalanceSol?: number
  minCreatorBalanceUsd?: number
  maxCreatorBalanceUsd?: number
  hasTelegram?: boolean
  // Social links filter
  hasSocials?: boolean
  // Market cap near ATH filter (percentage threshold)
  mcapNearAthPercent?: number
  // Notification filter preferences (only notify for tokens matching these criteria)
  notifyMinViewers?: number
  notifyMaxViewers?: number
  notifyMinTraders?: number
  notifyMaxTraders?: number
  notifyMinUsdMarketCap?: number
  notifyMaxUsdMarketCap?: number
  notifyMinVolume24h?: number
  notifyMaxVolume24h?: number
  notifyMinTxns24h?: number
  notifyMaxTxns24h?: number
  notifyHasSocials?: boolean
  notifyHasTelegram?: boolean
}

function parseUsdMarketCap(value: any): number {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,]/g, '').trim()
    // support K/M/B suffixes
    const m = cleaned.match(/^(-?\d+(?:\.\d+)?)([kKmMbB])?$/)
    if (m) {
      const n = parseFloat(m[1])
      const s = (m[2] || '').toLowerCase()
      if (s === 'k') return n * 1e3
      if (s === 'm') return n * 1e6
      if (s === 'b') return n * 1e9
      return n
    }
    const d = parseFloat(cleaned)
    return isNaN(d) ? 0 : d
  }
  return 0
}

export function applyFilters(tokens: LiveToken[], filters: FilterPreferences | null) {
  if (!filters) return tokens
  const nowSec = Math.floor(Date.now() / 1000)

  return tokens.filter((t) => {
    if (!t) return false

    if (filters.minViewers != null) {
      const viewers = t.activity_info?.viewers ?? 0
      if (viewers < filters.minViewers) return false
    }

    if (filters.maxViewers != null) {
      const viewers = t.activity_info?.viewers ?? 0
      if (viewers > filters.maxViewers) return false
    }

    if (filters.minTraders != null) {
      const traders = (t.trading_info?.traders_24h ?? t.trading_info?.traders_1h ?? 0) as number
      if (traders < filters.minTraders) return false
    }

    if (filters.maxTraders != null) {
      const traders = (t.trading_info?.traders_24h ?? t.trading_info?.traders_1h ?? 0) as number
      if (traders > filters.maxTraders) return false
    }

    if (filters.minUsdMarketCap != null) {
      const usdStr = t.market_data?.usd_market_cap ?? t.trading_info?.usd_market_cap ?? t.market_data?.market_cap
      const marketCap = parseUsdMarketCap(usdStr)
      if (marketCap < filters.minUsdMarketCap) return false
    }

    if (filters.maxUsdMarketCap != null) {
      const usdStr = t.market_data?.usd_market_cap ?? t.trading_info?.usd_market_cap ?? t.market_data?.market_cap
      const marketCap = parseUsdMarketCap(usdStr)
      if (marketCap > filters.maxUsdMarketCap) return false
    }

    if (filters.minVolume24h != null) {
      const vol = (t.trading_info?.volume_24h ?? t.trading_info?.volume_1h ?? 0) as number
      if (vol < filters.minVolume24h) return false
    }

    if (filters.maxVolume24h != null) {
      const vol = (t.trading_info?.volume_24h ?? t.trading_info?.volume_1h ?? 0) as number
      if (vol > filters.maxVolume24h) return false
    }

    if (filters.minTxns24h != null) {
      const txns = (t.trading_info?.txns_24h ?? t.trading_info?.txns_1h ?? 0) as number
      if (txns < filters.minTxns24h) return false
    }

    if (filters.maxTxns24h != null) {
      const txns = (t.trading_info?.txns_24h ?? t.trading_info?.txns_1h ?? 0) as number
      if (txns > filters.maxTxns24h) return false
    }

    if (filters.minAgeDays != null) {
      let created: number | undefined

      // Debug: log what we're working with
      console.log('Age filter debug for token:', t.token_info?.symbol, {
        created_timestamp: t.activity_info?.created_timestamp,
        created_formatted: t.activity_info?.created_formatted,
        creator_created_formatted: t.creator_info?.created_formatted,
        timestamps: t.timestamps
      })

      // Try created_timestamp first (Unix timestamp number)
      created = t.activity_info?.created_timestamp as number | undefined

      // Fallback to parsing created_formatted string
      if (!created) {
        const createdFormatted = t.activity_info?.created_formatted as string | undefined
        if (createdFormatted) {
          created = parseFormattedAge(createdFormatted)
          console.log('Parsed from activity_info.created_formatted:', createdFormatted, '->', created)
        }
      }

      // Another fallback to creator_info.created_formatted
      if (!created) {
        const createdFormatted = t.creator_info?.created_formatted as string | undefined
        if (createdFormatted) {
          created = parseFormattedAge(createdFormatted)
          console.log('Parsed from creator_info.created_formatted:', createdFormatted, '->', created)
        }
      }

      // Final fallback: try parsing timestamps.created_at if it's a string
      if (!created && t.timestamps?.created_at) {
        if (typeof t.timestamps.created_at === 'string') {
          created = parseFormattedAge(t.timestamps.created_at)
          console.log('Parsed from timestamps.created_at:', t.timestamps.created_at, '->', created)
        } else if (typeof t.timestamps.created_at === 'number') {
          created = t.timestamps.created_at
          console.log('Used timestamps.created_at as number:', created)
        }
      }

      if (!created || created === 0) {
        console.log('No valid created timestamp found, filtering out token')
        return false
      }

      const ageDays = (nowSec - created) / 86400
      console.log('Calculated age:', ageDays, 'days, filter min:', filters.minAgeDays)
      if (ageDays < filters.minAgeDays) return false
    }

    if (filters.maxAgeDays != null) {
      let created: number | undefined
      
      // Try created_timestamp first (Unix timestamp number)
      created = t.activity_info?.created_timestamp as number | undefined
      
      // Fallback to parsing created_formatted string
      if (!created) {
        const createdFormatted = t.activity_info?.created_formatted as string | undefined
        if (createdFormatted) {
          created = parseFormattedAge(createdFormatted)
        }
      }
      
      // Another fallback to creator_info.created_formatted
      if (!created) {
        const createdFormatted = t.creator_info?.created_formatted as string | undefined
        if (createdFormatted) {
          created = parseFormattedAge(createdFormatted)
        }
      }
      
      if (!created || created === 0) return false
      
      const ageDays = (nowSec - created) / 86400
      if (ageDays > filters.maxAgeDays) return false
    }

    if (filters.creatorContains != null && filters.creatorContains.trim() !== '') {
      const creator = (t.creator_info?.creator || t.activity_info?.creator || '').toString().toLowerCase()
      if (!creator.includes(filters.creatorContains.toString().toLowerCase())) return false
    }

    // Developer filters
    if (filters.minCreatedCount != null) {
      const created = (t.activity_info?.created_coin_count ?? (t.creator_info as any)?.created_count ?? (t.creator_info as any)?.created_coin_count) as number | undefined
      if (!created || created < filters.minCreatedCount) return false
    }

    if (filters.maxCreatedCount != null) {
      const created = (t.activity_info?.created_coin_count ?? (t.creator_info as any)?.created_count ?? (t.creator_info as any)?.created_coin_count) as number | undefined
      if (created && created > filters.maxCreatedCount) return false
    }

    if (filters.minCreatorBalanceSol != null) {
      const sol = (t.activity_info?.creator_balance_sol ?? (t.creator_info as any)?.creator_balance_sol) as number | undefined
      if (!sol || sol < filters.minCreatorBalanceSol) return false
    }

    if (filters.maxCreatorBalanceSol != null) {
      const sol = (t.activity_info?.creator_balance_sol ?? (t.creator_info as any)?.creator_balance_sol) as number | undefined
      if (sol && sol > filters.maxCreatorBalanceSol) return false
    }

    if (filters.minCreatorBalanceUsd != null) {
      const usd = (t.activity_info?.creator_balance_usd ?? (t.creator_info as any)?.creator_balance_usd) as number | undefined
      if (!usd || usd < filters.minCreatorBalanceUsd) return false
    }

    if (filters.maxCreatorBalanceUsd != null) {
      const usd = (t.activity_info?.creator_balance_usd ?? (t.creator_info as any)?.creator_balance_usd) as number | undefined
      if (usd && usd > filters.maxCreatorBalanceUsd) return false
    }

    if (filters.hasTelegram === true) {
      const raw = (t.raw_data as any) ?? {}
      const social = t.social_links ?? raw.social_links ?? {}
      const telegram = social.telegram ?? raw.telegram
      if (!telegram) return false
    }

    if (filters.hasSocials === true) {
      const raw = (t.raw_data as any) ?? {}
      const social = t.social_links ?? raw.social_links ?? {}
      const hasAnySocial = social.twitter || social.website || social.telegram
      if (!hasAnySocial) return false
    }

    if (filters.mcapNearAthPercent != null && filters.mcapNearAthPercent > 0) {
      const currentMcap = parseUsdMarketCap(t.market_data?.usd_market_cap ?? t.trading_info?.usd_market_cap ?? t.market_data?.market_cap)
      const athMcap = parseUsdMarketCap(t.market_data?.ath ?? t.trading_info?.price_change_24h ?? null)
      
      if (currentMcap <= 0 || athMcap <= 0) return false
      
      const percentFromAth = ((athMcap - currentMcap) / athMcap) * 100
      if (percentFromAth > filters.mcapNearAthPercent) return false
    }

    // Determine migratedness
    const vol = (t.trading_info?.volume_24h ?? t.trading_info?.volume_1h ?? 0) as number
    const txns = (t.trading_info?.txns_24h ?? t.trading_info?.txns_1h ?? 0) as number
    const traders = (t.trading_info?.traders_24h ?? t.trading_info?.traders_1h ?? 0) as number
    const complete = (t.pool_info?.complete) as boolean | undefined
    const athStr = t.market_data?.ath ?? t.trading_info?.price_change_24h ?? null
  const ath = parseUsdMarketCap(athStr)
  // migrated tokens: pool marked complete === true and ATH greater than 100,000
  const isMigrated = (complete === true) && ath > 100000

    if (filters.onlyMigrated) {
      // only show migrated tokens
      if (!isMigrated) return false
    } else if (filters.excludeMigrated) {
      // exclude migrated tokens from results
      if (isMigrated) return false
    }

    return true
  })
}

export function applyNotificationFilters(token: LiveToken, filters: FilterPreferences | null): boolean {
  if (!filters || !token) return true // If no notification filters set, allow all notifications

  // Check notification filters - if any are set, token must match ALL of them
  const hasNotificationFilters = 
    filters.notifyMinViewers != null ||
    filters.notifyMaxViewers != null ||
    filters.notifyMinTraders != null ||
    filters.notifyMaxTraders != null ||
    filters.notifyMinUsdMarketCap != null ||
    filters.notifyMaxUsdMarketCap != null ||
    filters.notifyMinVolume24h != null ||
    filters.notifyMaxVolume24h != null ||
    filters.notifyMinTxns24h != null ||
    filters.notifyMaxTxns24h != null ||
    filters.notifyHasSocials === true ||
    filters.notifyHasTelegram === true

  // If no notification filters are set, allow notification
  if (!hasNotificationFilters) return true

  // Apply notification filters
  if (filters.notifyMinViewers != null) {
    const viewers = token.activity_info?.viewers ?? 0
    if (viewers < filters.notifyMinViewers) return false
  }

  if (filters.notifyMaxViewers != null) {
    const viewers = token.activity_info?.viewers ?? 0
    if (viewers > filters.notifyMaxViewers) return false
  }

  if (filters.notifyMinTraders != null) {
    const traders = (token.trading_info?.traders_24h ?? token.trading_info?.traders_1h ?? 0) as number
    if (traders < filters.notifyMinTraders) return false
  }

  if (filters.notifyMaxTraders != null) {
    const traders = (token.trading_info?.traders_24h ?? token.trading_info?.traders_1h ?? 0) as number
    if (traders > filters.notifyMaxTraders) return false
  }

  if (filters.notifyMinUsdMarketCap != null) {
    const usdStr = token.market_data?.usd_market_cap ?? token.trading_info?.usd_market_cap ?? token.market_data?.market_cap
    const marketCap = parseUsdMarketCap(usdStr)
    if (marketCap < filters.notifyMinUsdMarketCap) return false
  }

  if (filters.notifyMaxUsdMarketCap != null) {
    const usdStr = token.market_data?.usd_market_cap ?? token.trading_info?.usd_market_cap ?? token.market_data?.market_cap
    const marketCap = parseUsdMarketCap(usdStr)
    if (marketCap > filters.notifyMaxUsdMarketCap) return false
  }

  if (filters.notifyMinVolume24h != null) {
    const vol = (token.trading_info?.volume_24h ?? token.trading_info?.volume_1h ?? 0) as number
    if (vol < filters.notifyMinVolume24h) return false
  }

  if (filters.notifyMaxVolume24h != null) {
    const vol = (token.trading_info?.volume_24h ?? token.trading_info?.volume_1h ?? 0) as number
    if (vol > filters.notifyMaxVolume24h) return false
  }

  if (filters.notifyMinTxns24h != null) {
    const txns = (token.trading_info?.txns_24h ?? token.trading_info?.txns_1h ?? 0) as number
    if (txns < filters.notifyMinTxns24h) return false
  }

  if (filters.notifyMaxTxns24h != null) {
    const txns = (token.trading_info?.txns_24h ?? token.trading_info?.txns_1h ?? 0) as number
    if (txns > filters.notifyMaxTxns24h) return false
  }

  if (filters.notifyHasSocials === true) {
    const raw = (token.raw_data as any) ?? {}
    const social = token.social_links ?? raw.social_links ?? {}
    const hasAnySocial = social.twitter || social.website || social.telegram
    if (!hasAnySocial) return false
  }

  if (filters.notifyHasTelegram === true) {
    const raw = (token.raw_data as any) ?? {}
    const social = token.social_links ?? raw.social_links ?? {}
    const telegram = social.telegram ?? raw.telegram
    if (!telegram) return false
  }

  return true
}

const filterUtils = {
  applyFilters,
  applyNotificationFilters,
}

export default filterUtils
