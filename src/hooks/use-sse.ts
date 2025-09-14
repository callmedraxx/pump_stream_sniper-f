"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { tokenStorage } from "@/lib/token-storage"
import type { TokenData } from "@/lib/token-storage"
import { transformBackendToken, mergeTokenWithChanges } from './socket-helpers'

export function useSSE(options: any = {}) {
  const {
    backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    onTokenUpdate,
    onError,
    onConnectionChange
  } = options

  const [tokens, setTokens] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'reconnecting'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [error, setError] = useState<Error | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<any>(null)
  const reconnectAttemptsRef = useRef(0)

  const processEvent = useCallback((raw: string) => {
    try {
      const processed = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+/g, ' ').trim()
      const jsonData = JSON.parse(processed)

      if (jsonData.event === 'tokens_update' && jsonData.data?.tokens) {
        const transformed = jsonData.data.tokens.map(transformBackendToken)

        setTokens(prev => {
          const prevMap = new Map(prev.map((t: any) => [t.token_info.mint, t]))
          const updated = transformed.map((inc: any) => {
            const prevToken = prevMap.get(inc.token_info.mint)
            if (prevToken) return mergeTokenWithChanges(prevToken, inc)
            return { ...inc, _isUpdated: true, _updatedAt: Date.now() }
          })

          const tokenData: TokenData = {
            event: 'live_tokens_update',
            timestamp: jsonData.timestamp || new Date().toISOString(),
            token_count: updated.length,
            data: updated,
            last_sse_update: new Date().toISOString(),
            backend_total_count: updated.length
          }
          tokenStorage.setTokens(tokenData)

          if (onTokenUpdate) onTokenUpdate(updated)
          return updated
        })

        setLastUpdate(new Date(jsonData.timestamp || new Date().toISOString()).toLocaleString())
        setConnectionStatus('connected')
        setError(null)
      } else if (jsonData.event === 'token_update' && jsonData.data?.token) {
        const transformed = transformBackendToken(jsonData.data.token)
        setTokens(prev => {
          const idx = prev.findIndex((t: any) => t.token_info.mint === transformed.token_info.mint)
          if (idx >= 0) {
            const prevToken = prev[idx]
            const merged = mergeTokenWithChanges(prevToken, transformed)
            const copy = [...prev]
            copy[idx] = merged
            return copy
          }
          return [ { ...transformed, _isUpdated: true, _updatedAt: Date.now() }, ...prev ]
        })

        const tokenData: TokenData = {
          event: 'live_token_update',
          timestamp: jsonData.timestamp || new Date().toISOString(),
          token_count: 1,
          data: [transformed],
          last_sse_update: new Date().toISOString(),
          backend_total_count: null
        }
        tokenStorage.setTokens(tokenData)

        setLastUpdate(new Date(tokenData.timestamp).toLocaleString())
        setConnectionStatus('connected')
        setError(null)
      }
    } catch (e) {
      console.error('SSE parse/process error', e)
      setError(e as Error)
      if (onError) onError(e as Error)
    }
  }, [onTokenUpdate, onError])

  const connect = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) return
    if (eventSourceRef.current) eventSourceRef.current.close()

    setConnectionStatus('connecting')
    setError(null)

    const sseUrl = `${backendUrl}/tokens/stream`
    try {
      const es = new EventSource(sseUrl)
      eventSourceRef.current = es
      es.onopen = () => { setIsConnected(true); setConnectionStatus('connected'); reconnectAttemptsRef.current = 0; if (onConnectionChange) onConnectionChange(true) }
      es.onmessage = (ev) => processEvent(ev.data)
      es.onerror = (ev) => {
        setIsConnected(false); setConnectionStatus('error'); setError(new Error('SSE failed'))
        if (onError) onError(new Error('SSE failed'))
        if (onConnectionChange) onConnectionChange(false)
        const maxRetries = 5
        if (reconnectAttemptsRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => { reconnectAttemptsRef.current++; setConnectionStatus('reconnecting'); connect() }, delay)
        }
      }
    } catch (e) {
      setError(e as Error)
      setConnectionStatus('error')
      if (onError) onError(e as Error)
    }
  }, [backendUrl, onError, onConnectionChange, processEvent])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null }
    setIsConnected(false)
    setConnectionStatus('connecting')
  }, [])

  useEffect(() => {
    const existing = tokenStorage.getTokens()
    if (existing && existing.data.length) {
      setTokens(existing.data as any[])
      setLastUpdate(new Date(existing.timestamp).toLocaleString())
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { tokens, isConnected, connectionStatus, lastUpdate, error, reconnect: connect }
}
