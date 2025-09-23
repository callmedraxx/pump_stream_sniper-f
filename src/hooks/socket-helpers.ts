// Shared parsing and transform helpers for SSE/WebSocket hooks
import { parseFormattedAge } from '../utils/time.utils'
export const parseFormattedNumber = (value: any, debugContext?: string): number => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return 0
    const cleaned = trimmed.replace(/[$,]/g, '')
    const match = cleaned.match(/^(-?\d+(?:\.\d+)?)(K|M|B|k|m|b)?$/i)
    if (match) {
      const num = parseFloat(match[1])
      if (isNaN(num)) return 0
      const suffix = match[2]?.toUpperCase()
      switch (suffix) {
        case 'K': return num * 1000
        case 'M': return num * 1000000
        case 'B': return num * 1000000000
        default: return num
      }
    }
    const directParse = parseFloat(cleaned)
    return isNaN(directParse) ? 0 : directParse
  }
  if (debugContext) console.warn(`parseFormattedNumber: Unexpected value type for ${debugContext}:`, typeof value, value)
  return 0
}

export const parsePriceChange = (value: any, debugContext?: string): number => {
  const num = parseFormattedNumber(value, debugContext)
  if (num === 0) return 0
  if (Math.abs(num) > 1.5) return num / 100
  return num
}

// Helper: normalize/trim candle arrays to last `maxPoints` items
const normalizeCandleData = (raw: any, maxPoints = 100) => {
  if (!raw) return null
  if (!Array.isArray(raw)) return raw // keep non-array payloads as-is
  // If candles are objects or arrays, keep the last maxPoints
  return raw.length > maxPoints ? raw.slice(-maxPoints) : raw
}

export const transformBackendToken = (backendToken: any): any => {
  // Robust mint extraction: check common variants and nested raw payloads
  const tokenMint = (
    backendToken.mint_address ||
    backendToken.mint ||
    backendToken.token_info?.mint ||
    backendToken.raw?.mint_address ||
    backendToken.raw?.mint ||
    backendToken.data?.mint_address ||
    backendToken.data?.mint ||
    ''
  )
  const debugPrefix = `Token ${String(tokenMint || 'unknown').slice(0,8)}`
  if (!tokenMint) {
    // Helpful debug when backend payload lacks a mint (causes empty GMGN links)
    try { console.debug(`${debugPrefix} - no mint found on backend payload`, backendToken) } catch (e) {}
  }

  const volume24h = backendToken.volume?.['24h'] || backendToken.trading_info?.volume_24h || 0
  const txns24h = backendToken.txns?.['24h'] || backendToken.trading_info?.txns_24h || 0
  const traders24h = backendToken.traders?.['24h'] || backendToken.trading_info?.traders_24h || 0
  const priceChange24h = backendToken.price_changes?.['24h'] || backendToken.trading_info?.price_change_24h || 0

  // New: canonicalize candle data from multiple possible backend keys
  const rawCandleData =
    backendToken.candle_data ??
    backendToken.candleData ??
    backendToken.trading_info?.candle_data ??
    backendToken.market_data?.candle_data ??
    backendToken.raw_data?.candle_data ??
    null

  // Normalize / trim to a reasonable number of points (adjust maxPoints as needed)
  const candle_data = normalizeCandleData(rawCandleData, 200)

  const out = {
    token_info: {
      mint: tokenMint || '',
      name: backendToken.name || backendToken.token_info?.name || '',
      symbol: backendToken.symbol || backendToken.token_info?.symbol || '',
      description: backendToken.description || backendToken.token_info?.description || null,
      image_uri: backendToken.image_url || backendToken.token_info?.image_uri || null,
      metadata_uri: backendToken.token_info?.metadata_uri || null,
      video_uri: backendToken.token_info?.video_uri || null
    },
    market_data: {
      market_cap: backendToken.mcap || backendToken.market_data?.market_cap || '0',
      usd_market_cap: backendToken.mcap || backendToken.market_data?.usd_market_cap || '0',
      progress_percentage: parseFloat(backendToken.progress) || backendToken.market_data?.progress_percentage || 0,
      last_trade_formatted: backendToken.market_data?.last_trade_formatted || null,
      ath: backendToken.ath || backendToken.market_data?.ath || null
    },
    creator_info: {
      creator: backendToken.creator || backendToken.creator_info?.creator || '',
  created_formatted: backendToken.age ?? backendToken.creator_info?.created_formatted ?? undefined,
      // New enrichment fields (keep multiple naming variants for compatibility)
      created_count: backendToken.created_coin_count || backendToken.creator_info?.created_count || backendToken.created_count || 0,
      created_coin_count: backendToken.created_coin_count || backendToken.creator_info?.created_coin_count || backendToken.created_count || 0,
      creator_balance_sol: backendToken.creator_balance_sol || backendToken.creator_info?.creator_balance_sol || backendToken.creator_balance_sol || 0,
      creator_balance_usd: backendToken.creator_balance_usd || backendToken.creator_info?.creator_balance_usd || backendToken.creator_balance_usd || 0
    },
    social_links: {
      twitter:
        backendToken.social_links?.twitter || backendToken.twitter || backendToken.twitter_url || backendToken.raw_data?.social_links?.twitter || null,
      website:
        backendToken.social_links?.website || backendToken.website || backendToken.url || backendToken.raw_data?.social_links?.website || null,
      telegram:
        backendToken.social_links?.telegram || backendToken.telegram || backendToken.tg || backendToken.raw_data?.social_links?.telegram || null
    },
    status_flags: {
      is_currently_live: backendToken.is_live || backendToken.status_flags?.is_currently_live || false,
      nsfw: backendToken.nsfw || backendToken.status_flags?.nsfw || false,
      show_name: backendToken.status_flags?.show_name ?? true,
      is_active: backendToken.is_active || backendToken.status_flags?.is_active || false
    },
    trading_info: {
      virtual_sol_reserves: backendToken.pool_info?.virtual_sol_reserves || backendToken.trading_info?.virtual_sol_reserves || 0,
      real_sol_reserves: backendToken.pool_info?.real_sol_reserves || backendToken.trading_info?.real_sol_reserves || 0,
      total_sol: (backendToken.pool_info?.virtual_sol_reserves || 0) + (backendToken.pool_info?.real_sol_reserves || 0),
      progress_percentage: parseFloat(backendToken.progress) || backendToken.trading_info?.progress_percentage || 0,
      last_trade_timestamp: backendToken.activity?.last_trade_timestamp || backendToken.trading_info?.last_trade_timestamp || null,
      last_trade_formatted: backendToken.trading_info?.last_trade_formatted || null,
      market_cap: backendToken.mcap || backendToken.trading_info?.market_cap || '0',
      usd_market_cap: backendToken.mcap || backendToken.trading_info?.usd_market_cap || '0',
      volume_24h: parseFormattedNumber(volume24h, `${debugPrefix} volume_24h`),
      txns_24h: parseFormattedNumber(txns24h, `${debugPrefix} txns_24h`),
      traders_24h: parseFormattedNumber(traders24h, `${debugPrefix} traders_24h`),
      price_change_24h: parsePriceChange(priceChange24h, `${debugPrefix} price_change_24h`),
      volume_5m: parseFormattedNumber(backendToken.volume?.['5m'] || backendToken.trading_info?.volume_5m || 0, `${debugPrefix} volume_5m`),
      volume_1h: parseFormattedNumber(backendToken.volume?.['1h'] || backendToken.trading_info?.volume_1h || 0, `${debugPrefix} volume_1h`),
      volume_6h: parseFormattedNumber(backendToken.volume?.['6h'] || backendToken.trading_info?.volume_6h || 0, `${debugPrefix} volume_6h`),
      txns_5m: parseFormattedNumber(backendToken.txns?.['5m'] || backendToken.trading_info?.txns_5m || 0, `${debugPrefix} txns_5m`),
      txns_1h: parseFormattedNumber(backendToken.txns?.['1h'] || backendToken.trading_info?.txns_1h || 0, `${debugPrefix} txns_1h`),
      txns_6h: parseFormattedNumber(backendToken.txns?.['6h'] || backendToken.trading_info?.txns_6h || 0, `${debugPrefix} txns_6h`),
      traders_5m: parseFormattedNumber(backendToken.traders?.['5m'] || backendToken.trading_info?.traders_5m || 0, `${debugPrefix} traders_5m`),
      traders_1h: parseFormattedNumber(backendToken.traders?.['1h'] || backendToken.trading_info?.traders_1h || 0, `${debugPrefix} traders_1h`),
      traders_6h: parseFormattedNumber(backendToken.traders?.['6h'] || backendToken.trading_info?.traders_6h || 0, `${debugPrefix} traders_6h`),
      price_change_5m: parsePriceChange(backendToken.price_changes?.['5m'] || backendToken.trading_info?.price_change_5m || 0, `${debugPrefix} price_change_5m`),
      price_change_1h: parsePriceChange(backendToken.price_changes?.['1h'] || backendToken.trading_info?.price_change_1h || 0, `${debugPrefix} price_change_1h`),
      price_change_6h: parsePriceChange(backendToken.price_changes?.['6h'] || backendToken.trading_info?.price_change_6h || 0, `${debugPrefix} price_change_6h`),
      // New: normalized candle data (trimmed to last N points)
      candle_data
    },
    pool_info: {
      complete: backendToken.pool_info?.complete || false,
      is_currently_live: backendToken.is_live || backendToken.pool_info?.is_currently_live || false,
      king_of_hill_timestamp: backendToken.pool_info?.king_of_hill_timestamp || null,
      last_reply: backendToken.activity?.last_reply || backendToken.pool_info?.last_reply || null,
      reply_count: backendToken.activity?.reply_count || backendToken.pool_info?.reply_count || 0,
      raydium_pool: backendToken.pool_info?.raydium_pool || null,
      curve_threshold: backendToken.pool_info?.curve_threshold || null
    },
    activity_info: {
      created_timestamp: (() => {
        // Try multiple sources and formats for created timestamp
        let ts = null;
        
        // First try backendToken.timestamps.created_at
        if (backendToken.timestamps?.created_at) {
          const rawTs = backendToken.timestamps.created_at;
          if (typeof rawTs === 'number') {
            ts = rawTs; // Already a Unix timestamp
          } else if (typeof rawTs === 'string') {
            // Try parsing as ISO string
            const parsed = new Date(rawTs);
            if (!isNaN(parsed.getTime())) {
              ts = parsed.getTime() / 1000;
            } else {
              // Try parsing as relative age string
              ts = parseFormattedAge(rawTs);
            }
          }
        }
        
        // Fallback to backendToken.activity_info.created_timestamp
        if (!ts) {
          ts = backendToken.activity_info?.created_timestamp || null;
        }
        
        console.log('Setting created_timestamp for', backendToken.symbol || backendToken.name, ':', ts, 'from', backendToken.timestamps?.created_at);
        return ts;
      })(),
  created_formatted: (() => {
        const cf = backendToken.age ?? backendToken.activity_info?.created_formatted ?? undefined;
        console.log('Setting created_formatted for', backendToken.symbol || backendToken.name, ':', cf, 'from backendToken.age:', backendToken.age);
        return cf;
      })(),
      nsfw: backendToken.nsfw || backendToken.activity_info?.nsfw || false,
      show_name: backendToken.activity_info?.show_name ?? true,
      creator: backendToken.creator || backendToken.activity_info?.creator || '',
      // new: put dev activity blob here (will be object or null)
      dev_activity: backendToken.dev_activity || backendToken.activity?.dev_activity || backendToken.activity_info?.dev_activity || backendToken.raw_data?.dev_activity || null,
      dev_buy: backendToken.holders?.creator_holding_percentage || backendToken.activity_info?.dev_buy || null,
      dev_sell: backendToken.activity_info?.dev_sell || backendToken.dev_sell || null,
      sniping: backendToken.holders?.creator_is_top_holder || backendToken.activity_info?.sniping || null,
      last_updated: backendToken.timestamps?.updated_at || backendToken.activity_info?.last_updated || null,
      viewers: parseFormattedNumber(backendToken.viewers || backendToken.activity_info?.viewers || 0),
      // Mirror creator balance and created counts into activity_info for UI convenience
      creator_balance_sol: backendToken.creator_balance_sol || backendToken.creator_info?.creator_balance_sol || backendToken.activity_info?.creator_balance_sol || 0,
      creator_balance_usd: backendToken.creator_balance_usd || backendToken.creator_info?.creator_balance_usd || backendToken.activity_info?.creator_balance_usd || 0,
      created_coin_count: backendToken.created_coin_count || backendToken.creator_info?.created_coin_count || backendToken.activity_info?.created_coin_count || backendToken.created_count || 0
    },
    // Preserve raw timestamps so UI components (LiveSince, sorting) can read created_at/updated_at
    timestamps: {
      created_at: backendToken.timestamps?.created_at ?? null,
      updated_at: backendToken.timestamps?.updated_at ?? null
    },
    raw_data: backendToken
  }

  // try { console.log('[transformBackendToken] transformed:', out) } catch (e) {}
  return out
}

export const detectTokenChanges = (prev: any, current: any) => {
  const previousValues: any = {}
  let hasChanges = false

  const fieldsToTrack = [
    { path: ['market_data', 'market_cap'], key: 'market_cap' },
    { path: ['market_data', 'usd_market_cap'], key: 'usd_market_cap' },
    { path: ['market_data', 'progress_percentage'], key: 'progress_percentage' },
    { path: ['market_data', 'ath'], key: 'ath' },
    { path: ['trading_info', 'volume_5m'], key: 'volume_5m' },
    { path: ['trading_info', 'volume_1h'], key: 'volume_1h' },
    { path: ['trading_info', 'volume_6h'], key: 'volume_6h' },
    { path: ['trading_info', 'volume_24h'], key: 'volume_24h' },
    { path: ['trading_info', 'txns_5m'], key: 'txns_5m' },
    { path: ['trading_info', 'txns_1h'], key: 'txns_1h' },
    { path: ['trading_info', 'txns_6h'], key: 'txns_6h' },
    { path: ['trading_info', 'txns_24h'], key: 'txns_24h' },
    { path: ['trading_info', 'traders_5m'], key: 'traders_5m' },
    { path: ['trading_info', 'traders_1h'], key: 'traders_1h' },
    { path: ['trading_info', 'traders_6h'], key: 'traders_6h' },
    { path: ['trading_info', 'traders_24h'], key: 'traders_24h' },
    { path: ['trading_info', 'price_change_5m'], key: 'price_change_5m' },
    { path: ['trading_info', 'price_change_1h'], key: 'price_change_1h' },
    { path: ['trading_info', 'price_change_6h'], key: 'price_change_6h' },
    { path: ['trading_info', 'price_change_24h'], key: 'price_change_24h' },
    { path: ['activity_info', 'viewers'], key: 'viewers' },
    { path: ['pool_info', 'reply_count'], key: 'reply_count' },
    { path: ['status_flags', 'is_currently_live'], key: 'is_currently_live' },
    { path: ['status_flags', 'nsfw'], key: 'nsfw' },
    // NEW tracked fields for enriched backend data:
    { path: ['creator_info', 'created_count'], key: 'created_coin_count' },
    { path: ['creator_info', 'creator_balance_sol'], key: 'creator_balance_sol' },
    { path: ['creator_info', 'creator_balance_usd'], key: 'creator_balance_usd' },
    // dev_activity is an object/blob; JSON.stringify will detect deep changes
    { path: ['activity_info', 'dev_activity'], key: 'dev_activity' },
    { path: ['trading_info', 'candle_data'], key: 'candle_data' }
  ]

  const getNestedValue = (obj: any, path: string[]) => path.reduce((cur, k) => cur?.[k], obj)

  for (const field of fieldsToTrack) {
    const prevValue = getNestedValue(prev, field.path)
    const currentValue = getNestedValue(current, field.path)

    // special-case candle_data to compare only last N points (to avoid heavy comparisons)
    if (field.key === 'candle_data') {
      const MAX_COMPARE_POINTS = 50
      const prevSlice = Array.isArray(prevValue) ? prevValue.slice(-MAX_COMPARE_POINTS) : prevValue
      const curSlice = Array.isArray(currentValue) ? currentValue.slice(-MAX_COMPARE_POINTS) : currentValue
      const valuesAreEqual = JSON.stringify(prevSlice) === JSON.stringify(curSlice)
      if (!valuesAreEqual) {
        hasChanges = true
        previousValues[field.key] = prevSlice
      }
      continue
    }

    const valuesAreEqual = JSON.stringify(prevValue) === JSON.stringify(currentValue)
    if (!valuesAreEqual) {
      hasChanges = true
      previousValues[field.key] = prevValue
    }
  }

  // Always return an object describing whether changes were found and the previous values
  return { hasChanges, previousValues }
}

export const mergeTokenWithChanges = (prev: any, incoming: any) => {
  // Helper: consider empty strings, null or undefined as "no value" so we don't overwrite
  const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

  const selectiveMerge = (base: any, update: any): any => {
    if (base === undefined || base === null) return update
    if (update === undefined || update === null) return base
    // Arrays: prefer non-empty incoming arrays, otherwise keep base
    if (Array.isArray(base) || Array.isArray(update)) {
      return Array.isArray(update) && update.length ? update : base
    }
    if (typeof base === 'object' && typeof update === 'object') {
      const out: any = { ...base }
      for (const key of Object.keys(update)) {
        const inc = update[key]
        if (isEmpty(inc)) continue
        const prevVal = base[key]
        if (typeof inc === 'object' && inc !== null && !Array.isArray(inc) && typeof prevVal === 'object' && prevVal !== null) {
          out[key] = selectiveMerge(prevVal, inc)
        } else {
          out[key] = inc
        }
      }
      return out
    }
    return update
  }

  const merged = {
    ...prev,
    ...incoming,
    token_info: selectiveMerge(prev.token_info, incoming.token_info),
    market_data: selectiveMerge(prev.market_data, incoming.market_data),
    creator_info: selectiveMerge(prev.creator_info, incoming.creator_info),
    social_links: selectiveMerge(prev.social_links, incoming.social_links),
    status_flags: selectiveMerge(prev.status_flags, incoming.status_flags),
    trading_info: selectiveMerge(prev.trading_info, incoming.trading_info),
    pool_info: selectiveMerge(prev.pool_info, incoming.pool_info),
    activity_info: selectiveMerge(prev.activity_info, incoming.activity_info),
    raw_data: selectiveMerge(prev.raw_data, incoming.raw_data)
  }

  const { hasChanges, previousValues } = detectTokenChanges(prev, merged)
  if (hasChanges) {
    return {
      ...merged,
      _isUpdated: true,
      _updatedAt: Date.now(),
      _previousValues: { ...prev._previousValues, ...previousValues }
    }
  }

  return { ...merged, _isUpdated: false, _previousValues: prev._previousValues }
}
