"use client"

import { useEffect, useRef, useState, useCallback } from 'react'


interface LiveToken {
  token_info: any
  market_data: any
  creator_info: any
  social_links: any
  status_flags: any
  trading_info: any
  pool_info: any
  activity_info: any
  raw_data: any
  _isUpdated?: boolean
  _updatedAt?: number
  _previousValues?: Record<string, any>
}

function safeParseFormattedNumber(value: any) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  if (typeof value === 'string') {
    const t = value.trim().replace(/[,$]/g, '')
    const m = t.match(/^(-?\d+(?:\.\d+)?)([kKmMbB])?$/)
    if (m) {
      const n = parseFloat(m[1])
      const s = (m[2] || '').toLowerCase()
      if (s === 'k') return n * 1000
      if (s === 'm') return n * 1000000
      if (s === 'b') return n * 1000000000
      return n
    }
    const d = parseFloat(t)
    return isNaN(d) ? 0 : d
  }
  return 0
}

// Transform function
function transformBackendToken(backendToken: any): LiveToken {
  return {
    token_info: {
      mint: backendToken.mint_address || backendToken.token_info?.mint || backendToken.mint || '',
      name: backendToken.name || backendToken.token_info?.name || '',
      symbol: backendToken.symbol || backendToken.token_info?.symbol || '',
      description: backendToken.description || backendToken.token_info?.description || null,
      image_uri: backendToken.image_url || backendToken.token_info?.image_uri || null
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
      website: backendToken.social_links?.website || null
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
      volume_24h: safeParseFormattedNumber(backendToken.volume?.['24h'] || backendToken.trading_info?.volume_24h || 0),
      txns_24h: safeParseFormattedNumber(backendToken.txns?.['24h'] || backendToken.trading_info?.txns_24h || 0),
      traders_24h: safeParseFormattedNumber(backendToken.traders?.['24h'] || backendToken.trading_info?.traders_24h || 0),
      price_change_24h: safeParseFormattedNumber(backendToken.price_changes?.['24h'] || backendToken.trading_info?.price_change_24h || 0),
      volume_5m: safeParseFormattedNumber(backendToken.volume?.['5m'] || backendToken.trading_info?.volume_5m || 0),
      volume_1h: safeParseFormattedNumber(backendToken.volume?.['1h'] || backendToken.trading_info?.volume_1h || 0),
      volume_6h: safeParseFormattedNumber(backendToken.volume?.['6h'] || backendToken.trading_info?.volume_6h || 0),
      txns_5m: safeParseFormattedNumber(backendToken.txns?.['5m'] || backendToken.trading_info?.txns_5m || 0),
      txns_1h: safeParseFormattedNumber(backendToken.txns?.['1h'] || backendToken.trading_info?.txns_1h || 0),
      txns_6h: safeParseFormattedNumber(backendToken.txns?.['6h'] || backendToken.trading_info?.txns_6h || 0),
      traders_5m: safeParseFormattedNumber(backendToken.traders?.['5m'] || backendToken.trading_info?.traders_5m || 0),
      traders_1h: safeParseFormattedNumber(backendToken.traders?.['1h'] || backendToken.trading_info?.traders_1h || 0),
      traders_6h: safeParseFormattedNumber(backendToken.traders?.['6h'] || backendToken.trading_info?.traders_6h || 0),
      price_change_5m: safeParseFormattedNumber(backendToken.price_changes?.['5m'] || backendToken.trading_info?.price_change_5m || 0),
      price_change_1h: safeParseFormattedNumber(backendToken.price_changes?.['1h'] || backendToken.trading_info?.price_change_1h || 0),
      price_change_6h: safeParseFormattedNumber(backendToken.price_changes?.['6h'] || backendToken.trading_info?.price_change_6h || 0)
    },
    pool_info: {
      complete: backendToken.pool_info?.complete || false,
      is_currently_live: backendToken.is_live || backendToken.pool_info?.is_currently_live || false,
      king_of_hill_timestamp: backendToken.pool_info?.king_of_hill_timestamp || null,
      last_reply: backendToken.activity?.last_reply || backendToken.pool_info?.last_reply || null,
      reply_count: backendToken.activity?.reply_count || backendToken.viewers || backendToken.pool_info?.reply_count || 0,
      raydium_pool: backendToken.pool_info?.raydium_pool || null,
      curve_threshold: backendToken.pool_info?.curve_threshold || null
    },
    activity_info: {
      created_timestamp: backendToken.timestamps?.created_at ? new Date(backendToken.timestamps.created_at).getTime() / 1000 : backendToken.activity_info?.created_timestamp || null,
      created_formatted: backendToken.age || backendToken.activity_info?.created_formatted || '',
      nsfw: backendToken.nsfw || backendToken.activity_info?.nsfw || false,
      show_name: backendToken.activity_info?.show_name ?? true,
      creator: backendToken.creator || backendToken.activity_info?.creator || '',
      dev_buy: backendToken.holders?.creator_holding_percentage || backendToken.activity_info?.dev_buy || null,
      dev_sell: backendToken.activity_info?.dev_sell || null,
      sniping: backendToken.holders?.creator_is_top_holder || backendToken.activity_info?.sniping || null,
      last_updated: backendToken.timestamps?.updated_at || backendToken.activity_info?.last_updated || null,
      viewers: safeParseFormattedNumber(backendToken.viewers || backendToken.activity_info?.viewers || 0)
    },
    raw_data: backendToken
  }
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketServiceEvents {
  tokensUpdate: (tokens: LiveToken[]) => void
  connectionStateChange: (state: ConnectionState) => void
}

class WebSocketService {
  private static instance: WebSocketService | null = null
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private connectionTimeout: number | null = null
  
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectInterval = 2000
  private heartbeatInterval = 30000
  private connectionTimeoutMs = 10000
  
  private listeners: Set<(tokens: LiveToken[]) => void> = new Set()
  private stateListeners: Set<(state: ConnectionState) => void> = new Set()
  
  private tokens: LiveToken[] = []
  private backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'wss://pump.ekonai.com'

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  subscribe(callback: (tokens: LiveToken[]) => void): () => void {
    this.listeners.add(callback)
    console.log(`[WebSocketService] subscriber added, total: ${this.listeners.size}`)
    
    // Send current tokens immediately if available
    if (this.tokens.length > 0) {
      try {
        callback(this.tokens)
      } catch (error) {
        console.error('[WebSocketService] error calling subscriber:', error)
      }
    }
    
    // Connect if not already connected/connecting
    if (this.connectionState === 'disconnected' || this.connectionState === 'error') {
      this.connect()
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
      console.log(`[WebSocketService] subscriber removed, total: ${this.listeners.size}`)
      
      // Disconnect if no more listeners after a delay (to handle quick re-subscriptions)
      if (this.listeners.size === 0) {
        setTimeout(() => {
          if (this.listeners.size === 0) {
            console.log('[WebSocketService] no subscribers, disconnecting')
            this.disconnect()
          }
        }, 5000)
      }
    }
  }

  subscribeToState(callback: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(callback)
    callback(this.connectionState) // Send current state immediately
    
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state
      console.log(`[WebSocketService] connection state: ${state}`)
      this.stateListeners.forEach(callback => {
        try {
          callback(state)
        } catch (error) {
          console.error('[WebSocketService] error calling state listener:', error)
        }
      })
    }
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.clearTimers()
    this.setConnectionState('connecting')

    // Clean URL construction
    const cleanUrl = this.backendUrl.replace(/\/ws$/, '')
    const wsUrl = `${cleanUrl}/ws/tokens_stream`
    
    console.log('[WebSocketService] connecting to', wsUrl)

    try {
      this.ws = new WebSocket(wsUrl)
    } catch (error) {
      console.error('[WebSocketService] WebSocket creation failed:', error)
      this.setConnectionState('error')
      this.scheduleReconnect()
      return
    }

    // Connection timeout
    this.connectionTimeout = window.setTimeout(() => {
      if (this.ws?.readyState === WebSocket.CONNECTING) {
        console.error('[WebSocketService] connection timeout')
        this.ws.close()
        this.setConnectionState('error')
        this.scheduleReconnect()
      }
    }, this.connectionTimeoutMs)

    this.ws.onopen = () => {
      console.log('[WebSocketService] connected')
      this.setConnectionState('connected')
      this.reconnectAttempts = 0

      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout)
        this.connectionTimeout = null
      }

      this.startHeartbeat()
      
      // Send initial ping
      this.sendMessage({ event: 'ping', timestamp: Date.now() })
    }

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data)
    }

    this.ws.onclose = (event) => {
      console.log('[WebSocketService] connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })

      this.clearTimers()
      this.ws = null
      
      if (event.code === 1006) {
        console.warn('[WebSocketService] abnormal closure (1006)')
      }

      // Only reconnect if we have listeners
      if (this.listeners.size > 0) {
        this.setConnectionState('disconnected')
        this.scheduleReconnect()
      } else {
        this.setConnectionState('disconnected')
      }
    }

    this.ws.onerror = (error) => {
      console.error('[WebSocketService] WebSocket error:', error)
      this.setConnectionState('error')
    }
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data)
      
      // Handle heartbeat/pong
      if (msg?.event === 'heartbeat') {
        this.sendMessage({ event: 'pong', timestamp: Date.now() })
        return
      }

      if (msg?.event === 'pong') {
        console.debug('[WebSocketService] pong received')
        return
      }

      // Handle token updates
      if (msg?.data?.tokens && Array.isArray(msg.data.tokens)) {
        const transformed = msg.data.tokens.map(transformBackendToken)
        this.tokens = transformed

        // Update token storage
        // const tokenData: TokenData = {
        //   event: msg.event || 'live_tokens_update',
        //   timestamp: msg.timestamp || new Date().toISOString(),
        //   token_count: transformed.length,
        //   data: transformed,
        //   last_sse_update: new Date().toISOString(),
        //   backend_total_count: transformed.length
        // }

        // try {
        //   tokenStorage.setTokens(tokenData)
        // } catch (error) {
        //   console.error('[WebSocketService] error saving to storage:', error)
        // }

        // Notify all subscribers
        this.listeners.forEach(callback => {
          try {
            callback(transformed)
          } catch (error) {
            console.error('[WebSocketService] error calling listener:', error)
          }
        })
      }

    } catch (error) {
      console.error('[WebSocketService] message parse error:', error)
    }
  }

  private sendMessage(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg))
      } catch (error) {
        console.error('[WebSocketService] send failed:', error)
      }
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    
    this.heartbeatTimer = window.setInterval(() => {
      this.sendMessage({ event: 'ping', timestamp: Date.now() })
    }, this.heartbeatInterval)
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketService] max reconnect attempts reached')
      this.setConnectionState('error')
      return
    }

    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000)
    console.log(`[WebSocketService] reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimer = window.setTimeout(() => {
      if (this.listeners.size > 0) {
        this.reconnectAttempts++
        this.connect()
      }
    }, delay)
  }

  private disconnect() {
    console.log('[WebSocketService] disconnecting')
    this.clearTimers()

    if (this.ws) {
      // Remove event listeners to prevent unwanted callbacks
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      
      try {
        this.ws.close(1000, 'Service disconnecting')
      } catch (error) {
        console.debug('[WebSocketService] close error:', error)
      }
      this.ws = null
    }

    this.setConnectionState('disconnected')
    this.reconnectAttempts = 0
  }

  // Public methods for manual control
  forceReconnect() {
    console.log('[WebSocketService] force reconnect requested')
    this.reconnectAttempts = 0
    this.disconnect()
    if (this.listeners.size > 0) {
      setTimeout(() => this.connect(), 100)
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getTokens(): LiveToken[] {
    return [...this.tokens]
  }
}

// React Hook
export function useWebsocket(options: {
  onTokenUpdate?: (tokens: LiveToken[]) => void
} = {}) {
  const [tokens, setTokens] = useState<LiveToken[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const callbackRef = useRef(options.onTokenUpdate)
  callbackRef.current = options.onTokenUpdate

  useEffect(() => {
    const service = WebSocketService.getInstance()
    
    // Subscribe to tokens
    const unsubscribeTokens = service.subscribe((newTokens) => {
      setTokens(newTokens)
      callbackRef.current?.(newTokens)
    })
    
    // Subscribe to connection state
    const unsubscribeState = service.subscribeToState((state) => {
      setConnectionState(state)
    })

    // Get initial data
    const initialTokens = service.getTokens()
    if (initialTokens.length > 0) {
      setTokens(initialTokens)
    }

    return () => {
      unsubscribeTokens()
      unsubscribeState()
    }
  }, [])

  const reconnect = useCallback(() => {
    WebSocketService.getInstance().forceReconnect()
  }, [])

  return {
    tokens,
    isConnected: connectionState === 'connected',
    connectionState,
    reconnectAttempts,
    connect: reconnect,
    disconnect: () => {}, // Not implemented for singleton
  }
}