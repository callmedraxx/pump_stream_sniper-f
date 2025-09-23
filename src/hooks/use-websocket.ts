"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { mergeTokenWithChanges, transformBackendToken } from './socket-helpers'


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
  timestamps: any
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

// use canonical transformer from socket-helpers for consistency


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

    // NEW: Handle individual token updates batch from backend
    if (msg?.event === 'token_updates_batch') {
      //console.log(`[WebSocketService] received token batch update: ${msg.data?.batch_size || 0} tokens`)
      
      if (msg.data?.updates && Array.isArray(msg.data.updates)) {
        // Process each individual token update
        msg.data.updates.forEach((tokenUpdate: any) => {
          const transformed = transformBackendToken(tokenUpdate)
          // Log the transformed (canonicalized) token for inspection
          try { console.log('[WebSocketService] token batch transformed:', transformed) } catch (e) {}
          const mint = transformed.token_info?.mint
          
          if (!mint) return
          
          const idx = this.tokens.findIndex(x => x.token_info?.mint === mint)
          
          // Token not in current list
          if (idx === -1) {
            // Add if it's live
            if (transformed.status_flags?.is_currently_live) {
              this.tokens = [transformed, ...this.tokens]
            }
            return
          }
          
          // Token exists - update it
          const existing = this.tokens[idx]
          
          // Remove if no longer live
          if (!transformed.status_flags?.is_currently_live) {
            this.tokens.splice(idx, 1)
            return
          }
          
          // Merge the update into existing token
          const merged = mergeTokenWithChanges(existing, transformed)
          this.tokens[idx] = merged
        })
        
        // Notify listeners of all changes at once
        this.listeners.forEach(callback => {
          try { 
            callback([...this.tokens]) 
          } catch (error) { 
            console.error('[WebSocketService] error calling listener:', error) 
          }
        })
      }
      return
    }

    // Handle initial full snapshot (tokens_update event)
    if (msg?.event === 'tokens_update' && msg?.data?.tokens && Array.isArray(msg.data.tokens)) {
      console.log(`[WebSocketService] received full snapshot: ${msg.data.tokens.length} tokens`)
      const transformed = msg.data.tokens.map(transformBackendToken)
      this.tokens = transformed

      // Notify all subscribers
      this.listeners.forEach(callback => {
        try {
          callback(transformed)
        } catch (error) {
          console.error('[WebSocketService] error calling listener:', error)
        }
      })
      return
    }

    // Legacy: Handle single token updates (keep for backward compatibility)
      const singleCandidate = msg?.data?.token ?? (Array.isArray(msg?.data?.tokens) && msg.data.tokens.length === 1 ? msg.data.tokens[0] : null)
      if (singleCandidate) {
        // Transform and debug-log the canonical token (avoid logging raw payload)
        const t = transformBackendToken(singleCandidate)
  try { console.log('[WebSocketService] single token transformed:', t) } catch (e) {}
      const mint = t.token_info?.mint
      const idx = this.tokens.findIndex(x => x.token_info?.mint === mint)

      // Not present in current list -> add if indicated live
      if (idx === -1) {
        if (t.status_flags?.is_currently_live) {
          this.tokens = [t, ...this.tokens]
          this.listeners.forEach(callback => {
            try { callback([...this.tokens]) } catch (error) { console.error('[WebSocketService] error calling listener:', error) }
          })
        }
        return
      }

      // Present in the list
      const existing = this.tokens[idx]

      // If update indicates it is no longer live -> remove
      if (!t.status_flags?.is_currently_live) {
        this.tokens.splice(idx, 1)
        this.listeners.forEach(callback => {
          try { callback([...this.tokens]) } catch (error) { console.error('[WebSocketService] error calling listener:', error) }
        })
        return
      }

      // Merge changed fields into existing token
      const merged = mergeTokenWithChanges(existing, t)
      this.tokens[idx] = merged

      // Notify listeners
      this.listeners.forEach(callback => {
        try { callback([...this.tokens]) } catch (error) { console.error('[WebSocketService] error calling listener:', error) }
      })
      return
    }

    // Handle any other bulk token updates (fallback) - merge per-token to preserve existing fields
    if (msg?.data?.tokens && Array.isArray(msg.data.tokens)) {
      const incoming = msg.data.tokens.map(transformBackendToken)

      // Debug: log summary of fallback bulk update and a small sample of incoming mints
      try {
        const sampleMints = incoming.slice(0, 5).map((t: any) => t?.token_info?.mint).filter(Boolean)
        console.log(`[WebSocketService] fallback bulk tokens update: ${incoming.length} tokens, sample mints:`, sampleMints)
      } catch (err) {
        console.debug('[WebSocketService] logging failed for fallback bulk tokens update')
      }

      // Merge into existing tokens array: update existing tokens, add new ones
      for (const token of incoming) {
        const mint = token?.token_info?.mint
        if (!mint) continue
        const idx = this.tokens.findIndex(x => x.token_info?.mint === mint)
        if (idx === -1) {
          // New token - push to front for visibility
          this.tokens = [token, ...this.tokens]
        } else {
          // Merge into existing
          const merged = mergeTokenWithChanges(this.tokens[idx], token)
          this.tokens[idx] = merged
        }
      }

      // Notify listeners with the updated list
      this.listeners.forEach(callback => {
        try {
          callback([...this.tokens])
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