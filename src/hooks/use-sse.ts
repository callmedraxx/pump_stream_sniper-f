"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { tokenStorage } from "@/lib/token-storage"
import type { TokenData } from "@/lib/token-storage"

interface LiveToken {
  token_info: {
    mint: string
    name: string
    symbol: string
    description?: string | null
    image_uri?: string | null
    metadata_uri?: string | null
    video_uri?: string | null
  }
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
    sniping?: boolean | null
    last_updated?: string | null
    viewers: number
  }
  raw_data: Record<string, unknown>
  _isUpdated?: boolean
  _updatedAt?: number
  _previousValues?: {
    market_cap?: string
    usd_market_cap?: string
    progress_percentage?: number
    ath?: string
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
    reply_count?: number
  }
}

interface UseSSEOptions {
  backendUrl?: string
  onTokenUpdate?: (tokens: LiveToken[]) => void
  onError?: (error: Error) => void
  onConnectionChange?: (connected: boolean) => void
}

interface UseSSEReturn {
  tokens: LiveToken[]
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'error' | 'reconnecting'
  lastUpdate: string
  error: Error | null
  reconnect: () => void
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    onTokenUpdate,
    onError,
    onConnectionChange
  } = options

  const [tokens, setTokens] = useState<LiveToken[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'reconnecting'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [error, setError] = useState<Error | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Helper function to parse formatted numbers (e.g., "6.9K" -> 6900)
  const parseFormattedNumber = useCallback((value: any, debugContext?: string): number => {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined || value === '') return 0
    
    // If it's already a number, return it
    if (typeof value === 'number') {
      // Check for NaN or invalid numbers
      return isNaN(value) ? 0 : value
    }
    
    if (typeof value === 'string') {
      // Handle empty or whitespace strings
      const trimmed = value.trim()
      if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return 0
      
      const cleaned = trimmed.replace(/[$,]/g, '')
      
      // Enhanced regex to handle more cases
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
      
      // Try direct parsing as fallback
      const directParse = parseFloat(cleaned)
      return isNaN(directParse) ? 0 : directParse
    }
    
    // Log unexpected data types for debugging
    if (debugContext) {
      console.warn(`parseFormattedNumber: Unexpected value type for ${debugContext}:`, typeof value, value)
    }
    
    return 0
  }, [])

  // Helper to normalize backend price change values into fraction form
  const parsePriceChange = useCallback((value: any, debugContext?: string): number => {
    const num = parseFormattedNumber(value, debugContext)
    if (num === 0) return 0

    // If backend provides percent like 25.8, convert to fraction 0.258.
    // If backend already provides fraction (0.258) leave as-is.
    // Heuristic: treat absolute values greater than 1.5 as percent values.
    if (Math.abs(num) > 1.5) {
      return num / 100
    }
    return num
  }, [parseFormattedNumber])

  // Transform backend token format to LiveToken format
  const transformBackendToken = useCallback((backendToken: any): LiveToken => {
    // Handle different possible data structures from backend with debug logging
    const tokenMint = backendToken.mint_address || backendToken.token_info?.mint || backendToken.mint || 'unknown'
    const debugPrefix = `Token ${tokenMint.slice(0,8)}`
    
    const volume24h = backendToken.volume?.['24h'] || backendToken.trading_info?.volume_24h || 0
    const txns24h = backendToken.txns?.['24h'] || backendToken.trading_info?.txns_24h || 0
    const traders24h = backendToken.traders?.['24h'] || backendToken.trading_info?.traders_24h || 0
    const priceChange24h = backendToken.price_changes?.['24h'] || backendToken.trading_info?.price_change_24h || 0

    return {
      token_info: {
        mint: backendToken.mint_address || backendToken.token_info?.mint || backendToken.mint || '',
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
        created_formatted: backendToken.age || backendToken.creator_info?.created_formatted || ''
      },
      social_links: {
        twitter: backendToken.social_links?.twitter || null,
        website: backendToken.social_links?.website || null,
        telegram: backendToken.social_links?.telegram || null
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
        price_change_6h: parsePriceChange(backendToken.price_changes?.['6h'] || backendToken.trading_info?.price_change_6h || 0, `${debugPrefix} price_change_6h`)
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
        created_timestamp: backendToken.timestamps?.created_at ? new Date(backendToken.timestamps.created_at).getTime() / 1000 : 
                          backendToken.activity_info?.created_timestamp || null,
        created_formatted: backendToken.age || backendToken.activity_info?.created_formatted || '',
        nsfw: backendToken.nsfw || backendToken.activity_info?.nsfw || false,
        show_name: backendToken.activity_info?.show_name ?? true,
        creator: backendToken.creator || backendToken.activity_info?.creator || '',
        dev_buy: backendToken.holders?.creator_holding_percentage || backendToken.activity_info?.dev_buy || null,
        dev_sell: backendToken.activity_info?.dev_sell || null,
        sniping: backendToken.holders?.creator_is_top_holder || backendToken.activity_info?.sniping || null,
        last_updated: backendToken.timestamps?.updated_at || backendToken.activity_info?.last_updated || null,
        viewers: parseFormattedNumber(backendToken.viewers || backendToken.activity_info?.viewers || 0)
      },
      raw_data: backendToken
    }
  }, [parseFormattedNumber, parsePriceChange])

  // Enhanced function to deeply compare two tokens and detect specific field changes
  const detectTokenChanges = useCallback((prev: LiveToken, current: LiveToken): { hasChanges: boolean; previousValues: any } => {
    const previousValues: any = {}
    let hasChanges = false

    // Define the fields we want to track for changes and animations
    const fieldsToTrack = [
      // Market data
      { path: ['market_data', 'market_cap'], key: 'market_cap' },
      { path: ['market_data', 'usd_market_cap'], key: 'usd_market_cap' },
      { path: ['market_data', 'progress_percentage'], key: 'progress_percentage' },
      { path: ['market_data', 'ath'], key: 'ath' },
      
      // Trading info - volumes
      { path: ['trading_info', 'volume_5m'], key: 'volume_5m' },
      { path: ['trading_info', 'volume_1h'], key: 'volume_1h' },
      { path: ['trading_info', 'volume_6h'], key: 'volume_6h' },
      { path: ['trading_info', 'volume_24h'], key: 'volume_24h' },
      
      // Trading info - transactions
      { path: ['trading_info', 'txns_5m'], key: 'txns_5m' },
      { path: ['trading_info', 'txns_1h'], key: 'txns_1h' },
      { path: ['trading_info', 'txns_6h'], key: 'txns_6h' },
      { path: ['trading_info', 'txns_24h'], key: 'txns_24h' },
      
      // Trading info - traders
      { path: ['trading_info', 'traders_5m'], key: 'traders_5m' },
      { path: ['trading_info', 'traders_1h'], key: 'traders_1h' },
      { path: ['trading_info', 'traders_6h'], key: 'traders_6h' },
      { path: ['trading_info', 'traders_24h'], key: 'traders_24h' },
      
      // Trading info - price changes
      { path: ['trading_info', 'price_change_5m'], key: 'price_change_5m' },
      { path: ['trading_info', 'price_change_1h'], key: 'price_change_1h' },
      { path: ['trading_info', 'price_change_6h'], key: 'price_change_6h' },
      { path: ['trading_info', 'price_change_24h'], key: 'price_change_24h' },
      
      // Activity info
      { path: ['activity_info', 'viewers'], key: 'viewers' },
      
      // Pool info
      { path: ['pool_info', 'reply_count'], key: 'reply_count' },
      
      // Status flags
      { path: ['status_flags', 'is_currently_live'], key: 'is_currently_live' },
      { path: ['status_flags', 'nsfw'], key: 'nsfw' }
    ]

    // Helper to get nested value
    const getNestedValue = (obj: any, path: string[]): any => {
      return path.reduce((current, key) => current?.[key], obj)
    }

    // Check each field for changes
    for (const field of fieldsToTrack) {
      const prevValue = getNestedValue(prev, field.path)
      const currentValue = getNestedValue(current, field.path)
      
      // Compare values (handle both primitive and object types)
      const valuesAreEqual = JSON.stringify(prevValue) === JSON.stringify(currentValue)
      
      if (!valuesAreEqual) {
        hasChanges = true
        previousValues[field.key] = prevValue
        
        // Log the specific change for debugging
        console.log(`Field change detected in ${prev.token_info.symbol}: ${field.key} changed from`, prevValue, 'to', currentValue)
      }
    }

    return { hasChanges, previousValues }
  }, [])

  // Enhanced token merging with proper field-level change detection
  const mergeTokenWithChanges = useCallback((prev: LiveToken, incoming: LiveToken): LiveToken => {
    // First, do a deep merge of all properties
    const merged: LiveToken = {
      ...prev,
      ...incoming,
      token_info: { ...prev.token_info, ...incoming.token_info },
      market_data: { ...prev.market_data, ...incoming.market_data },
      creator_info: { ...prev.creator_info, ...incoming.creator_info },
      social_links: { ...prev.social_links, ...incoming.social_links },
      status_flags: { ...prev.status_flags, ...incoming.status_flags },
      trading_info: { ...prev.trading_info, ...incoming.trading_info },
      pool_info: { ...prev.pool_info, ...incoming.pool_info },
      activity_info: { ...prev.activity_info, ...incoming.activity_info },
      raw_data: { ...prev.raw_data, ...incoming.raw_data }
    }

    // Detect changes using the enhanced comparison
    const { hasChanges, previousValues } = detectTokenChanges(prev, merged)

    if (hasChanges) {
      console.log(`Changes detected for ${merged.token_info.symbol}:`, Object.keys(previousValues))
      
      return {
        ...merged,
        _isUpdated: true,
        _updatedAt: Date.now(),
        _previousValues: {
          ...prev._previousValues, // Preserve existing previous values
          ...previousValues // Add new previous values for changed fields
        }
      }
    }

    // No changes detected - preserve existing metadata
    return {
      ...merged,
      _isUpdated: false,
      _previousValues: prev._previousValues
    }
  }, [detectTokenChanges])

  // Process SSE events
  const processEvent = useCallback((eventData: string) => {
    try {
      console.log('Processing SSE data...')

      // Clean up the JSON data
      const processedData = eventData
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      const jsonData = JSON.parse(processedData)
      console.log('SSE event received:', jsonData.event)

      // Handle backend SSE format
      if (jsonData.event === 'tokens_update' && jsonData.data?.tokens) {
        const receivedCount = jsonData.data.tokens.length
        console.log(`Processing ${receivedCount} tokens from SSE`)

        if (receivedCount === 0) {
          console.log('No tokens in SSE data')
          return
        }

        const transformedTokens: LiveToken[] = jsonData.data.tokens.map(transformBackendToken)
        console.log(`Transformed ${transformedTokens.length} tokens`)

        // Enhanced merging with proper change detection
        setTokens(prevTokens => {
          const prevTokenMap = new Map(prevTokens.map(t => [t.token_info.mint, t]))
          let changedTokenCount = 0

          const updatedTokens = transformedTokens.map(incoming => {
            const prev = prevTokenMap.get(incoming.token_info.mint)

            if (prev) {
              // Use enhanced merge function
              const merged = mergeTokenWithChanges(prev, incoming)
              if (merged._isUpdated) {
                changedTokenCount++
              }
              return merged
            }

            // New token entirely
            return {
              ...incoming,
              _isUpdated: true,
              _updatedAt: Date.now()
            }
          })

          console.log(`Token update: ${changedTokenCount} changed tokens, ${transformedTokens.length - prevTokens.length} new tokens, total: ${updatedTokens.length}`)

          // Update token storage with the new data
          const tokenData: TokenData = {
            event: 'live_tokens_update',
            timestamp: jsonData.timestamp || new Date().toISOString(),
            token_count: updatedTokens.length,
            data: updatedTokens,
            last_sse_update: new Date().toISOString(),
            backend_total_count: updatedTokens.length
          }
          tokenStorage.setTokens(tokenData)

          return updatedTokens
        })

        console.log(`Replaced token list: ${transformedTokens.length} tokens from backend`)
        
        setLastUpdate(new Date(jsonData.timestamp || new Date().toISOString()).toLocaleString())
        setConnectionStatus('connected')
        setError(null)

        // Call optional callback
        if (onTokenUpdate) {
          onTokenUpdate(transformedTokens)
        }

        console.log('SSE tokens updated successfully')
      } else if (jsonData.event === 'token_update' && jsonData.data?.token) {
        console.log('Processing individual token update from SSE')

        const transformedToken = transformBackendToken(jsonData.data.token)
        console.log(`Updated token: ${transformedToken.token_info.symbol} (${transformedToken.token_info.mint})`)

        // Enhanced individual token update
        setTokens(prevTokens => {
          const existingIndex = prevTokens.findIndex(t => t.token_info.mint === transformedToken.token_info.mint)

          if (existingIndex >= 0) {
            const prev = prevTokens[existingIndex]
            const merged = mergeTokenWithChanges(prev, transformedToken)

            const updatedTokens = [...prevTokens]
            updatedTokens[existingIndex] = merged

            console.log(`Updated existing token at index ${existingIndex} (changed=${merged._isUpdated})`)
            return updatedTokens
          } else {
            // Add new token with update flag
            const newToken = {
              ...transformedToken,
              _isUpdated: true,
              _updatedAt: Date.now()
            }
            const updatedTokens = [newToken, ...prevTokens]
            console.log('Added new token to the list')
            return updatedTokens
          }
        })

        // Update token storage with the individual update
        const tokenData: TokenData = {
          event: 'live_token_update',
          timestamp: jsonData.timestamp || new Date().toISOString(),
          token_count: 1,
          data: [transformedToken],
          last_sse_update: new Date().toISOString(),
          backend_total_count: null // Individual update
        }

        // Update storage (this will merge with existing data)
        tokenStorage.setTokens(tokenData)

        setLastUpdate(new Date(tokenData.timestamp).toLocaleString())
        setConnectionStatus('connected')
        setError(null)

        console.log('Individual token updated successfully')
      } else {
        console.log('SSE event not handled:', jsonData.event)
      }
    } catch (error) {
      console.error('SSE processing error:', error)
      setError(error as Error)
      if (onError) {
        onError(error as Error)
      }
    }
  }, [transformBackendToken, mergeTokenWithChanges, onTokenUpdate, onError])

  // Keep a ref to the latest processEvent function
  const processEventRef = useRef(processEvent)
  processEventRef.current = processEvent

  // Connect to SSE
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      console.log('SSE already connected, skipping')
      return
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionStatus('connecting')
    setError(null)

    const sseUrl = `${backendUrl}/tokens/stream`
    console.log('Connecting to SSE:', sseUrl)

    try {
      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('SSE connection opened')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        if (onConnectionChange) {
          onConnectionChange(true)
        }
      }

      eventSource.onmessage = (event) => {
        console.log('SSE message received')
        processEventRef.current(event.data)
      }

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        setIsConnected(false)
        setConnectionStatus('error')
        setError(new Error('SSE connection failed'))
        if (onError) {
          onError(new Error('SSE connection failed'))
        }
        if (onConnectionChange) {
          onConnectionChange(false)
        }

        // Auto-reconnect with exponential backoff
        const maxRetries = 5
        if (reconnectAttemptsRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxRetries})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            setConnectionStatus('reconnecting')
            connect()
          }, delay)
        }
      }

    } catch (error) {
      console.error('Failed to create EventSource:', error)
      setError(error as Error)
      setConnectionStatus('error')
      if (onError) {
        onError(error as Error)
      }
    }
  }, [backendUrl, onError, onConnectionChange])

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Disconnecting SSE')
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('connecting')
  }, [])

  // Manual reconnect
  const reconnect = useCallback(() => {
    console.log('Manual reconnect triggered')
    reconnectAttemptsRef.current = 0
    // disconnect()
    setTimeout(() => connect(), 1000)
  }, [connect])

  // Load initial data from token storage on mount
  useEffect(() => {
    const existingData = tokenStorage.getTokens()
    if (existingData && existingData.data.length > 0) {
      console.log('Loading existing tokens from storage:', existingData.data.length)
      setTokens(existingData.data as LiveToken[])
      setLastUpdate(new Date(existingData.timestamp).toLocaleString())
    }
  }, [])

  // Clear _isUpdated flag after 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prevTokens =>
        prevTokens.map(token =>
          token._isUpdated && token._updatedAt && (Date.now() - token._updatedAt > 5000)
            ? { ...token, _isUpdated: false }
            : token
        )
      )
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()


  }, [connect])

  return {
    tokens,
    isConnected,
    connectionStatus,
    lastUpdate,
    error,
    reconnect
  }
}