// In-memory token storage for production environments
// Modified for serverless environments like Vercel

interface TokenData {
  event: string
  timestamp: string
  token_count: number
  data: any[]
  last_sse_update: string
  backend_total_count: number
}

class TokenStorage {
  private static instance: TokenStorage | null = null
  private static lastInstanceTime: number = 0
  private static readonly INSTANCE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
  private tokensData: TokenData | null = null
  private lastUpdate: string = ''
  private subscribers: Array<(data: TokenData) => void> = []

  private constructor() {}

  static getInstance(): TokenStorage {
    const now = Date.now()

    // Create new instance if none exists or if the current one is too old
    if (!TokenStorage.instance || (now - TokenStorage.lastInstanceTime) > TokenStorage.INSTANCE_TIMEOUT) {
      TokenStorage.instance = new TokenStorage()
      TokenStorage.lastInstanceTime = now
      console.log('🔄 Created new TokenStorage instance for serverless environment')
    }

    return TokenStorage.instance
  }

  // Force refresh instance (useful for serverless environments)
  static refreshInstance(): TokenStorage {
    TokenStorage.instance = new TokenStorage()
    TokenStorage.lastInstanceTime = Date.now()
    console.log('🔄 Force refreshed TokenStorage instance')
    return TokenStorage.instance
  }

  // Store tokens data in memory
  setTokens(data: TokenData): void {
    this.tokensData = data
    this.lastUpdate = new Date().toISOString()
    
    // Notify all subscribers of the update
    this.subscribers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error notifying subscriber:', error)
      }
    })
    
    console.log(`✅ Stored ${data.data.length} tokens in memory at ${this.lastUpdate}`)
  }

  // Get current tokens data
  getTokens(): TokenData | null {
    return this.tokensData
  }

  // Get last update timestamp
  getLastUpdate(): string {
    return this.lastUpdate
  }

  // Check if data exists and is recent (within 5 minutes)
  hasRecentData(): boolean {
    if (!this.tokensData || !this.lastUpdate) return false
    
    const lastUpdateTime = new Date(this.lastUpdate).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000
    
    return (now - lastUpdateTime) < fiveMinutes
  }

  // Subscribe to token updates
  subscribe(callback: (data: TokenData) => void): () => void {
    this.subscribers.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  // Get basic stats
  getStats(): {
    hasData: boolean
    tokenCount: number
    lastUpdate: string
    subscriberCount: number
  } {
    return {
      hasData: this.tokensData !== null,
      tokenCount: this.tokensData?.data.length || 0,
      lastUpdate: this.lastUpdate,
      subscriberCount: this.subscribers.length
    }
  }

  // Clear data (useful for testing)
  clear(): void {
    this.tokensData = null
    this.lastUpdate = ''
    console.log('🧹 Cleared token storage')
  }
}

export const tokenStorage = TokenStorage.getInstance()
export type { TokenData }
