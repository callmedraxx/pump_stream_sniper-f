export interface LiveToken {
  // Primary identifier
  id: number
  
  // Token identification
  mint_address: string
  name: string
  symbol: string
  description?: string | null
  
  // Media URLs
  image_url?: string | null
  stream_url?: string | null
  metadata_uri?: string | null
  video_uri?: string | null
  banner_uri?: string | null
  
  // Timestamps
  age: string
  created_at?: string
  updated_at?: string
  live_since?: string
  last_reply?: string | null
  last_trade_timestamp?: string | null
  
  // Market data
  mcap: number
  ath: number
  total_supply: number
  liquidity: number
  progress: number
  
  // Creator information
  creator: string
  creator_holding_amount: number
  creator_holding_percentage: number
  creator_is_top_holder: boolean
  created_coin_count?: number
  creator_balance_sol?: number
  creator_balance_usd?: number
  
  // Pool information
  pump_swap_pool?: string | null
  raydium_pool?: string | null
  virtual_sol_reserves: number
  real_sol_reserves: number
  virtual_token_reserves: number
  real_token_reserves: number
  complete: boolean
  
  // Social links
  twitter?: string | null
  telegram?: string | null
  website?: string | null
  
  // Status flags
  is_active: boolean
  is_live: boolean
  nsfw: boolean
  
  // Activity metrics
  viewers: number
  reply_count: number
  
  // Trading metrics - 5 minute intervals
  price_change_5m: number
  traders_5m: number
  volume_5m: number
  txns_5m: number
  
  // Trading metrics - 1 hour intervals
  price_change_1h: number
  traders_1h: number
  volume_1h: number
  txns_1h: number
  
  // Trading metrics - 6 hour intervals
  price_change_6h: number
  traders_6h: number
  volume_6h: number
  txns_6h: number
  
  // Trading metrics - 24 hour intervals
  price_change_24h: number
  traders_24h: number
  volume_24h: number
  txns_24h: number
  
  // Additional fields
  top_holders?: any | null
  
  // Raw data from external sources
  raw_data: Record<string, unknown>
  
  // Developer activity information
  dev_activity?: {
    type: string
    amountUSD: number
    amountSOL: number
    timestamp: string
    userAddress: string
    tx: string
  } | null
  
  // Candle data for charts
  candle_data?: Array<{
    timestamp: number
    open: string
    high: string
    low: string
    close: string
    volume: string
  }> | null
  
  // Internal tracking properties (optional - for UI state management)
  _isUpdated?: boolean
  _updatedAt?: number
  _previousValues?: {
    mcap?: number
    ath?: number
    progress?: number
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
}

export interface SortPreferences {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  dataTimePeriod: string
}