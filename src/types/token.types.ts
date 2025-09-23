import { $ZodNumberFormatDef } from "zod/v4/core"

export interface LiveToken {
  token_info: {
    mint: string
    name: string
    symbol: string
    description?: string | null
    image_uri?: string | null
    metadata_uri?: string | null
    video_uri?: string | null
  }
  // optional normalized candle data (array of numbers or array of objects)
  // keep as any to be resilient to backend shapes
  candle_data?: any
  market_data: {
    market_cap: string
    usd_market_cap: string
    progress_percentage: number
    last_trade_formatted?: string | null
    ath?: string | null
  }
  creator_info: {
    creator: string
    created_formatted?: string
    // Creator-level metadata
    created_count?: number | null
    created_coin_count?: number | null
    creator_balance_sol?: number | null
    creator_balance_usd?: number | null
  }
  social_links: {
    twitter?: string | null
    website?: string | null
    telegram?: string | null
  }
  status_flags: {
    is_currently_live: boolean
    nsfw: boolean
    show_name: boolean
    is_active?: boolean
  }
  trading_info: {
    virtual_sol_reserves: number
    real_sol_reserves: number
    total_sol: number
    progress_percentage: number
    last_trade_timestamp?: string | null
    last_trade_formatted?: string | null
    market_cap: string
    usd_market_cap: string
    volume_24h: number
    txns_24h: number
    traders_24h: number
    price_change_24h: number
    volume_5m: number
    volume_1h: number
    volume_6h: number
    txns_5m: number
    txns_1h: number
    txns_6h: number
    traders_5m: number
    traders_1h: number
    traders_6h: number
    price_change_5m: number
    price_change_1h: number
    price_change_6h: number
  }
  pool_info: {
    complete: boolean
    is_currently_live: boolean
    king_of_hill_timestamp?: string | null
    last_reply?: string | null
    reply_count: number
    raydium_pool?: string | null
    curve_threshold?: number | null
  }
  activity_info: {
    created_timestamp?: number | null
    created_formatted?: string
    nsfw: boolean
    show_name: boolean
    creator: string
    dev_buy?: number | null
    dev_sell?: number | null
    // Normalized dev activity blob (if backend provides a dev_activity object)
    dev_activity?: any | null
    // Creator balances mirrored here for UI convenience
    creator_balance_sol?: number | null
    creator_balance_usd?: number | null
    // Number of coins created by the creator
    created_coin_count?: number | null
    sniping?: boolean | null
    last_updated?: string | null
    viewers: number
  }
  raw_data: Record<string, unknown>
  // Internal tracking properties
  _isUpdated?: boolean
  _updatedAt?: number
  _previousValues?: {
    market_cap?: string
    usd_market_cap?: string
    progress_percentage?: number
    ath?: string,
    reply_count?: number
    volume_5m?: number
    volume_1h?: number
    volume_6h?: number
    volume_24h?: number
    txns_5m?: number
    txns_1h?: number
    txns_6h?: number
    txns_24h?: number
    traders_5m?: number
    traders_1h?: number
    traders_6h?: number
    traders_24h?: number
    price_change_5m?: number
    price_change_1h?: number
    price_change_6h?: number
    price_change_24h?: number
    viewers?: number
  }
  timestamps?: {
    created_at?: number | null
    updated_at?: number | null
  }
}

export interface SortPreferences {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  dataTimePeriod: string
}