"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronUp, ChevronDown, Minus } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedNumber, AnimatedPercentage } from "@/components/animated-number"
import { AnimatedProgress } from "@/components/animated-progress"

interface LiveToken {
  token_info: {
    mint: string
    name: string
    symbol: string
    description?: string | null
    image_uri?: string | null
    metadata_uri?: string | null
    video_uri?: string | null
  }
  market_data: {
    market_cap: string
    usd_market_cap: string
    progress_percentage: number
    last_trade_formatted?: string | null
    ath?: string | null
  }
  creator_info: {
    creator: string
    created_formatted?: string
  }
  social_links: {
    twitter?: string | null
    website?: string | null
    telegram?: string | null
  }
  status_flags: {
    is_currently_live: boolean
    nsfw: boolean
    show_name: boolean
    is_active?: boolean
  }
  trading_info: {
    virtual_sol_reserves: number
    real_sol_reserves: number
    total_sol: number
    progress_percentage: number
    last_trade_timestamp?: string | null
    last_trade_formatted?: string | null
    market_cap: string
    usd_market_cap: string
    volume_24h: number
    txns_24h: number
    traders_24h: number
    price_change_24h: number
    volume_5m: number
    volume_1h: number
    volume_6h: number
    txns_5m: number
    txns_1h: number
    txns_6h: number
    traders_5m: number
    traders_1h: number
    traders_6h: number
    price_change_5m: number
    price_change_1h: number
    price_change_6h: number
  }
  pool_info: {
    complete: boolean
    is_currently_live: boolean
    king_of_hill_timestamp?: string | null
    last_reply?: string | null
    reply_count: number
    raydium_pool?: string | null
    curve_threshold?: number | null
  }
  activity_info: {
    created_timestamp?: number | null
    created_formatted?: string
    nsfw: boolean
    show_name: boolean
    creator: string
    dev_buy?: number | null
    dev_sell?: number | null
    sniping?: boolean | null
    last_updated?: string | null
    viewers: number
  }
  raw_data: Record<string, unknown>
  // Internal tracking properties
  _isUpdated?: boolean
  _updatedAt?: number
  _previousValues?: {
    market_cap?: string
    usd_market_cap?: string
    progress_percentage?: number
    ath?: string
    volume_5m?: number
    volume_1h?: number
    volume_6h?: number
    volume_24h?: number
    txns_5m?: number
    txns_1h?: number
    txns_6h?: number
    txns_24h?: number
    traders_5m?: number
    traders_1h?: number
    traders_6h?: number
    traders_24h?: number
    price_change_5m?: number
    price_change_1h?: number
    price_change_6h?: number
    price_change_24h?: number
    viewers?: number
  }
}

export default function Page() {
  const [liveTokens, setLiveTokens] = useState<LiveToken[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Sorting state - using persistent sort instead of local state
  const [uiSelection, setUiSelection] = useState<string>('24h') // UI selection: time period or 'trending'
  const [dataTimePeriod, setDataTimePeriod] = useState<string>('24h') // Actual time period for data display
  
  // Persistent sort state - saved to localStorage
  const [persistentSort, setPersistentSort] = useState<{
    sortBy: string
    sortOrder: 'asc' | 'desc'
    dataTimePeriod: string
  }>({
    sortBy: 'age',
    sortOrder: 'desc',
    dataTimePeriod: '24h'
  })

  // Helper function to parse market cap strings (e.g., "35.0K" -> 35000, "1.2M" -> 1200000)
  const parseMarketCap = (mcapStr: string): number => {
    if (!mcapStr || mcapStr === 'N/A') return 0
    
    const cleanStr = mcapStr.replace('$', '').replace(',', '').trim()
    const num = parseFloat(cleanStr)
    
    if (cleanStr.includes('K')) return num * 1000
    if (cleanStr.includes('M')) return num * 1000000
    if (cleanStr.includes('B')) return num * 1000000000
    
    return num || 0
  }

  // Helper function to format market cap values for display
  const formatMarketCap = (value: number): string => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  // Helper function to format volume values
  const formatVolume = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  // Load persistent sort from localStorage on mount
  useEffect(() => {
    const savedSort = localStorage.getItem('tokenTableSort')
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort)
        setPersistentSort(parsed)
        setDataTimePeriod(parsed.dataTimePeriod)
        // Update UI selection if it matches a time period
        if (['5m', '1h', '6h', '24h'].includes(parsed.dataTimePeriod)) {
          setUiSelection(parsed.dataTimePeriod)
        } else if (parsed.sortBy === 'trending') {
          setUiSelection('trending')
        }
      } catch (error) {
        console.error('Error loading saved sort preferences:', error)
      }
    }
  }, [])

  // Save persistent sort to localStorage
  const saveSortPreferences = (newSortBy: string, newSortOrder: 'asc' | 'desc', newDataTimePeriod: string) => {
    const sortPrefs = {
      sortBy: newSortBy,
      sortOrder: newSortOrder,
      dataTimePeriod: newDataTimePeriod
    }
    setPersistentSort(sortPrefs)
    localStorage.setItem('tokenTableSort', JSON.stringify(sortPrefs))
  }

  // Helper function to parse formatted age strings like "5m ago", "2h ago", "3d ago" into timestamps
  const parseFormattedAge = (ageString: string): number => {
    if (!ageString) return 0
    
    // Convert to lowercase and remove extra whitespace
    const cleanAge = ageString.toLowerCase().trim()
    
    // Handle "just now" or "now" cases
    if (cleanAge.includes('now') || cleanAge === '0s') {
      return Date.now()
    }
    
    // Remove "ago" and other common suffixes
    const withoutSuffix = cleanAge
      .replace(/\s*ago\s*/gi, '')
      .replace(/\s*old\s*/gi, '')
      .trim()
    
    // Try multiple regex patterns for different formats
    const patterns = [
      /^(\d+(?:\.\d+)?)(mo)$/,                                        // "5mo" (months)
      /^(\d+(?:\.\d+)?)\s*([smhdy]|sec|min|hour|day|month|year)s?$/,  // "5m", "2h", "3d"
      /^(\d+(?:\.\d+)?)\s*(second|minute|hour|day|month|year)s?$/,    // "5 minutes", "2 hours"  
      /^(\d+(?:\.\d+)?)\s*([smhdy])$/,                                // "5m", "2h" (no space)
      /^(\d+(?:\.\d+)?)([smhdy])$/,                                   // "5m", "2h" (no space at all)
    ]
    
    let match = null
    for (const pattern of patterns) {
      match = withoutSuffix.match(pattern)
      if (match) break
    }
    
    if (!match) {
      console.warn(`Failed to parse age format: "${ageString}"`)
      return 0
    }
    
    const value = parseFloat(match[1])
    const unit = match[2] || 's'
    
    if (isNaN(value)) {
      console.warn(`Invalid age value: "${ageString}" -> value: ${match[1]}`)
      return 0
    }
    
    const now = Date.now()
    let millisecondsAgo = 0
    
    // Map units to milliseconds
    switch (unit) {
      case 'mo': // months (special case)
        millisecondsAgo = value * 30 * 24 * 60 * 60 * 1000 // ~30 days per month
        break
      case 's': // seconds
      case 'sec':
        millisecondsAgo = value * 1000
        break
      case 'm': // minutes
      case 'min':
        millisecondsAgo = value * 60 * 1000
        break
      case 'h': // hours
      case 'hour':
        millisecondsAgo = value * 60 * 60 * 1000
        break
      case 'd': // days
      case 'day':
        millisecondsAgo = value * 24 * 60 * 60 * 1000
        break
      case 'y': // years
      case 'year':
        millisecondsAgo = value * 365 * 24 * 60 * 60 * 1000
        break
      default:
        // Fallback: try first character
        switch (unit.charAt(0)) {
          case 's': millisecondsAgo = value * 1000; break
          case 'm': millisecondsAgo = value * 60 * 1000; break
          case 'h': millisecondsAgo = value * 60 * 60 * 1000; break
          case 'd': millisecondsAgo = value * 24 * 60 * 60 * 1000; break
          case 'y': millisecondsAgo = value * 365 * 24 * 60 * 60 * 1000; break
          default:
            console.warn(`Unknown age unit: "${unit}" in "${ageString}"`)
            millisecondsAgo = value * 1000 // Default to seconds
        }
    }
    
    const calculatedTime = now - millisecondsAgo
    
    // Debug logging for first few parses
    if (Math.random() < 0.1) { // Log 10% of parses for debugging
      //console.log(`Age parse: "${ageString}" -> ${value}${unit} -> ${new Date(calculatedTime).toLocaleString()}`)
    }
    
    return calculatedTime
  }

  // Sorting functions for different data types
  const sortByAge = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
    //console.log(`🕐 Sorting ${tokens.length} tokens by age (${order})`)
    
    // Debug: Log some sample age formats
    if (tokens.length > 0) {
      const sampleAges = tokens.slice(0, 5).map(t => t.creator_info.created_formatted)
      //console.log('Sample age formats:', sampleAges)
    }
    
    return [...tokens].sort((a, b) => {
      // First try to parse the formatted age string
      let aTime = parseFormattedAge(a.creator_info.created_formatted || '')
      let bTime = parseFormattedAge(b.creator_info.created_formatted || '')
      
      // If parsing failed, try to use raw timestamp if available
      if (aTime === 0 && a.activity_info.created_timestamp) {
        aTime = a.activity_info.created_timestamp
      }
      if (bTime === 0 && b.activity_info.created_timestamp) {
        bTime = b.activity_info.created_timestamp
      }
      
      // Fallback: try to parse as date string
      if (aTime === 0) {
        const parsedA = new Date(a.creator_info.created_formatted || 0).getTime()
        if (!isNaN(parsedA)) aTime = parsedA
      }
      if (bTime === 0) {
        const parsedB = new Date(b.creator_info.created_formatted || 0).getTime()
        if (!isNaN(parsedB)) bTime = parsedB
      }
      
      // Sort by timestamp (newer tokens have higher timestamps)
      // For age sorting: asc = oldest first, desc = newest first
      return order === 'asc' ? aTime - bTime : bTime - aTime
    })
  }

  const sortByMarketCap = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = parseMarketCap(a.market_data.usd_market_cap)
      const bValue = parseMarketCap(b.market_data.usd_market_cap)
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortByATH = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = parseMarketCap(a.market_data.ath || '0')
      const bValue = parseMarketCap(b.market_data.ath || '0')
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortByVolume = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = a.trading_info[`volume_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bValue = b.trading_info[`volume_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortByTransactions = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = a.trading_info[`txns_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bValue = b.trading_info[`txns_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortByTraders = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = a.trading_info[`traders_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bValue = b.trading_info[`traders_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortByPriceChange = (tokens: LiveToken[], order: 'asc' | 'desc', timePeriod: string): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = a.trading_info[`price_change_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bValue = b.trading_info[`price_change_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortByViewers = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = a.activity_info.viewers || 0
      const bValue = b.activity_info.viewers || 0
      return order === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortBySymbol = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      const aValue = (a.token_info.symbol || '').toLowerCase()
      const bValue = (b.token_info.symbol || '').toLowerCase()
      return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    })
  }

  // Special sorting for creators - group by creator with most tokens first
  const sortByCreator = (tokens: LiveToken[], order: 'asc' | 'desc'): LiveToken[] => {
    // Count tokens per creator
    const creatorCounts = tokens.reduce((acc, token) => {
      const creator = token.creator_info.creator || 'Unknown'
      acc[creator] = (acc[creator] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Sort creators by token count
    const sortedCreators = Object.entries(creatorCounts)
      .sort(([, countA], [, countB]) => order === 'desc' ? countB - countA : countA - countB)
      .map(([creator]) => creator)

    //console.log(`👥 Creator grouping: ${sortedCreators.length} unique creators, top creator has ${Math.max(...Object.values(creatorCounts))} tokens`)

    // Group tokens by creator and sort within each group by age (newest first)
    const groupedTokens: LiveToken[] = []
    sortedCreators.forEach(creator => {
      const creatorTokens = tokens
        .filter(token => (token.creator_info.creator || 'Unknown') === creator)
        .sort((a, b) => {
          const aTime = new Date(a.creator_info.created_formatted || 0).getTime()
          const bTime = new Date(b.creator_info.created_formatted || 0).getTime()
          return bTime - aTime // Newest first within each creator group
        })
      groupedTokens.push(...creatorTokens)
    })

    return groupedTokens
  }

  // Get creator count for display purposes
  const getCreatorCount = (creator: string) => {
    return liveTokens.filter(token => 
      (token.creator_info.creator || 'Unknown') === creator
    ).length
  }

  // Trending sort - complex multi-criteria sorting
  const sortByTrending = (tokens: LiveToken[], timePeriod: string): LiveToken[] => {
    return [...tokens].sort((a, b) => {
      // Primary: Volume
      const aVolume = a.trading_info[`volume_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bVolume = b.trading_info[`volume_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      
      if (Math.abs(aVolume - bVolume) > 100) { // Significant difference
        return bVolume - aVolume
      }

      // Secondary: Transactions
      const aTxns = a.trading_info[`txns_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bTxns = b.trading_info[`txns_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      
      if (Math.abs(aTxns - bTxns) > 10) { // Significant difference
        return bTxns - aTxns
      }

      // Tertiary: Traders
      const aTraders = a.trading_info[`traders_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bTraders = b.trading_info[`traders_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      
      if (Math.abs(aTraders - bTraders) > 5) { // Significant difference
        return bTraders - aTraders
      }

      // Final: Price change (positive changes preferred)
      const aPriceChange = a.trading_info[`price_change_${timePeriod}` as keyof typeof a.trading_info] as number || 0
      const bPriceChange = b.trading_info[`price_change_${timePeriod}` as keyof typeof b.trading_info] as number || 0
      return bPriceChange - aPriceChange
    })
  }

  // Persistent connection state
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [sseConnection, setSseConnection] = useState<AbortController | null>(null)

  // Function to establish persistent SSE connection
  const establishSSEConnection = async (retryCount = 0) => {
    // Abort existing connection if any
    if (sseConnection) {
      sseConnection.abort()
    }

    const abortController = new AbortController()
    setSseConnection(abortController)

    try {
      //console.log(`🚀 Establishing SSE connection (attempt ${retryCount + 1})`)
      setConnectionStatus('connecting')
      
      const response = await fetch('/api/livestreams', {
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      setIsConnected(true)
      setConnectionStatus('connected')
      setReconnectAttempts(0)
      //console.log('✅ SSE connection established')

      // Read the SSE stream continuously
      while (!abortController.signal.aborted) {
        try {
          const { done, value } = await reader.read()

          if (done) {
            //console.log('📡 SSE stream ended')
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          if (chunk) {
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6)
                  const data = JSON.parse(jsonStr)

                  if (data.event === 'tokens_update' && data.data?.tokens) {
                    //console.log(`📊 Received ${data.data.tokens.length} tokens from SSE stream`)
                    
                    // Wait a moment for the file to be written, then reload
                    setTimeout(async () => {
                      await loadTokensFromFile()
                    }, 500)
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', parseError)
                }
              }
            }
          }
        } catch (readError) {
          if (!abortController.signal.aborted) {
            console.error('SSE read error:', readError)
            break
          }
        }
      }
    } catch (error: unknown) {
      if (!abortController.signal.aborted) {
        console.error('❌ SSE connection error:', error)
        setConnectionStatus('error')
        setIsConnected(false)
        
        // Implement exponential backoff for reconnection
        const maxRetries = 5
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30s
        
        if (retryCount < maxRetries) {
          //console.log(`🔄 Reconnecting in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`)
          setReconnectAttempts(retryCount + 1)
          
          setTimeout(() => {
            establishSSEConnection(retryCount + 1)
          }, backoffDelay)
        } else {
          //console.log('❌ Max reconnection attempts reached, falling back to file watching')
          setConnectionStatus('error')
        }
      }
    } finally {
      if (sseConnection === abortController) {
        setSseConnection(null)
      }
    }
  }

  // Legacy function for initial token fetch (now just establishes persistent connection)
  const fetchInitialTokens = async () => {
    await loadTokensFromFile() // Load existing data first
    await establishSSEConnection() // Then establish live connection
  }

  // Manual reconnection function
  const manualReconnect = async () => {
    //console.log('🔄 Manual reconnection triggered')
    setReconnectAttempts(0)
    await establishSSEConnection()
  }

  // Function to load tokens from API endpoint
  const loadTokensFromFile = async () => {
    try {
      //console.log('📂 Loading tokens from API endpoint')
      const response = await fetch('/api/tokens', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('📂 No tokens data available yet, will load when available')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      //console.log('📂 Loaded tokens from file:', data)

      if (data.event === 'live_tokens_update' && data.data) {
        //console.log(`✅ Setting ${data.data.length} tokens from file`)

        // Use smart update to only change what's different and maintain sorting
        setLiveTokens(prevTokens => {
          let processedTokens: LiveToken[]
          
          if (prevTokens.length === 0) {
            // First load
            processedTokens = data.data
            //console.log(`📊 First load: ${processedTokens.length} tokens`)
          } else {
            // Update existing tokens while preserving changes
            processedTokens = updateChangedTokens(prevTokens, data.data)
            //console.log(`🔄 Updated tokens, applying sort: ${persistentSort.sortBy}`)
          }
          
          // Always apply current sort to ensure consistency
          return sortTokens(processedTokens)
        })

        setLastUpdate(new Date(data.timestamp).toLocaleString())
        setConnectionStatus('connected')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Error loading tokens from file:', error)
      setIsLoading(false)
    }
  }


  // Unified function to sort tokens based on current sort criteria
  const sortTokens = (tokens: LiveToken[]): LiveToken[] => {
    if (tokens.length === 0) return tokens

    let sortedTokens: LiveToken[]

    switch (persistentSort.sortBy) {
      case 'age':
        sortedTokens = sortByAge(tokens, persistentSort.sortOrder)
        break
      case 'mcap':
        sortedTokens = sortByMarketCap(tokens, persistentSort.sortOrder)
        break
      case 'ath':
        sortedTokens = sortByATH(tokens, persistentSort.sortOrder)
        break
      case 'volume':
        sortedTokens = sortByVolume(tokens, persistentSort.sortOrder, persistentSort.dataTimePeriod)
        break
      case 'txns':
        sortedTokens = sortByTransactions(tokens, persistentSort.sortOrder, persistentSort.dataTimePeriod)
        break
      case 'traders':
        sortedTokens = sortByTraders(tokens, persistentSort.sortOrder, persistentSort.dataTimePeriod)
        break
      case 'price_change':
        sortedTokens = sortByPriceChange(tokens, persistentSort.sortOrder, persistentSort.dataTimePeriod)
        break
      case 'viewers':
        sortedTokens = sortByViewers(tokens, persistentSort.sortOrder)
        break
      case 'creator':
        sortedTokens = sortByCreator(tokens, persistentSort.sortOrder)
        break
      case 'symbol':
        sortedTokens = sortBySymbol(tokens, persistentSort.sortOrder)
        break
      case 'trending':
        sortedTokens = sortByTrending(tokens, persistentSort.dataTimePeriod)
        break
      default:
        sortedTokens = sortByAge(tokens, 'desc') // Default fallback
    }

    //console.log(`🔄 Sorted ${sortedTokens.length} tokens by ${persistentSort.sortBy} (${persistentSort.sortOrder}) for ${persistentSort.dataTimePeriod}`)
    return sortedTokens
  }

  // File watching state
  const [lastFileModified, setLastFileModified] = useState<number>(0)

  // Function to check for file updates
  const checkForFileUpdates = async () => {
    try {
      const response = await fetch('/api/tokens', {
        method: 'HEAD',
        cache: 'no-cache'
      })

      if (response.ok) {
        const lastModified = response.headers.get('last-modified')
        if (lastModified) {
          const modifiedTime = new Date(lastModified).getTime()
          if (modifiedTime > lastFileModified && lastFileModified > 0) {
            //console.log('� File changed, reloading tokens...')
            await loadTokensFromFile()
          }
          setLastFileModified(modifiedTime)
        }
      }
    } catch {
      // File might not exist yet, that's okay
    }
  }

  // Function to update only changed tokens
  const updateChangedTokens = (existingTokens: LiveToken[], newTokens: LiveToken[]): LiveToken[] => {
    const existingMap = new Map(existingTokens.map(token => [token.token_info.mint, token]))
    const updatedTokens: LiveToken[] = []
    let changedCount = 0

    for (const newToken of newTokens) {
      const mint = newToken.token_info.mint
      const existingToken = existingMap.get(mint)

      if (existingToken) {
        // Compare key fields to see if anything changed
        const hasChanged = compareTokens(existingToken, newToken)

        if (hasChanged) {
          // Store previous values for animation
          const previousValues = {
            market_cap: existingToken.market_data.market_cap,
            usd_market_cap: existingToken.market_data.usd_market_cap,
            progress_percentage: existingToken.market_data.progress_percentage,
            ath: existingToken.market_data.ath || undefined,
            volume_5m: existingToken.trading_info.volume_5m,
            volume_1h: existingToken.trading_info.volume_1h,
            volume_6h: existingToken.trading_info.volume_6h,
            volume_24h: existingToken.trading_info.volume_24h,
            txns_5m: existingToken.trading_info.txns_5m,
            txns_1h: existingToken.trading_info.txns_1h,
            txns_6h: existingToken.trading_info.txns_6h,
            txns_24h: existingToken.trading_info.txns_24h,
            traders_5m: existingToken.trading_info.traders_5m,
            traders_1h: existingToken.trading_info.traders_1h,
            traders_6h: existingToken.trading_info.traders_6h,
            traders_24h: existingToken.trading_info.traders_24h,
            price_change_5m: existingToken.trading_info.price_change_5m,
            price_change_1h: existingToken.trading_info.price_change_1h,
            price_change_6h: existingToken.trading_info.price_change_6h,
            price_change_24h: existingToken.trading_info.price_change_24h,
            viewers: existingToken.activity_info.viewers,
          }

          // Mark as updated and merge new data
          updatedTokens.push({
            ...newToken,
            _isUpdated: true,
            _updatedAt: Date.now(),
            _previousValues: previousValues
          })
          changedCount++
        } else {
          // Keep existing token
          updatedTokens.push({
            ...existingToken,
            _isUpdated: false
          })
        }
      } else {
        // New token
        updatedTokens.push({
          ...newToken,
          _isUpdated: true,
          _updatedAt: Date.now()
        })
        changedCount++
      }
    }

    console.log(`🔄 Token comparison: ${changedCount} changed out of ${newTokens.length} total`)
    return updatedTokens
  }

  // Function to compare two tokens for changes
  const compareTokens = (token1: LiveToken, token2: LiveToken): boolean => {
    // Compare market data
    if (token1.market_data.usd_market_cap !== token2.market_data.usd_market_cap) return true
    if (token1.market_data.progress_percentage !== token2.market_data.progress_percentage) return true
    if (token1.market_data.ath !== token2.market_data.ath) return true

    // Compare trading info
    const timePeriods = ['5m', '1h', '6h', '24h']
    for (const period of timePeriods) {
      if (token1.trading_info[`volume_${period}` as keyof typeof token1.trading_info] !==
          token2.trading_info[`volume_${period}` as keyof typeof token2.trading_info]) return true
      if (token1.trading_info[`txns_${period}` as keyof typeof token1.trading_info] !==
          token2.trading_info[`txns_${period}` as keyof typeof token2.trading_info]) return true
      if (token1.trading_info[`traders_${period}` as keyof typeof token1.trading_info] !==
          token2.trading_info[`traders_${period}` as keyof typeof token2.trading_info]) return true
      if (token1.trading_info[`price_change_${period}` as keyof typeof token1.trading_info] !==
          token2.trading_info[`price_change_${period}` as keyof typeof token2.trading_info]) return true
    }

    // Compare activity info
    if (token1.activity_info.viewers !== token2.activity_info.viewers) return true

    // Compare status flags
    if (token1.status_flags.is_currently_live !== token2.status_flags.is_currently_live) return true
    if (token1.status_flags.nsfw !== token2.status_flags.nsfw) return true

    return false
  }

  useEffect(() => {
    // Initial data fetch on page load
    const initializeData = async () => {
      // First try to load existing tokens
      await loadTokensFromFile()

      // If no tokens exist, fetch from backend
      if (liveTokens.length === 0) {
        await fetchInitialTokens()
      }
    }

    initializeData()

    // Start file watching after initial load
    const fileWatchInterval = setInterval(() => {
      if (!isLoading && liveTokens.length > 0) {
        checkForFileUpdates()
      }
    }, 100) // Check every 100 milliseconds

    return () => {
      clearInterval(fileWatchInterval)
      // Clean up SSE connection on unmount
      if (sseConnection) {
        //console.log('🧹 Cleaning up SSE connection on component unmount')
        sseConnection.abort()
        setSseConnection(null)
      }
    }
  }, [isLoading, liveTokens.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear update flags after 3 seconds
  useEffect(() => {
    const clearUpdateFlags = () => {
      setLiveTokens(prevTokens =>
        prevTokens.map(token => ({
          ...token,
          _isUpdated: false
        }))
      )
    }

    const interval = setInterval(clearUpdateFlags, 300) // Clear every 3 seconds
    return () => clearInterval(interval)
  }, [])

  // Function removed - not being used

  const handleSortToggle = (column: string) => {
    let newSortOrder: 'asc' | 'desc' = 'desc'
    
    if (persistentSort.sortBy === column) {
      // Toggle order if same column
      newSortOrder = persistentSort.sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      // New column, default to desc except for certain columns
      newSortOrder = ['age', 'symbol'].includes(column) ? 'asc' : 'desc'
    }

    // Update sort preferences
    saveSortPreferences(column, newSortOrder, dataTimePeriod)

    // Re-sort existing tokens immediately
    setLiveTokens(prevTokens => sortTokens(prevTokens))
    
    //console.log(`🎯 Sort changed to: ${column} (${newSortOrder}) for period ${dataTimePeriod}`)
  }

  const renderSortIcon = (column: string) => {
    if (persistentSort.sortBy !== column) return <Minus className="h-3 w-3 text-muted-foreground/50" />
    return persistentSort.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  // Function removed - not being used

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4">
              {/* Status Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge
                    variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'}
                  >
                    {connectionStatus === 'connected' ? (isConnected ? '🟢 Live Stream' : '🟢 File Watching') :
                     connectionStatus === 'error' ? `🔴 Error${reconnectAttempts > 0 ? ` (${reconnectAttempts}/5)` : ''}` : 
                     '🟡 Connecting'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {isLoading ? 'Loading tokens...' : `${liveTokens.length} tokens`}
                      {lastUpdate && ` • Last updated: ${lastUpdate}`}
                    </span>
                    {connectionStatus === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={manualReconnect}
                        className="h-6 px-2 text-xs"
                      >
                        Reconnect
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Period Selector */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                <Tabs value={uiSelection} onValueChange={(value) => {
                  setUiSelection(value)
                  if (value === 'trending') {
                    // Switch to trending sort
                    saveSortPreferences('trending', 'desc', dataTimePeriod)
                    setLiveTokens(prevTokens => sortTokens(prevTokens))
                  } else {
                    // Update time period
                    const newTimePeriod = value
                    setDataTimePeriod(newTimePeriod)
                    
                    // If we were in trending mode, switch to age sorting
                    let newSortBy = persistentSort.sortBy
                    if (persistentSort.sortBy === 'trending') {
                      newSortBy = 'age'
                    }
                    
                    // Update persistent sort with new time period
                    saveSortPreferences(newSortBy, persistentSort.sortOrder, newTimePeriod)
                    
                    // Re-sort tokens with new time period
                    setLiveTokens(prevTokens => sortTokens(prevTokens))
                  }
                }} className="flex-1">
                  <TabsList className="grid w-full max-w-md grid-cols-5">
                    <TabsTrigger value="5m">5M</TabsTrigger>
                    <TabsTrigger value="1h">1H</TabsTrigger>
                    <TabsTrigger value="6h">6H</TabsTrigger>
                    <TabsTrigger value="24h">24H</TabsTrigger>
                    <TabsTrigger value="trending">TRENDING</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="text-sm text-muted-foreground">
                  Current: {uiSelection === 'trending' ? 'Trending' : uiSelection.toUpperCase()} | Data: {dataTimePeriod.toUpperCase()}
                </div>
              </div>

              {/* Enhanced Tokens Table with Fixed Token Column */}
              <div className="border rounded-lg overflow-hidden table-shadow table-border bg-background">
                <div className="relative overflow-hidden">
                  {/* Table Container with Synchronized Scrolling */}
                  <div className="max-h-[75vh] overflow-auto scrollbar-thin">
                    <table className="w-full">
                      {/* Sticky Header */}
                      <thead className="sticky top-0 z-20 bg-background border-b backdrop-blur-sm">
                        <tr>
                          {/* Fixed Token Header */}
                          <th className="sticky left-0 z-30 w-[240px] px-4 py-3 text-left text-xs font-semibold bg-background border-r shadow-sm">
                            TOKEN
                          </th>
                          
                          {/* Scrollable Headers */}
                          <th className="w-[80px] px-2 py-3 text-xs font-medium text-center border-r">
                            GRAPH
                          </th>
                          <th 
                            className="w-[70px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('age')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              AGE {renderSortIcon('age')}
                            </div>
                          </th>
                          <th 
                            className="w-[90px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('mcap')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              MCAP {renderSortIcon('mcap')}
                            </div>
                          </th>
                          <th 
                            className="w-[80px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('ath')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              ATH {renderSortIcon('ath')}
                            </div>
                          </th>
                          <th 
                            className="w-[80px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('volume')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              VOL {renderSortIcon('volume')}
                            </div>
                          </th>
                          <th 
                            className="w-[70px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('txns')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              TXN {renderSortIcon('txns')}
                            </div>
                          </th>
                          <th 
                            className="w-[80px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('traders')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              TRADERS {renderSortIcon('traders')}
                            </div>
                          </th>
                          <th 
                            className="w-[90px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('price_change')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              CHANGE {renderSortIcon('price_change')}
                            </div>
                          </th>
                          <th 
                            className="w-[60px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
                            onClick={() => handleSortToggle('viewers')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              VIEWS {renderSortIcon('viewers')}
                            </div>
                          </th>
                          <th 
                            className="w-[100px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center transition-colors" 
                            onClick={() => handleSortToggle('creator')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              CREATOR {renderSortIcon('creator')}
                            </div>
                          </th>
                          <th className="w-[80px] px-2 py-3 text-xs font-medium text-center">
                            GMGN
                          </th>
                        </tr>
                      </thead>
                      
                      {/* Table Body */}
                      <tbody>
                        {isLoading ? (
                          Array.from({ length: 60 }, (_, i) => (
                            <tr key={i} className="border-b animate-pulse h-16">
                              {/* Fixed Token Cell */}
                              <td className="sticky left-0 z-10 w-[240px] p-3 bg-background border-r shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-muted"></div>
                                  <div className="flex-1">
                                    <div className="h-4 bg-muted rounded mb-1"></div>
                                    <div className="h-3 bg-muted/70 rounded w-16"></div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Scrollable Cells */}
                              <td className="w-[80px] p-2 text-center"><div className="h-8 w-12 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[70px] p-2 text-center"><div className="h-3 w-8 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[90px] p-2 text-center"><div className="h-3 w-12 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[80px] p-2 text-center"><div className="h-3 w-10 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[80px] p-2 text-center"><div className="h-3 w-10 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[70px] p-2 text-center"><div className="h-3 w-8 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[80px] p-2 text-center"><div className="h-3 w-10 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[90px] p-2 text-center"><div className="h-3 w-12 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[60px] p-2 text-center"><div className="h-3 w-6 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[100px] p-2 text-center"><div className="h-3 w-16 bg-muted rounded mx-auto"></div></td>
                              <td className="w-[80px] p-2 text-center"><div className="h-3 w-12 bg-muted rounded mx-auto"></div></td>
                            </tr>
                          ))
                        ) : (
                          liveTokens.map((token, index) => (
                            <tr 
                              key={token.token_info.mint}
                              className={`border-b hover:bg-muted/30 transition-colors duration-300 h-16 ${
                                token._isUpdated ? 'bg-green-50/30' : ''
                              }`}
                            >
                              {/* Fixed Token Cell */}
                              <td className="sticky left-0 z-10 w-[240px] bg-background border-r shadow-sm">
                                <a
                                  href={`https://pump.fun/coin/${token.token_info.mint}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`block p-3 hover:bg-muted/50 transition-colors duration-200 cursor-pointer ${
                                    token._isUpdated ? 'bg-green-50 border-l-4 border-l-green-500 -ml-3 pl-3' : ''
                                  }`}
                                  title={`Watch ${token.token_info.name || 'token'} live stream on Pump.fun`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground font-mono w-6">
                                      #{index + 1}
                                    </span>
                                    <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                                      {token.token_info.image_uri ? (
                                        <img 
                                          src={token.token_info.image_uri} 
                                          alt={token.token_info.symbol}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                          }}
                                        />
                                      ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                          {token.token_info.symbol?.charAt(0) || '?'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium truncate text-sm">
                                        {token.token_info.name || 'Unnamed Token'}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        ${token.token_info.symbol || 'UNKNOWN'}
                                      </div>
                                    </div>
                                  </div>
                                </a>
                              </td>
                              
                              {/* Graph */}
                              <td className="w-[80px] p-2 text-center">
                                <div className="h-8 w-12 bg-muted/30 rounded flex items-center justify-center text-[10px] text-muted-foreground mx-auto">
                                  Chart
                                </div>
                              </td>
                              
                              {/* Age */}
                              <td className="w-[70px] p-2 text-center">
                                <span className="text-xs">
                                  {token.creator_info.created_formatted || 'Unknown'}
                                </span>
                              </td>
                              
                              {/* MCAP */}
                              <td className="w-[90px] p-2 text-center">
                                <AnimatedNumber
                                  value={parseMarketCap(token.market_data.usd_market_cap)}
                                  previousValue={token._previousValues?.usd_market_cap ? parseMarketCap(token._previousValues.usd_market_cap) : undefined}
                                  formatFn={formatMarketCap}
                                  className="text-xs font-medium"
                                  duration={1200}
                                />
                              </td>
                              
                              {/* ATH */}
                              <td className="w-[80px] p-2">
                                <div className="flex flex-col items-center justify-center space-y-1">
                                  <AnimatedNumber
                                    value={parseMarketCap(token.market_data.ath || '0')}
                                    previousValue={token._previousValues?.ath ? parseMarketCap(token._previousValues.ath) : undefined}
                                    formatFn={formatMarketCap}
                                    className="text-xs font-medium text-white"
                                    duration={1200}
                                  />
                                  {token.market_data.ath && token.market_data.progress_percentage && (
                                    <div className="w-full px-1">
                                      <AnimatedProgress
                                        value={token.market_data.progress_percentage}
                                        previousValue={token._previousValues?.progress_percentage}
                                        duration={1500}
                                        className="w-full"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Volume */}
                              <td className="w-[80px] p-2 text-center">
                                <AnimatedNumber
                                  value={token.trading_info[`volume_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                                  previousValue={token._previousValues?.[`volume_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                                  formatFn={formatVolume}
                                  className="text-xs"
                                  duration={1000}
                                />
                              </td>
                              
                              {/* Transactions */}
                              <td className="w-[70px] p-2 text-center">
                                <AnimatedNumber
                                  value={token.trading_info[`txns_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                                  previousValue={token._previousValues?.[`txns_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                                  formatFn={(value: number) => value.toLocaleString()}
                                  className="text-xs"
                                  duration={1000}
                                />
                              </td>
                              
                              {/* Traders */}
                              <td className="w-[80px] p-2 text-center">
                                <AnimatedNumber
                                  value={token.trading_info[`traders_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                                  previousValue={token._previousValues?.[`traders_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                                  formatFn={(value: number) => value.toLocaleString()}
                                  className="text-xs"
                                  duration={1000}
                                />
                              </td>
                              
                              {/* Price Change */}
                              <td className="w-[90px] p-2 text-center">
                                <AnimatedPercentage
                                  value={token.trading_info[`price_change_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                                  previousValue={token._previousValues?.[`price_change_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                                  className="text-xs"
                                  duration={1000}
                                />
                              </td>
                              
                              {/* Viewers */}
                              <td className="w-[60px] p-2 text-center">
                                <AnimatedNumber
                                  value={token.activity_info.viewers || 0}
                                  previousValue={token._previousValues?.viewers}
                                  formatFn={(value: number) => value.toLocaleString()}
                                  className="text-xs"
                                  duration={1000}
                                />
                              </td>
                              
                              {/* Creator */}
                              <td className="w-[100px] p-2 text-center">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {token.creator_info.creator ? 
                                      `${token.creator_info.creator.slice(0, 4)}...${token.creator_info.creator.slice(-4)}` 
                                      : 'Unknown'}
                                  </span>
                                  {persistentSort.sortBy === 'creator' && (
                                    <span className="text-[8px] px-1 py-0.5 bg-blue-500/20 text-blue-600 rounded-full border border-blue-500/30">
                                      {getCreatorCount(token.creator_info.creator || 'Unknown')} tokens
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              {/* GMGN Link */}
                              <td className="w-[80px] p-2 text-center">
                                <a
                                  href={`https://gmgn.ai/sol/token/${token.token_info.mint}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-600 text-[10px] font-medium transition-colors duration-200 truncate block"
                                  title={`View ${token.token_info.symbol || 'token'} on GMGN`}
                                >
                                  gmgn.ai
                                </a>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
