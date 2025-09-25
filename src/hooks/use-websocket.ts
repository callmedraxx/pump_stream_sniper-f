"use client"

import { useState } from 'react'

// Websocket removed in favor of Supabase realtime. Keep minimal stub for
// any legacy imports that expect useWebsocket to exist.

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useWebsocket() {
  const [tokens] = useState<any[]>([])
  return {
    tokens,
    isConnected: false,
    connectionState: 'disconnected' as ConnectionState,
    reconnectAttempts: 0,
    connect: () => {},
    disconnect: () => {},
  }
}