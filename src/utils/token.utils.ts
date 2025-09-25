import { LiveToken } from "@/types/token.types"
import { parseMarketCap } from "./format.utils"

/**
 * Compare two tokens for changes
 */
export const compareTokens = (token1: LiveToken, token2: LiveToken): boolean => {
  // Compare market data with number parsing for consistency
  const mcap1 = parseMarketCap(token1.mcap)
  const mcap2 = parseMarketCap(token2.mcap)
  if (Math.abs(mcap1 - mcap2) > 0.01) return true
  
  if (Math.abs((token1.progress || 0) - (token2.progress || 0)) > 0.01) return true
  
  const ath1 = parseMarketCap(token1.ath || 0)
  const ath2 = parseMarketCap(token2.ath || 0)
  if (Math.abs(ath1 - ath2) > 0.01) return true

  // Compare trading info with tolerance for floating point precision
  const timePeriods = ['5m', '1h', '6h', '24h'] as const
  for (const period of timePeriods) {
    const volumeKey = `volume_${period}`
    const txnsKey = `txns_${period}`
    const tradersKey = `traders_${period}`
    const priceChangeKey = `price_change_${period}`
    
    if (Math.abs(((token1 as any)[volumeKey] as number || 0) - ((token2 as any)[volumeKey] as number || 0)) > 0.01) return true
    if (((token1 as any)[txnsKey] as number || 0) !== ((token2 as any)[txnsKey] as number || 0)) return true
    if (((token1 as any)[tradersKey] as number || 0) !== ((token2 as any)[tradersKey] as number || 0)) return true
    if (Math.abs(((token1 as any)[priceChangeKey] as number || 0) - ((token2 as any)[priceChangeKey] as number || 0)) > 0.01) return true
  }

  // Compare activity info
  if ((token1.viewers || 0) !== (token2.viewers || 0)) return true

  // Compare age - check if the formatted time has changed
  if ((token1.created_at || token1.age || '') !== (token2.created_at || token2.age || '')) return true
  
  // Compare last trade timestamp for real-time updates
  if ((token1.last_trade_timestamp || '') !== (token2.last_trade_timestamp || '')) return true

  // Compare status flags
  if ((token1.is_live || false) !== (token2.is_live || false)) return true
  if ((token1.nsfw || false) !== (token2.nsfw || false)) return true

  return false
}

/**
 * Update only changed tokens while preserving sorted order
 */
export const updateChangedTokens = (existingTokens: LiveToken[], newTokens: LiveToken[]): LiveToken[] => {
  const existingMap = new Map(existingTokens.map(token => [token.mint_address, token]))
  const newTokensMap = new Map(newTokens.map(token => [token.mint_address, token]))
  const updatedTokens: LiveToken[] = []
  let changedCount = 0
  let newCount = 0

  // Process all tokens from new data (this ensures we don't miss any tokens)
  for (const newToken of newTokens) {
  const mint = newToken.mint_address
    const existingToken = existingMap.get(mint)

    if (existingToken) {
      // Token exists, check for changes
      const hasChanged = compareTokens(existingToken, newToken)

      if (hasChanged) {
        // Store previous values for animation
        const previousValues = {
          mcap: existingToken.mcap,
          usd_market_cap: existingToken.mcap,
          progress: existingToken.progress,
          ath: existingToken.ath || undefined,
          volume_5m: (existingToken as any).volume_5m,
          volume_1h: (existingToken as any).volume_1h,
          volume_6h: (existingToken as any).volume_6h,
          volume_24h: (existingToken as any).volume_24h,
          txns_5m: (existingToken as any).txns_5m,
          txns_1h: (existingToken as any).txns_1h,
          txns_6h: (existingToken as any).txns_6h,
          txns_24h: (existingToken as any).txns_24h,
          traders_5m: (existingToken as any).traders_5m,
          traders_1h: (existingToken as any).traders_1h,
          traders_6h: (existingToken as any).traders_6h,
          traders_24h: (existingToken as any).traders_24h,
          price_change_5m: (existingToken as any).price_change_5m,
          price_change_1h: (existingToken as any).price_change_1h,
          price_change_6h: (existingToken as any).price_change_6h,
          price_change_24h: (existingToken as any).price_change_24h,
          viewers: existingToken.viewers,
          created_at: existingToken.created_at || existingToken.age,
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