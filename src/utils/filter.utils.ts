import { LiveToken } from '@/types/token.types'

export interface FilterPreferences {
  minViewers?: number
  minTraders?: number
  minUsdMarketCap?: number
  minAgeDays?: number
  minVolume24h?: number
  minTxns24h?: number
  creatorContains?: string
  excludeMigrated?: boolean
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

    if (filters.minTraders != null) {
      const traders = (t.trading_info?.traders_24h ?? t.trading_info?.traders_1h ?? 0) as number
      if (traders < filters.minTraders) return false
    }

    if (filters.minUsdMarketCap != null) {
      const usdStr = t.market_data?.usd_market_cap ?? t.trading_info?.usd_market_cap ?? t.market_data?.market_cap
      const marketCap = parseUsdMarketCap(usdStr)
      if (marketCap < filters.minUsdMarketCap) return false
    }

    if (filters.minVolume24h != null) {
      const vol = (t.trading_info?.volume_24h ?? t.trading_info?.volume_1h ?? 0) as number
      if (vol < filters.minVolume24h) return false
    }

    if (filters.minTxns24h != null) {
      const txns = (t.trading_info?.txns_24h ?? t.trading_info?.txns_1h ?? 0) as number
      if (txns < filters.minTxns24h) return false
    }

    if (filters.minAgeDays != null) {
      const created = (t.activity_info?.created_timestamp ?? t.activity_info?.created_timestamp) as number | undefined
      if (!created) return false
      const ageDays = (nowSec - created) / 86400
      if (ageDays < filters.minAgeDays) return false
    }

    if (filters.creatorContains != null && filters.creatorContains.trim() !== '') {
      const creator = (t.creator_info?.creator || t.activity_info?.creator || '').toString().toLowerCase()
      if (!creator.includes(filters.creatorContains.toString().toLowerCase())) return false
    }

    if (filters.excludeMigrated) {
      // migrated: 0 volume + 0 txns + 0 traders and ath < 100k
      const vol = (t.trading_info?.volume_24h ?? t.trading_info?.volume_1h ?? 0) as number
      const txns = (t.trading_info?.txns_24h ?? t.trading_info?.txns_1h ?? 0) as number
      const traders = (t.trading_info?.traders_24h ?? t.trading_info?.traders_1h ?? 0) as number
      const athStr = t.market_data?.ath ?? t.trading_info?.price_change_24h ?? null
      const ath = parseUsdMarketCap(athStr)
      const isMigrated = vol === 0 && txns === 0 && traders === 0 && ath < 100000
      if (isMigrated) return false
    }

    return true
  })
}

export default {
  applyFilters
}
