import { useEffect, useRef, useCallback } from 'react'

type SendFn = (ids: Array<number | string>) => void

interface UseVisibleDwellOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  dwellMs?: number // how long the element must stay visible to count
  batchIntervalMs?: number // how often to flush observed ids
  minEngagementMs?: number // optional additional engagement heuristics
}

// Usage: attach data-visible-id attributes to each row element with token id
// e.g., <tr data-visible-id={token.id} ...>
// Then call useVisibleDwell({ send, ...opts }) in the parent component.
export default function useVisibleDwell(send: SendFn, opts: UseVisibleDwellOptions = {}) {
  const {
    root = null,
    rootMargin = '0px 0px -30% 0px',
    threshold = [0.25, 0.5],
    dwellMs = 1500,
    batchIntervalMs = 3000,
    minEngagementMs = 800,
  } = opts

  const seenRef = useRef(new Map<string | number, { enteredAt: number; lastSeen: number }>() )
  const timerRef = useRef<number | null>(null)
  const flushTimerRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    const ids: Array<number | string> = []
    const now = Date.now()
    for (const [id, meta] of seenRef.current.entries()) {
      // only include items with sustained dwell
      if (now - meta.enteredAt >= dwellMs && now - meta.lastSeen >= 0) {
        ids.push(id)
      }
    }

    if (ids.length > 0) {
      try {
        send(ids)
      } catch (e) {
        // swallow; caller should handle errors/logging
        console.warn('useVisibleDwell send error', e)
      }
    }

    // clear seen map; keep entries that are still visible briefly to avoid double-reporting on quick scrolls
    seenRef.current.clear()
  }, [send, dwellMs])

  useEffect(() => {
    // periodic flush in case IntersectionObserver misses or timers drift
    flushTimerRef.current = window.setInterval(() => {
      flush()
    }, batchIntervalMs)

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [batchIntervalMs, flush])

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      console.warn('useVisibleDwell: IntersectionObserver not available in this environment')
      return
    }

    const observer = new IntersectionObserver((entries) => {
      const now = Date.now()
      for (const entry of entries) {
        // find nearest ancestor with data-visible-id
        let el: Element | null = entry.target
        let id: string | null = null
        while (el && el !== document.documentElement) {
          id = (el as HTMLElement).getAttribute?.('data-visible-id') ?? null
          if (id) break
          el = el.parentElement
        }
        if (!id) continue

        if (entry.isIntersecting && entry.intersectionRatio >= (Array.isArray(threshold) ? threshold[0] : (threshold as number))) {
          // start or refresh timer
          const prev = seenRef.current.get(id)
          if (!prev) {
            seenRef.current.set(id, { enteredAt: now, lastSeen: now })
          } else {
            prev.lastSeen = now
            seenRef.current.set(id, prev)
          }
        } else {
          // left view — if it had enough dwell, keep it until flush; otherwise remove
          const prev = seenRef.current.get(id)
          if (prev) {
            const dwell = now - prev.enteredAt
            if (dwell < dwellMs) {
              seenRef.current.delete(id)
            } else {
              // keep until flushed
              prev.lastSeen = now
              seenRef.current.set(id, prev)
            }
          }
        }
      }

      // Debounced immediate flush for stable view (avoid sending on quick scrolls)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        flush()
      }, Math.max(minEngagementMs, 600))
    }, { root, rootMargin, threshold })

    // Observe any element with data-visible-id dynamically
    const observeExisting = () => {
      const nodes = document.querySelectorAll('[data-visible-id]')
      nodes.forEach(n => observer.observe(n))
    }

    observeExisting()

    // Watch for new nodes using MutationObserver
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            if (n.hasAttribute('data-visible-id')) observer.observe(n)
            // also observe descendants
            n.querySelectorAll && n.querySelectorAll('[data-visible-id]').forEach(el => observer.observe(el))
          }
        })

        m.removedNodes.forEach((n) => {
          if (n instanceof Element) {
            if (n.hasAttribute('data-visible-id')) observer.unobserve(n as Element)
            n.querySelectorAll && n.querySelectorAll('[data-visible-id]').forEach(el => observer.unobserve(el))
          }
        })
      }
    })

    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mo.disconnect()
    }
  }, [root, rootMargin, threshold, dwellMs, minEngagementMs, flush])

  // Expose manual flush if needed
  return {
    flushNow: flush,
  }
}
