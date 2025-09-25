import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { transformBackendToken, mergeTokenWithChanges } from './socket-helpers'
import { LiveToken } from '@/types/token.types'

// useTokens: fetch initial snapshot from Supabase and subscribe to realtime
export function useTokens() {
  const [tokens, setTokens] = useState<LiveToken[]>([])

  useEffect(() => {
    let mounted = true

    async function fetchInitial() {
      try {
        const { data, error } = await supabase.from('tokens').select('*')
        console.log('supabase fetch result', { data, error })
        if (error) {
          console.error('supabase fetch error', error)
          return
        }
        if (!mounted) return

        // transform each record into the canonical LiveToken shape
        const transformed = (data as any[] || []).map((r) => transformBackendToken(r))
        console.log('[fetchInitial] fetched tokens:', transformed)
        setTokens(transformed)
      } catch (e) {
        console.error('useTokens fetchInitial error', e)
      }
    }

    fetchInitial()

    // Realtime handler
    const handler = (payload: any) => {
      console.log('[realtime payload]', payload)

      const record = payload.new ?? payload.old
      if (!record) {
        console.warn('[realtime] no record in payload')
        return
      }

      const transformed = transformBackendToken(record)
      console.log(`[realtime ${payload.eventType}] transformed:`, transformed)

      setTokens((prev) => {
        const idx = prev.findIndex(t => t.mint_address === transformed.mint_address)

        if (payload.eventType === 'INSERT') {
          console.log('[INSERT] adding token:', transformed)
          return [transformed, ...prev]
        }

        if (payload.eventType === 'UPDATE') {
          if (idx === -1) {
            console.log('[UPDATE] token not found, inserting:', transformed)
            return [transformed, ...prev]
          }
          const next = [...prev]
          // Merge incoming transformed data into existing token using the
          // mergeTokenWithChanges helper so we don't overwrite previously
          // stored nested fields when the Supabase UPDATE payload is partial.
          next[idx] = mergeTokenWithChanges(next[idx], transformed)
          console.log('[UPDATE] merged token at index', idx, '->', next[idx])
          return next
        }

        if (payload.eventType === 'DELETE') {
          if (idx === -1) {
            console.log('[DELETE] token not found, ignoring')
            return prev
          }
          const next = [...prev]
          next.splice(idx, 1)
          console.log('[DELETE] removed token at index', idx)
          return next
        }

        console.log('[realtime] unhandled eventType:', payload.eventType)
        return prev
      })
    }

    // Subscribe to realtime changes on the tokens table
    const channel = supabase
      .channel('tokens-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, handler)

    channel.subscribe((status) => {
      console.log('[subscription status]', status)
      if (status !== 'SUBSCRIBED') {
        console.warn('[subscription] not ready:', status)
      }
    })

    return () => {
      mounted = false
      try {
        console.log('[cleanup] unsubscribing channel')
        channel.unsubscribe()
      } catch (e) {
        console.error('[cleanup] unsubscribe error', e)
      }
    }
  }, [])

  return { data: tokens }
}
