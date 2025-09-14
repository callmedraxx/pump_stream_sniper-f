// In-memory token storage for production environments
// Modified for serverless environments like Vercel

interface TokenData {
  event: string
  timestamp: string
  token_count: number
  data: any[]
  last_sse_update: string
  backend_total_count: number | null
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
      //console.log('🔄 Created new TokenStorage instance for serverless environment')
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
    if (data.event === 'live_token_update' && this.tokensData) {
      // Individual token update - merge with existing data
      const existingTokens = this.tokensData.data
      const updatedToken = data.data[0]
      
      // Find existing token by mint
      const existingIndex = existingTokens.findIndex((t: any) => t.token_info?.mint === updatedToken.token_info?.mint)
      
      if (existingIndex >= 0) {
        // Update existing token
        existingTokens[existingIndex] = {
          ...updatedToken,
          _isUpdated: true,
          _updatedAt: Date.now()
        }
        console.log(`🔄 Merged individual token update for ${updatedToken.token_info?.symbol}`)
      } else {
        // Add new token
        existingTokens.unshift(updatedToken)
        console.log(`➕ Added new token ${updatedToken.token_info?.symbol} to storage`)
      }
      
      // Update the stored data with merged tokens
      this.tokensData = {
        ...this.tokensData,
        data: existingTokens,
        token_count: existingTokens.length,
        last_sse_update: data.last_sse_update,
        timestamp: data.timestamp
        // Keep existing backend_total_count
      }
    } else {
      // Full update - replace all data
      this.tokensData = data
    }
    
    this.lastUpdate = new Date().toISOString()
    
    // Notify all subscribers of the update
    this.subscribers.forEach(callback => {
      try {
        callback(this.tokensData!)
      } catch (error) {
        console.error('Error notifying subscriber:', error)
      }
    })
    
    //console.log(`✅ Stored ${this.tokensData.data.length} tokens in memory at ${this.lastUpdate}`)
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
