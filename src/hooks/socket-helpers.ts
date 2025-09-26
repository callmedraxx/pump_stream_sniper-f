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
  const rawMint = backendToken.mint_address || backendToken.raw_data?.mint_address || backendToken.raw?.mint_address || null
  const tokenMint = typeof rawMint === 'string' ? rawMint.trim().toLowerCase() : rawMint
  const debugPrefix = `Token ${String(tokenMint || 'unknown').slice(0,8)}`
  if (!tokenMint) {
    // Helpful debug when backend payload lacks a mint (causes empty GMGN links)
    try { console.debug(`${debugPrefix} - no mint found on backend payload`, backendToken) } catch (e) {}
  }

  // New: canonicalize candle data from multiple possible backend keys
  const rawCandleData =
    backendToken.candle_data ??
    null

  // Normalize / trim to a reasonable number of points (adjust maxPoints as needed)
  const candle_data = normalizeCandleData(rawCandleData, 200)

  // Extract created timestamp with multiple fallbacks
  const created_timestamp = (() => {
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
    
    // Fallback to other sources
    if (!ts) {
      ts = backendToken.activity_info?.created_timestamp || 
           backendToken.raw_data?.created_timestamp || 
           backendToken.raw?.created_timestamp || 
           null;
    }
    
    return ts;
  })()

  // Extract created_formatted with fallbacks
  const created_formatted = (() => {
    return backendToken.activity_info?.created_formatted ||
           backendToken.raw_data?.created_formatted ||
           backendToken.raw?.created_formatted ||
           backendToken.raw_data?.created_at ||
           backendToken.raw?.created_at ||
           backendToken.age ||
           undefined;
  })()

  // Flatten the structure to match the new LiveToken interface
  const out = {
    // Primary identifier
    id: backendToken.raw_data?.id || backendToken.id || backendToken.raw?.id || null,
    
    // Token identification
    mint_address: tokenMint || '',
    name: backendToken.name || backendToken.token_info?.name || '',
    symbol: backendToken.symbol || backendToken.token_info?.symbol || '',
    description: backendToken.description || backendToken.token_info?.description || null,
    
    // Media URLs
    image_url: backendToken.image_url || backendToken.token_info?.image_uri || null,
    stream_url: backendToken.stream_url || null,
    metadata_uri: backendToken.metadata_uri || backendToken.token_info?.metadata_uri || null,
    video_uri: backendToken.video_uri || backendToken.token_info?.video_uri || null,
    banner_uri: backendToken.banner_uri || null,
    
    // Timestamps
    age: backendToken.age || created_formatted || '',
    created_at: backendToken.created_at || null,
    updated_at: backendToken.updated_at || null,
    live_since: backendToken.live_since || 
                backendToken.raw_data?.live_since ||
                backendToken.raw_data?.raw_data?.live_since ||
                backendToken.raw?.live_since ||
                backendToken.activity_info?.live_since ||
                null,
    last_reply: backendToken.last_reply ||
                backendToken.activity?.last_reply ||
                backendToken.pool_info?.last_reply ||
                backendToken.raw_data?.last_reply ||
                backendToken.raw_data?.raw_data?.last_reply ||
                backendToken.raw?.last_reply ||
                null,
    last_trade_timestamp: backendToken.last_trade_timestamp ||
                         backendToken.activity?.last_trade_timestamp ||
                         backendToken.trading_info?.last_trade_timestamp ||
                         backendToken.raw_data?.last_trade_timestamp ||
                         backendToken.raw?.last_trade_timestamp ||
                         null,
    
    // Market data
    mcap: parseFormattedNumber(backendToken.mcap || 
                              backendToken.market_data?.market_cap || 
                              backendToken.raw_data?.mcap || 
                              backendToken.raw?.mcap || 0),
    ath: parseFormattedNumber(backendToken.ath || 
                             backendToken.market_data?.ath || 0),
    total_supply: parseFormattedNumber(backendToken.total_supply || 0),
    liquidity: parseFormattedNumber(backendToken.liquidity || 0),
    progress: parseFloat(backendToken.progress) || 
              backendToken.market_data?.progress_percentage || 0,
    
    // Creator information
    creator: backendToken.creator || backendToken.creator_info?.creator || '',
    creator_holding_amount: parseFormattedNumber(backendToken.creator_holding_amount || 0),
    creator_holding_percentage: parseFormattedNumber(backendToken.creator_holding_percentage || 0),
    creator_is_top_holder: backendToken.creator_is_top_holder || false,
    created_coin_count: backendToken.created_coin_count || 
                       backendToken.creator_info?.created_coin_count || 
                       backendToken.creator_info?.created_count || 
                       backendToken.created_count || 0,
    creator_balance_sol: parseFormattedNumber(backendToken.creator_balance_sol || 
                                            backendToken.creator_info?.creator_balance_sol || 0),
    creator_balance_usd: parseFormattedNumber(backendToken.creator_balance_usd || 
                                            backendToken.creator_info?.creator_balance_usd || 0),
    
    // Pool information
    pump_swap_pool: backendToken.pump_swap_pool || null,
    raydium_pool: backendToken.raydium_pool || backendToken.pool_info?.raydium_pool || null,
    virtual_sol_reserves: parseFormattedNumber(backendToken.virtual_sol_reserves ||
                                             backendToken.pool_info?.virtual_sol_reserves ||
                                             backendToken.trading_info?.virtual_sol_reserves ||
                                             backendToken.raw_data?.virtual_sol_reserves ||
                                             backendToken.raw?.virtual_sol_reserves || 0),
    real_sol_reserves: parseFormattedNumber(backendToken.real_sol_reserves ||
                                          backendToken.pool_info?.real_sol_reserves ||
                                          backendToken.trading_info?.real_sol_reserves ||
                                          backendToken.raw_data?.real_sol_reserves ||
                                          backendToken.raw?.real_sol_reserves || 0),
    virtual_token_reserves: parseFormattedNumber(backendToken.virtual_token_reserves || 0),
    real_token_reserves: parseFormattedNumber(backendToken.real_token_reserves || 0),
    complete: backendToken.complete || backendToken.pool_info?.complete || false,
    
    // Social links
    twitter: backendToken.twitter ||
             backendToken.social_links?.twitter ||
             backendToken.twitter_url ||
             backendToken.raw_data?.social_links?.twitter ||
             null,
    telegram: backendToken.telegram ||
              backendToken.social_links?.telegram ||
              backendToken.tg ||
              backendToken.raw_data?.social_links?.telegram ||
              null,
    website: backendToken.website ||
             backendToken.social_links?.website ||
             backendToken.url ||
             backendToken.raw_data?.social_links?.website ||
             null,
    
    // Status flags
    is_active: backendToken.is_active || backendToken.status_flags?.is_active || false,
    is_live: backendToken.is_live ||
             backendToken.status_flags?.is_currently_live ||
             backendToken.raw_data?.is_currently_live ||
             backendToken.raw_data?.raw_data?.is_currently_live ||
             backendToken.raw?.is_currently_live ||
             false,
    nsfw: backendToken.nsfw || 
          backendToken.status_flags?.nsfw || 
          backendToken.raw_data?.nsfw || 
          false,
    
    // Activity metrics
    viewers: parseFormattedNumber(backendToken.viewers || 
                                backendToken.activity_info?.viewers || 0),
    reply_count: parseFormattedNumber(backendToken.reply_count ||
                                    backendToken.activity?.reply_count ||
                                    backendToken.pool_info?.reply_count ||
                                    backendToken.raw_data?.reply_count ||
                                    backendToken.raw_data?.raw_data?.reply_count ||
                                    backendToken.raw?.reply_count || 0),
    
    // Trading metrics - 5 minute intervals
    price_change_5m: parsePriceChange(backendToken.price_change_5m ||
                                    backendToken.price_changes?.['5m'] || 
                                    backendToken.trading_info?.price_change_5m || 0, 
                                    `${debugPrefix} price_change_5m`),
    traders_5m: parseFormattedNumber(backendToken.traders_5m ||
                                   backendToken.traders?.['5m'] || 
                                   backendToken.trading_info?.traders_5m || 0, 
                                   `${debugPrefix} traders_5m`),
    volume_5m: parseFormattedNumber(backendToken.volume_5m ||
                                  backendToken.volume?.['5m'] || 
                                  backendToken.trading_info?.volume_5m || 0, 
                                  `${debugPrefix} volume_5m`),
    txns_5m: parseFormattedNumber(backendToken.txns_5m ||
                                backendToken.txns?.['5m'] || 
                                backendToken.trading_info?.txns_5m || 0, 
                                `${debugPrefix} txns_5m`),
    
    // Trading metrics - 1 hour intervals
    price_change_1h: parsePriceChange(backendToken.price_change_1h ||
                                    backendToken.price_changes?.['1h'] || 
                                    backendToken.trading_info?.price_change_1h || 0, 
                                    `${debugPrefix} price_change_1h`),
    traders_1h: parseFormattedNumber(backendToken.traders_1h ||
                                   backendToken.traders?.['1h'] || 
                                   backendToken.trading_info?.traders_1h || 0, 
                                   `${debugPrefix} traders_1h`),
    volume_1h: parseFormattedNumber(backendToken.volume_1h ||
                                  backendToken.volume?.['1h'] || 
                                  backendToken.trading_info?.volume_1h || 0, 
                                  `${debugPrefix} volume_1h`),
    txns_1h: parseFormattedNumber(backendToken.txns_1h ||
                                backendToken.txns?.['1h'] || 
                                backendToken.trading_info?.txns_1h || 0, 
                                `${debugPrefix} txns_1h`),
    
    // Trading metrics - 6 hour intervals
    price_change_6h: parsePriceChange(backendToken.price_change_6h ||
                                    backendToken.price_changes?.['6h'] || 
                                    backendToken.trading_info?.price_change_6h || 0, 
                                    `${debugPrefix} price_change_6h`),
    traders_6h: parseFormattedNumber(backendToken.traders_6h ||
                                   backendToken.traders?.['6h'] || 
                                   backendToken.trading_info?.traders_6h || 0, 
                                   `${debugPrefix} traders_6h`),
    volume_6h: parseFormattedNumber(backendToken.volume_6h ||
                                  backendToken.volume?.['6h'] || 
                                  backendToken.trading_info?.volume_6h || 0, 
                                  `${debugPrefix} volume_6h`),
    txns_6h: parseFormattedNumber(backendToken.txns_6h ||
                                backendToken.txns?.['6h'] || 
                                backendToken.trading_info?.txns_6h || 0, 
                                `${debugPrefix} txns_6h`),
    
    // Trading metrics - 24 hour intervals
    price_change_24h: parsePriceChange(backendToken.price_change_24h ||
                                     backendToken.price_changes?.['24h'] ||
                                     backendToken.trading_info?.price_change_24h ||
                                     backendToken.raw_data?.price_change_24h ||
                                     backendToken.raw?.price_change_24h || 0, 
                                     `${debugPrefix} price_change_24h`),
    traders_24h: parseFormattedNumber(backendToken.traders_24h ||
                                    backendToken.traders?.['24h'] ||
                                    backendToken.trading_info?.traders_24h ||
                                    backendToken.raw_data?.traders_24h ||
                                    backendToken.raw?.traders_24h || 0, 
                                    `${debugPrefix} traders_24h`),
    volume_24h: parseFormattedNumber(backendToken.volume_24h ||
                                   backendToken.volume?.['24h'] ||
                                   backendToken.trading_info?.volume_24h ||
                                   backendToken.raw_data?.volume_24h ||
                                   backendToken.raw?.volume_24h || 0, 
                                   `${debugPrefix} volume_24h`),
    txns_24h: parseFormattedNumber(backendToken.txns_24h ||
                                 backendToken.txns?.['24h'] ||
                                 backendToken.trading_info?.txns_24h ||
                                 backendToken.raw_data?.txns_24h ||
                                 backendToken.raw?.txns_24h || 0, 
                                 `${debugPrefix} txns_24h`),
    
    // Additional fields
    top_holders: backendToken.top_holders || null,
    
    // Raw data from external sources
    raw_data: backendToken,
    
    // Developer activity information
    dev_activity: backendToken.dev_activity || 
                  backendToken.activity?.dev_activity || 
                  backendToken.activity_info?.dev_activity || 
                  backendToken.raw_data?.dev_activity || 
                  null,
    
    // Candle data for charts
    candle_data: candle_data
  }

  return out
}

export const detectTokenChanges = (prev: any, current: any) => {
  const previousValues: any = {}
  let hasChanges = false

  const fieldsToTrack = [
    'mcap',
    'ath',
    'progress',
    'volume_5m',
    'volume_1h',
    'volume_6h',
    'volume_24h',
    'txns_5m',
    'txns_1h',
    'txns_6h',
    'txns_24h',
    'traders_5m',
    'traders_1h',
    'traders_6h',
    'traders_24h',
    'price_change_5m',
    'price_change_1h',
    'price_change_6h',
    'price_change_24h',
    'viewers',
    'reply_count',
    'is_live',
    'nsfw',
    'created_coin_count',
    'creator_balance_sol',
    'creator_balance_usd',
    'dev_activity',
    'candle_data'
  ]

  for (const field of fieldsToTrack) {
    const prevValue = prev[field]
    const currentValue = current[field]

    // special-case candle_data to compare only last N points (to avoid heavy comparisons)
    if (field === 'candle_data') {
      const MAX_COMPARE_POINTS = 50
      const prevSlice = Array.isArray(prevValue) ? prevValue.slice(-MAX_COMPARE_POINTS) : prevValue
      const curSlice = Array.isArray(currentValue) ? currentValue.slice(-MAX_COMPARE_POINTS) : currentValue
      const valuesAreEqual = JSON.stringify(prevSlice) === JSON.stringify(curSlice)
      if (!valuesAreEqual) {
        hasChanges = true
        previousValues[field] = prevSlice
      }
      continue
    }

    const valuesAreEqual = JSON.stringify(prevValue) === JSON.stringify(currentValue)
    if (!valuesAreEqual) {
      hasChanges = true
      previousValues[field] = prevValue
    }
  }

  return { hasChanges, previousValues }
}

export const mergeTokenWithChanges = (prev: any, incoming: any) => {
  // Helper: consider empty strings, null or undefined as "no value" so we don't overwrite
  const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

  const merged = { ...prev }
  
  // Simple flat merge - overwrite with incoming values if they're not empty
  for (const key of Object.keys(incoming)) {
    const incomingValue = incoming[key]
    // Special-case: don't completely overwrite the stored `raw_data` object
    // when the incoming payload is partial (common with Supabase UPDATE events).
    // Instead, shallow-merge only the keys present in incoming.raw_data that
    // are non-empty so we don't lose previously-captured fields like candle_data.
    if (key === 'raw_data' && incomingValue && typeof incomingValue === 'object') {
      merged.raw_data = merged.raw_data || {}
      for (const subKey of Object.keys(incomingValue)) {
        const subVal = (incomingValue as any)[subKey]
        if (!isEmpty(subVal)) {
          if (Array.isArray(subVal) && subVal.length > 0) {
            merged.raw_data[subKey] = subVal
          } else if (!Array.isArray(subVal)) {
            merged.raw_data[subKey] = subVal
          }
        }
      }
      continue
    }

    if (!isEmpty(incomingValue)) {
      // Special handling for arrays - prefer non-empty incoming arrays
      if (Array.isArray(incomingValue) && incomingValue.length > 0) {
        merged[key] = incomingValue
      } else if (!Array.isArray(incomingValue)) {
        merged[key] = incomingValue
      }
    }
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