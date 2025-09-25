/* Lightweight worker client for token transforms/merges.
   Loads the worker from /workers/tokenWorker.js (public folder) and provides
   async transformBatch(records) and merge(prev, incoming) functions.
   If worker fails to initialize, falls back to local helpers imported from socket-helpers.
*/
import { transformBackendToken as localTransform, mergeTokenWithChanges as localMerge } from '@/hooks/socket-helpers'

type PendingResolve = (v: any) => void

class TokenWorkerClient {
  private worker?: Worker
  private nextId = 1
  private pending = new Map<number, PendingResolve>()
  private ready = false

  constructor() {
    // Defer worker creation to runtime (avoid SSR ReferenceError).
    // Actual worker will be lazily initialized when first needed.
    this.ready = false
  }

  private initWorkerIfNeeded() {
    if (this.worker || this.ready) return
    try {
      if (typeof window === 'undefined') {
        // SSR - do not initialize worker
        this.ready = false
        return
      }
      if (typeof (window as any).Worker === 'undefined') {
        // Browser doesn't support Worker
        this.ready = false
        return
      }
      // public folder served at / - worker file placed at /workers/tokenWorker.js
      this.worker = new Worker('/workers/tokenWorker.js')
      this.worker.onmessage = (e) => this.handleMessage(e.data)
      this.worker.onerror = (e) => {
        console.warn('tokenWorker error, falling back to main thread', e)
        this.cleanup()
        this.ready = false
      }
      this.ready = true
    } catch (err) {
      console.warn('tokenWorker failed to initialize, using main-thread fallback', err)
      this.ready = false
    }
  }

  private cleanup() {
    try {
      this.worker?.terminate()
    } catch (e) {}
    this.worker = undefined
    this.pending.forEach((res) => res(null))
    this.pending.clear()
  }

  private handleMessage(msg: any) {
    const id = msg.id
    if (!id) return
    const pending = this.pending.get(id)
    if (!pending) return
    this.pending.delete(id)
    pending(msg)
  }

  private post(type: string, payload: any) {
    this.initWorkerIfNeeded()
    if (!this.worker || !this.ready) return Promise.resolve(null)
    const id = this.nextId++
    const p = new Promise<any>((res) => {
      this.pending.set(id, res)
      try {
        this.worker!.postMessage({ id, type, ...payload })
      } catch (err) {
        console.warn('postMessage failed, cleaning up worker', err)
        this.cleanup()
        res(null)
      }
    })
    return p
  }

  async transformBatch(records: any[]) {
    if (this.worker && this.ready) {
      const msg = await this.post('transformBatch', { records })
      if (msg && msg.type === 'transformBatchResult') return msg.transformed
      // fallback to local
    }
    return records.map(localTransform)
  }

  async merge(prev: any, incoming: any) {
    if (this.worker && this.ready) {
      const msg = await this.post('merge', { prev, incoming })
      if (msg && msg.type === 'mergeResult') return msg.merged
      // fallback
    }
    return localMerge(prev, incoming)
  }

  terminate() {
    this.cleanup()
  }
}

const singleton = new TokenWorkerClient()
export default singleton
