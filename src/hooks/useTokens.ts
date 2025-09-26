import { useEffect, useRef, useState } from 'react'
import supabase from '@/lib/supabase'
import { transformBackendToken, mergeTokenWithChanges } from './socket-helpers'
import tokenWorkerClient from '@/workers/tokenWorkerClient'
import { LiveToken } from '@/types/token.types'

// useTokens: fetch initial snapshot from Supabase and subscribe to realtime
export function useTokens() {
  const [tokens, setTokens] = useState<LiveToken[]>([])

  useEffect(() => {
    let mounted = true
    const tokensRef = { current: [] as LiveToken[] }

    async function fetchInitial() {
      try {
        const { data, error } = await supabase.from('tokens').select('*')
        //console.log('supabase fetch result', { data, error })
        if (error) {
          console.error('supabase fetch error', error)
          return
        }
        if (!mounted) return

        // transform each record into the canonical LiveToken shape using worker when available
        const records = (data as any[] || [])
        let transformed: any[]
        try {
          transformed = await tokenWorkerClient.transformBatch(records)
        } catch (e) {
          //console.warn('worker transformBatch failed, falling back', e)
          transformed = records.map((r) => transformBackendToken(r))
        }
        //console.log('[fetchInitial] fetched tokens:', transformed)
        if (!mounted) return
        tokensRef.current = transformed
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

      // Transform on worker when possible (fast, off-main-thread)
      ;(async () => {
        let transformed: any
        try {
          transformed = (await tokenWorkerClient.transformBatch([record]))[0]
        } catch (e) {
          //console.warn('worker transform failed, fallback to local', e)
          transformed = transformBackendToken(record)
        }
        console.log(`[realtime ${payload.eventType}] transformed:`, transformed)

        // Synchronous mutations for INSERT/DELETE can be applied immediately
        if (payload.eventType === 'INSERT') {
          setTokens((prev) => {
            // Prevent duplicate mints: if present, merge instead of inserting new
            const existIdx = prev.findIndex(t => t.mint_address === transformed.mint_address)
            if (existIdx !== -1) {
              const merged = mergeTokenWithChanges(prev[existIdx], transformed)
              const copy = [...prev]
              copy[existIdx] = merged
              tokensRef.current = copy
              return copy
            }
            const next = [transformed, ...prev]
            tokensRef.current = next
            return next
          })
          return
        }

        if (payload.eventType === 'DELETE') {
          setTokens((prev) => {
            const idx = prev.findIndex(t => t.mint_address === transformed.mint_address)
            if (idx === -1) return prev
            const next = [...prev]
            next.splice(idx, 1)
            tokensRef.current = next
            return next
          })
          return
        }

        if (payload.eventType === 'UPDATE') {
          // Attempt to merge using worker; fall back to main-thread merge
          setTokens((prev) => {
            const idx = prev.findIndex(t => t.mint_address === transformed.mint_address)
            if (idx === -1) {
              const next = [transformed, ...prev]
              tokensRef.current = next
              return next
            }

            // Optimistically leave prev unchanged and request worker merge
            // to compute merged object. We'll update state when merge completes.
            (async () => {
              try {
                const merged = await tokenWorkerClient.merge(prev[idx], transformed)
                // Ensure we don't clobber newer updates: compare by mint_address and updatedAt
                setTokens((current) => {
                  const at = current.findIndex(t => t.mint_address === merged.mint_address)
                  if (at === -1) return current
                  const copy = [...current]
                  copy[at] = merged
                  tokensRef.current = copy
                  return copy
                })
              } catch (e) {
                console.warn('worker merge failed, using local merge', e)
                const mergedLocal = mergeTokenWithChanges(prev[idx], transformed)
                setTokens((current) => {
                  const at = current.findIndex(t => t.mint_address === mergedLocal.mint_address)
                  if (at === -1) return current
                  const copy = [...current]
                  copy[at] = mergedLocal
                  tokensRef.current = copy
                  return copy
                })
              }
            })()

            return prev
          })
          return
        }

        //console.log('[realtime] unhandled eventType:', payload.eventType)
      })()
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
        //console.log('[cleanup] unsubscribing channel')
        channel.unsubscribe()
      } catch (e) {
        console.error('[cleanup] unsubscribe error', e)
      }
    }
  }, [])

  return { data: tokens }
}
