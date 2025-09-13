import { LiveToken } from "@/types/token.types"
import { parseMarketCap } from "./format.utils"

/**
 * Compare two tokens for changes
 */
export const compareTokens = (token1: LiveToken, token2: LiveToken): boolean => {
  // Compare market data with number parsing for consistency
  const mcap1 = parseMarketCap(token1.market_data.usd_market_cap)
  const mcap2 = parseMarketCap(token2.market_data.usd_market_cap)
  if (Math.abs(mcap1 - mcap2) > 0.01) return true
  
  if (Math.abs((token1.market_data.progress_percentage || 0) - (token2.market_data.progress_percentage || 0)) > 0.01) return true
  
  const ath1 = parseMarketCap(token1.market_data.ath || '0')
  const ath2 = parseMarketCap(token2.market_data.ath || '0')
  if (Math.abs(ath1 - ath2) > 0.01) return true

  // Compare trading info with tolerance for floating point precision
  const timePeriods = ['5m', '1h', '6h', '24h'] as const
  for (const period of timePeriods) {
    const volumeKey = `volume_${period}` as keyof typeof token1.trading_info
    const txnsKey = `txns_${period}` as keyof typeof token1.trading_info
    const tradersKey = `traders_${period}` as keyof typeof token1.trading_info
    const priceChangeKey = `price_change_${period}` as keyof typeof token1.trading_info
    
    if (Math.abs((token1.trading_info[volumeKey] as number || 0) - (token2.trading_info[volumeKey] as number || 0)) > 0.01) return true
    if ((token1.trading_info[txnsKey] as number || 0) !== (token2.trading_info[txnsKey] as number || 0)) return true
    if ((token1.trading_info[tradersKey] as number || 0) !== (token2.trading_info[tradersKey] as number || 0)) return true
    if (Math.abs((token1.trading_info[priceChangeKey] as number || 0) - (token2.trading_info[priceChangeKey] as number || 0)) > 0.01) return true
  }

  // Compare activity info
  if ((token1.activity_info.viewers || 0) !== (token2.activity_info.viewers || 0)) return true

  // Compare age - check if the formatted time has changed
  if ((token1.creator_info.created_formatted || '') !== (token2.creator_info.created_formatted || '')) return true
  
  // Compare last trade timestamp for real-time updates
  if ((token1.trading_info.last_trade_timestamp || '') !== (token2.trading_info.last_trade_timestamp || '')) return true

  // Compare status flags
  if (token1.status_flags.is_currently_live !== token2.status_flags.is_currently_live) return true
  if (token1.status_flags.nsfw !== token2.status_flags.nsfw) return true

  return false
}

/**
 * Update only changed tokens while preserving sorted order
 */
export const updateChangedTokens = (existingTokens: LiveToken[], newTokens: LiveToken[]): LiveToken[] => {
  const existingMap = new Map(existingTokens.map(token => [token.token_info.mint, token]))
  const newTokensMap = new Map(newTokens.map(token => [token.token_info.mint, token]))
  const updatedTokens: LiveToken[] = []
  let changedCount = 0
  let newCount = 0

  // Process all tokens from new data (this ensures we don't miss any tokens)
  for (const newToken of newTokens) {
    const mint = newToken.token_info.mint
    const existingToken = existingMap.get(mint)

    if (existingToken) {
      // Token exists, check for changes
      const hasChanged = compareTokens(existingToken, newToken)

      if (hasChanged) {
        // Store previous values for animation
        const previousValues = {
          market_cap: existingToken.market_data.market_cap,
          usd_market_cap: existingToken.market_data.usd_market_cap,
          progress_percentage: existingToken.market_data.progress_percentage,
          ath: existingToken.market_data.ath || undefined,
          volume_5m: existingToken.trading_info.volume_5m,
          volume_1h: existingToken.trading_info.volume_1h,
          volume_6h: existingToken.trading_info.volume_6h,
          volume_24h: existingToken.trading_info.volume_24h,
          txns_5m: existingToken.trading_info.txns_5m,
          txns_1h: existingToken.trading_info.txns_1h,
          txns_6h: existingToken.trading_info.txns_6h,
          txns_24h: existingToken.trading_info.txns_24h,
          traders_5m: existingToken.trading_info.traders_5m,
          traders_1h: existingToken.trading_info.traders_1h,
          traders_6h: existingToken.trading_info.traders_6h,
          traders_24h: existingToken.trading_info.traders_24h,
          price_change_5m: existingToken.trading_info.price_change_5m,
          price_change_1h: existingToken.trading_info.price_change_1h,
          price_change_6h: existingToken.trading_info.price_change_6h,
          price_change_24h: existingToken.trading_info.price_change_24h,
          viewers: existingToken.activity_info.viewers,
          created_formatted: existingToken.creator_info.created_formatted,
        }

        // Create updated token with change tracking
        updatedTokens.push({
          ...newToken,
          _isUpdated: true,
          _updatedAt: Date.now(),
          _previousValues: previousValues
        })
        changedCount++
      } else {
        // No changes, but clear the update flag if it was set before
        updatedTokens.push({
          ...existingToken,
          _isUpdated: false
        })
      }
    } else {
      // Completely new token
      updatedTokens.push({
        ...newToken,
        _isUpdated: true,
        _updatedAt: Date.now()
      })
      newCount++
    }
  }

  console.log(`🔄 Token update: ${changedCount} changed, ${newCount} new, ${updatedTokens.length} total (from ${newTokens.length} incoming)`)
  
  return updatedTokens
}