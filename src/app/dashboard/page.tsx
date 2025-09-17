"use client"
export const runtime = 'edge'


import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { executeBuyTransaction, executeSellTransaction, callVibeRpc } from '@/lib/solana'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWebsocket } from "@/hooks/use-websocket"
import { useTokenSorting } from "@/hooks/useTokenSorting"
import { useTokenFiltering } from "@/hooks/useTokenFiltering"
import { useSolBalance } from "@/hooks/useSolBalance"
import { LiveToken } from "@/types/token.types"
import { TableHeader } from "../../components/TableHeader"
import { TokenTableRow } from "../../components/TokenTableRow"
import { PaginationControls } from "../../components/PaginationControls"
import { SolBalanceSidebar } from "../../components/SolBalanceSidebar"

// Audio Context Hook
const useAudioContext = () => {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const isUnlockedRef = useRef<boolean>(false)
  
  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = async () => {
      try {
        const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!AudioCtxClass || audioCtxRef.current) return
        
        audioCtxRef.current = new AudioCtxClass()

        // Try to resume immediately if possible (guard for null)
        const ctx = audioCtxRef.current
        if (ctx && ctx.state === 'suspended') {
          await ctx.resume()
        }
        
        isUnlockedRef.current = true
      } catch (error) {
        console.warn('Could not initialize audio context:', error)
      }
    }

    // Set up listeners for user gestures
    const handleUserGesture = () => {
      if (!isUnlockedRef.current) {
        initAudio()
      }
    }

    // Listen for any user interaction
    document.addEventListener('click', handleUserGesture, { once: true })
    document.addEventListener('keydown', handleUserGesture, { once: true })
    document.addEventListener('touchstart', handleUserGesture, { once: true })

    return () => {
      document.removeEventListener('click', handleUserGesture)
      document.removeEventListener('keydown', handleUserGesture)
      document.removeEventListener('touchstart', handleUserGesture)
    }
  }, [])

  const playSound = useCallback((frequency = 880, duration = 0.14, volume = 0.08) => {
    try {
      if (!audioCtxRef.current || !isUnlockedRef.current) {
        console.log('Audio context not ready, trying fallback...')
        // Fallback to simple audio element
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmocBzuR1/LNeSsFJH')
        audio.volume = volume
        audio.play().catch(() => {})
        return
      }

      const ctx = audioCtxRef.current
      
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          // Retry playing after resume
          playActualSound(ctx, frequency, duration, volume)
        }).catch(() => {})
        return
      }

      playActualSound(ctx, frequency, duration, volume)
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }, [])

  const playActualSound = (ctx: AudioContext, frequency: number, duration: number, volume: number) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }

  return { playSound, isReady: isUnlockedRef.current }
}

export default function Page() {
  // Use the SSE hook for real-time token data
  const {
    tokens: liveTokens,
    connect: reconnect,
    disconnect,
    isConnected
  } = useWebsocket({
    onTokenUpdate: (tokens) => {
      //console.log('Tokens updated from WebSocket:', tokens.length)
    }
  })

  // Use the sorting hook
  const { persistentSort, saveSortPreferences, sortTokens } = useTokenSorting()
  // Use the filtering hook
  const { persistentFilters, saveFilters, filterTokens } = useTokenFiltering()

  // Use the SOL balance hook
  const { sol: walletSolBalance, error: balanceError } = useSolBalance()

  // Use the audio hook
  const { playSound, isReady } = useAudioContext()

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [uiSelection, setUiSelection] = useState<string>('24h') // UI selection: time period or 'trending'
  const [dataTimePeriod, setDataTimePeriod] = useState<string>('24h') // Actual time period for data display
  const [tokens, setTokens] = useState<LiveToken[]>([])

  // Search state for filtering tokens by symbol, name, or mint
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Keep a ref of previous token mint set to detect newly added tokens
  const prevTokenMintsRef = useRef<Set<string>>(new Set())

  // Simple sound enabled state
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Detect newly live tokens (based on timestamps.created_at within last 20s)
  useEffect(() => {
    try {
      const prevSet = prevTokenMintsRef.current
      const newlyLive: LiveToken[] = []

      // Compute the filtered tokens and sort them by live_since (newest first)
      const filtered = filterTokens(liveTokens)
      const sortedByLiveSince = sortTokens(filtered, { sortBy: 'live_since', sortOrder: 'desc', dataTimePeriod: persistentSort.dataTimePeriod })

      // Consider top N tokens as the "top of the list" for notification matching
      const TOP_N = 6
      const topCandidates = sortedByLiveSince.slice(0, TOP_N)

      try { console.debug('[notify] topCandidates', topCandidates.map(t => ({ mint: t.token_info?.mint, symbol: t.token_info?.symbol }))) } catch (e) {}

      for (const t of topCandidates) {
        const mint = t.token_info?.mint
        if (!mint) continue
        if (!prevSet.has(mint)) {
          newlyLive.push(t)
        }
      }

      if (newlyLive.length > 0) {
        if (soundEnabled) {
          try {
            playSound(880, 0.18, 0.09)
          } catch (err) {}
        }

        try { console.debug('[notify] newlyLive count', newlyLive.length, 'examples', newlyLive.map(x=>({mint: x.token_info?.mint, symbol: x.token_info?.symbol}))) } catch (e) {}

        newlyLive.slice(0, 3).forEach(t => {
          toast.success(
            <div className="flex flex-col gap-1">
              <span>🔔 New live token: {t.token_info.symbol}</span>
              <span className="text-sm text-gray-600">{t.token_info.name}</span>
            </div>
          )
        })
      }

      // Update the previous set of mints
      prevTokenMintsRef.current = new Set(liveTokens.map(t => t.token_info?.mint).filter(Boolean) as string[])
    } catch (e) {
      // swallow errors in notification logic
    }
  }, [liveTokens, playSound, soundEnabled, isReady])

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(48)

  // Reset to first page when sorting changes
  useEffect(() => {
    setCurrentPage(1)
  }, [persistentSort.sortBy, persistentSort.sortOrder, persistentSort.dataTimePeriod])

  // Initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Apply filters first, then sorting for display
  const sortedTokens = useMemo(() => {
    if (liveTokens.length === 0) return liveTokens
    // Apply existing filters
    let filtered = filterTokens(liveTokens)

    // If there's a search query, further filter by symbol, name, or mint (case-insensitive)
    const q = searchQuery.trim().toLowerCase()
    if (q.length > 0) {
      filtered = filtered.filter(t => {
        const symbol = (t.token_info?.symbol || '').toLowerCase()
        const name = (t.token_info?.name || '').toLowerCase()
        const mint = (t.token_info?.mint || '').toLowerCase()
        return symbol.includes(q) || name.includes(q) || mint.includes(q)
      })
    }

    return sortTokens(filtered)
  }, [liveTokens, persistentSort.sortBy, persistentSort.sortOrder, persistentSort.dataTimePeriod, sortTokens, filterTokens])

  // Calculate pagination values
  const totalPages = Math.ceil(sortedTokens.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTokens = sortedTokens.slice(startIndex, endIndex)

  // Reset to first page when tokens change significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  // Get creator count for display purposes
  const getCreatorCount = (creator: string) => {
    return sortedTokens.filter(token => 
      (token.creator_info.creator || 'Unknown') === creator
    ).length
  }

  // Trading handlers with real VibeStation integration
  const [quickSellPercent, setQuickSellPercent] = useState<number | undefined>(undefined)
  const [isTrading, setIsTrading] = useState<boolean>(false)
  const wallet = useWallet()
  const { connection } = useConnection()

  // Read persisted quick sell percent only on the client after mount to avoid
  // server/client markup mismatch (hydration errors).
  useEffect(() => {
    try {
      const v = localStorage.getItem('quickSellPercent')
      if (v) setQuickSellPercent(Number(v))
    } catch (e) {}
  }, [])

  const handleBuy = async (token: LiveToken) => {
    // Ensure wallet is connected
    if (!wallet || !wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your Solana wallet first')
      return
    }

    if (isTrading) {
      toast.error('Please wait for the current transaction to complete')
      return
    }

    // Read buy amount from localStorage (set by sidebar)
    let amountSOL = 0
    try {
      const s = localStorage.getItem('buyAmountSOL')
      amountSOL = s ? Number(s) : 0
    } catch(e) {
      amountSOL = 0
    }

    if (amountSOL <= 0) {
      toast.error('Please set a valid buy amount in the sidebar')
      return
    }

    console.log('Buy requested', token.token_info.symbol, 'amountSOL=', amountSOL)
    setIsTrading(true)

    try {
      // Check wallet SOL balance before attempting transaction
      if (balanceError) {
        toast.error('Unable to fetch wallet balance. Please try again.')
        setIsTrading(false)
        return
      }
      
      if (walletSolBalance < amountSOL) {
        toast.error('Insufficient SOL balance for this buy amount')
        setIsTrading(false)
        return
      }

      // Extract token metadata for better migration detection
      const tokenData = {
        raydiumPool: token.pool_info.raydium_pool,
        pumpSwapPool: (token.raw_data as any)?.pump_swap_pool || null,
        complete: token.pool_info.complete
      }

      const result = await executeBuyTransaction(
        connection, 
        wallet, 
        token.token_info.mint, 
        amountSOL,
        { 
          simulate: true, // Enable simulation for safety
          tokenData
        }
      )

      toast.success(
        <div className="flex flex-col gap-1">
          <span>✅ Successfully bought {token.token_info.symbol}!</span>
          <a 
            href={result.explorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline text-sm"
          >
            View Transaction
          </a>
        </div>
      )

      console.log('Buy successful:', result)
    } catch (e: any) {
      console.error('Buy failed:', e)
      const errorMessage = e?.message || 'Buy transaction failed'
      toast.error(
        <div className="flex flex-col gap-1">
          <span>❌ Buy Failed</span>
          <span className="text-sm text-gray-600">{errorMessage}</span>
        </div>
      )
    } finally {
      setIsTrading(false)
    }
  }

  const handleSell = async (token: LiveToken, percent?: number) => {
    if (!wallet || !wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your Solana wallet first')
      return
    }

    if (isTrading) {
      toast.error('Please wait for the current transaction to complete')
      return
    }

    const sellPercent = typeof percent === 'number' ? percent : (quickSellPercent ?? 25)
    console.log('Sell requested', token.token_info.symbol, 'percent=', sellPercent)
    setIsTrading(true)

    try {
      // Check token balance before attempting transaction
      try {
        const mintPubkey = new PublicKey(token.token_info.mint)
        const associatedTokenAddress = await getAssociatedTokenAddress(
          mintPubkey,
          wallet.publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )

        const tokenBalance = await callVibeRpc('getTokenAccountBalance', [
          associatedTokenAddress.toString(),
          { commitment: 'finalized' }
        ])

        if (!tokenBalance?.value?.amount || BigInt(tokenBalance.value.amount) === BigInt(0)) {
          toast.error('No tokens to sell')
          setIsTrading(false)
          return
        }

        const currentBalance = BigInt(tokenBalance.value.amount)
        const sellAmount = (currentBalance * BigInt(sellPercent)) / BigInt(100)

        if (sellAmount === BigInt(0)) {
          toast.error('Token amount too small to sell at this percentage')
          setIsTrading(false)
          return
        }
      } catch (balErr) {
        console.warn('Failed to fetch token balance, proceeding with caution', balErr)
        // Continue anyway, let the transaction handle it
      }

      // Extract token metadata for better migration detection
      const tokenData = {
        raydiumPool: token.pool_info.raydium_pool,
        pumpSwapPool: (token.raw_data as any)?.pump_swap_pool || null,
        complete: token.pool_info.complete
      }

      const result = await executeSellTransaction(
        connection, 
        wallet, 
        token.token_info.mint, 
        sellPercent,
        { 
          simulate: true, // Enable simulation for safety
          tokenData
        }
      )

      toast.success(
        <div className="flex flex-col gap-1">
          <span>✅ Successfully sold {sellPercent}% of {token.token_info.symbol}!</span>
          <a 
            href={result.explorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline text-sm"
          >
            View Transaction
          </a>
        </div>
      )

      console.log('Sell successful:', result)
    } catch (e: any) {
      console.error('Sell failed:', e)
      const errorMessage = e?.message || 'Sell transaction failed'
      toast.error(
        <div className="flex flex-col gap-1">
          <span>❌ Sell Failed</span>
          <span className="text-sm text-gray-600">{errorMessage}</span>
        </div>
      )
    } finally {
      setIsTrading(false)
    }
  }

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
  }

  const handleTimePeriodChange = (value: string) => {
    setUiSelection(value)
    if (value === 'trending') {
      // Switch to trending sort
      saveSortPreferences('trending', 'desc', dataTimePeriod)
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
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        variant="inset" 
        filters={persistentFilters ?? undefined} 
        onSaveFilters={saveFilters} 
        quickSellPercent={quickSellPercent} 
        onQuickSellChange={(p) => setQuickSellPercent(p)} 
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4">
              {/* Compact Search + Time Period + Connection Status (single row) */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                {/* Search Input */}
                <div className="flex-1 min-w-0">
                  <input
                    aria-label="Search tokens"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by symbol, name, or mint"
                    className="w-full rounded-lg border px-3 py-2 bg-background text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Time Period Tabs - Compact */}
                <div className="flex-shrink-0">
                  <Tabs value={uiSelection} onValueChange={handleTimePeriodChange}>
                    <TabsList className="grid grid-cols-5 bg-background/50 rounded-lg p-1 h-9">
                      <TabsTrigger 
                        value="5m" 
                        className="px-2 py-1 text-xs rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        5M
                      </TabsTrigger>
                      <TabsTrigger 
                        value="1h" 
                        className="px-2 py-1 text-xs rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        1H
                      </TabsTrigger>
                      <TabsTrigger 
                        value="6h" 
                        className="px-2 py-1 text-xs rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        6H
                      </TabsTrigger>
                      <TabsTrigger 
                        value="24h" 
                        className="px-2 py-1 text-xs rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        24H
                      </TabsTrigger>
                      <TabsTrigger 
                        value="trending" 
                        className="px-2 py-1 text-xs rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        TREND
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Connection Status - Compact */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {wallet.connected && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs text-green-700 dark:text-green-400 font-medium">Connected</span>
                    </div>
                  )}

                  {isTrading && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Trading...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Tokens Table with Fixed Token Column */}
              <div className="border rounded-lg overflow-hidden table-shadow table-border bg-background">
                <div className="relative overflow-hidden">
                  {/* Table Container with Synchronized Scrolling */}
                  <div className="max-h-[75vh] overflow-auto scrollbar-thin">
                    <table className="w-full">
                      {/* Table Header */}
                      <TableHeader 
                        persistentSort={persistentSort} 
                        onSortToggle={handleSortToggle} 
                      />
                      
                      {/* Table Body */}
                      <tbody>
                        {isLoading ? (
                          Array.from({ length: itemsPerPage }, (_, i) => (
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
                              
                              {/* Scrollable Skeleton Cells */}
                              {Array.from({ length: 11 }, (_, cellIndex) => (
                                <td key={cellIndex} className="p-2 text-center">
                                  <div className="h-3 w-8 bg-muted rounded mx-auto"></div>
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          currentTokens.map((token, index) => (
                            <TokenTableRow
                              key={token.token_info.mint}
                              token={token}
                              index={index}
                              startIndex={startIndex}
                              dataTimePeriod={dataTimePeriod}
                              persistentSort={persistentSort}
                              getCreatorCount={getCreatorCount}
                              onBuy={handleBuy}
                              onSell={handleSell}
                              selectedQuickSellPercent={quickSellPercent}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalTokens={sortedTokens.length}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
       <SolBalanceSidebar />
    </SidebarProvider>
  )
}