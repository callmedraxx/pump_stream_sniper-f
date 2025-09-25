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
import { Button } from "@/components/ui/button"
import { Table, Grid3X3 } from "lucide-react"
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTokens } from '@/hooks/useTokens'
import { useTokenSorting } from "@/hooks/useTokenSorting"
import { useTokenFiltering } from "@/hooks/useTokenFiltering"
import { useSolBalance } from "@/hooks/useSolBalance"
import { LiveToken } from "@/types/token.types"
import { applyNotificationFilters } from "@/utils/filter.utils"
import { TableHeader } from "../../components/TableHeader"
import { TokenTableRow } from "../../components/TokenTableRow"
import { PaginationControls } from "../../components/PaginationControls"
import { SolBalanceSidebar } from "../../components/SolBalanceSidebar"
import { BoxedViewLayout } from "../../components/BoxedViewLayout"
import { useUIStore } from "../../stores/uiStore"

// Audio Context Hook (same as before)
const useAudioContext = () => {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const isUnlockedRef = useRef<boolean>(false)
  
  useEffect(() => {
    const initAudio = async () => {
      try {
        const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!AudioCtxClass || audioCtxRef.current) return
        
        audioCtxRef.current = new AudioCtxClass()

        const ctx = audioCtxRef.current
        if (ctx && ctx.state === 'suspended') {
          await ctx.resume()
        }
        
        isUnlockedRef.current = true
      } catch (error) {
        console.warn('Could not initialize audio context:', error)
      }
    }

    const handleUserGesture = () => {
      if (!isUnlockedRef.current) {
        initAudio()
      }
    }

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
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmocBzuR1/LNeSsFJH')
        audio.volume = volume
        audio.play().catch(() => {})
        return
      }

      const ctx = audioCtxRef.current
      
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
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
  // Use TanStack Query for tokens
  const { data: liveTokens = [] } = useTokens()

  // Use Zustand for UI state
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
  } = useUIStore()

  // All existing hooks and state (same as before)
  const { persistentSort, saveSortPreferences, sortTokens } = useTokenSorting()
  const { persistentFilters, saveFilters, filterTokens } = useTokenFiltering()
  const { sol: walletSolBalance, error: balanceError } = useSolBalance()
  const { playSound, isReady } = useAudioContext()

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [uiSelection, setUiSelection] = useState<string>('24h')
  const [dataTimePeriod, setDataTimePeriod] = useState<string>('24h')
  const [tokens, setTokens] = useState<LiveToken[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [quickSellPercent, setQuickSellPercent] = useState<number | undefined>(undefined)
  const [isTrading, setIsTrading] = useState<boolean>(false)

  // Refs for virtualization and notifications
  const prevTokenMintsRef = useRef<Set<string>>(new Set())
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const wallet = useWallet()
  const { connection } = useConnection()
  useEffect(() => {
    try {
      const savedViewMode = localStorage.getItem('viewMode')
      if (savedViewMode === 'boxed' || savedViewMode === 'table') {
        setViewMode(savedViewMode)
      }
    } catch (e) {
      console.warn('Failed to load view mode preference:', e)
    }
  }, [setViewMode])

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: 'table' | 'boxed') => {
    setViewMode(mode)
    try {
      localStorage.setItem('viewMode', mode)
    } catch (e) {
      console.warn('Failed to save view mode preference:', e)
    }
  }

  // Load persisted quick sell percent
  useEffect(() => {
    try {
      const v = localStorage.getItem('quickSellPercent')
      if (v) setQuickSellPercent(Number(v))
    } catch (e) {}
  }, [])

  // Notification logic for newly live tokens
  useEffect(() => {
    try {
      const prevSet = prevTokenMintsRef.current
      const newlyLive: LiveToken[] = []

      // Check all tokens for new ones, not just top N
      for (const t of liveTokens) {
        const mint = t.mint_address
        if (!mint) continue
        if (!prevSet.has(mint)) {
          // Check if this token passes notification filters
          if (applyNotificationFilters(t, persistentFilters)) {
            newlyLive.push(t)
          }
        }
      }

      if (newlyLive.length > 0) {
        if (soundEnabled) {
          try {
            playSound(880, 0.18, 0.09)
          } catch (err) {}
        }

        newlyLive.slice(0, 3).forEach(t => {
          toast.success(
            <div className="flex flex-col gap-1">
              <span>🔔 New live token: {t.symbol}</span>
              <span className="text-sm text-gray-600">{t.name}</span>
            </div>
          )
        })
      }

      prevTokenMintsRef.current = new Set(liveTokens.map(t => t.mint_address).filter(Boolean) as string[])
    } catch (e) {
      // swallow errors in notification logic
    }
  }, [liveTokens, playSound, soundEnabled, isReady, persistentFilters])

  // Reset to first page when sorting changes (table view only)
  useEffect(() => {
    if (viewMode === 'table') {
      setCurrentPage(1)
    }
  }, [persistentSort.sortBy, persistentSort.sortOrder, persistentSort.dataTimePeriod, viewMode])

  // Initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Apply filters and sorting for table view
  const sortedTokens = useMemo(() => {
    if (liveTokens.length === 0) return liveTokens
    let filtered = filterTokens(liveTokens)

    // Search filter (only for table view)
    if (viewMode === 'table') {
      const q = searchQuery.trim().toLowerCase()
      if (q.length > 0) {
        filtered = filtered.filter(t => {
          const symbol = (t.symbol || '').toLowerCase()
          const name = (t.name || '').toLowerCase()
          const mint = (t.mint_address || '').toLowerCase()
          return symbol.includes(q) || name.includes(q) || mint.includes(q)
        })
      }
    }

    return sortTokens(filtered)
  }, [liveTokens, persistentSort.sortBy, persistentSort.sortOrder, persistentSort.dataTimePeriod, sortTokens, filterTokens, searchQuery, viewMode])

  // Calculate pagination values (table view only)
  const totalPages = Math.ceil(sortedTokens.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentTokens = sortedTokens.slice(startIndex, endIndex)



  // Reset to first page when tokens change significantly (table view only)
  useEffect(() => {
    if (viewMode === 'table' && currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages, viewMode])

  const getCreatorCount = (creator: string) => {
    return sortedTokens.filter(token => 
      (token.creator || 'Unknown') === creator
    ).length
  }

  // Trading handlers (same as before)
  const handleBuy = async (token: LiveToken) => {
    if (!wallet || !wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your Solana wallet first')
      return
    }

    if (isTrading) {
      toast.error('Please wait for the current transaction to complete')
      return
    }

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

  console.log('Buy requested', token.symbol, 'amountSOL=', amountSOL)
    setIsTrading(true)

    try {
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

      const tokenData = {
        raydiumPool: token.raydium_pool,
        pumpSwapPool: (token.raw_data as any)?.pump_swap_pool || null,
        complete: token.complete
      }

      const result = await executeBuyTransaction(
        connection, 
        wallet, 
        token.mint_address, 
        amountSOL,
        { 
          simulate: true,
          tokenData
        }
      )

      toast.success(
        <div className="flex flex-col gap-1">
            <span>✅ Successfully bought {token.symbol}!</span>
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
  console.log('Sell requested', token.symbol, 'percent=', sellPercent)
    setIsTrading(true)

    try {
      try {
  const mintPubkey = new PublicKey(token.mint_address)
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
      }

      const tokenData = {
        raydiumPool: token.raydium_pool,
        pumpSwapPool: (token.raw_data as any)?.pump_swap_pool || null,
        complete: token.complete
      }

      const result = await executeSellTransaction(
        connection, 
        wallet, 
        token.mint_address, 
        sellPercent,
        { 
          simulate: true,
          tokenData
        }
      )

      toast.success(
        <div className="flex flex-col gap-1">
          <span>✅ Successfully sold {sellPercent}% of {token.symbol}!</span>
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
      newSortOrder = persistentSort.sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      newSortOrder = ['age', 'symbol'].includes(column) ? 'asc' : 'desc'
    }

    saveSortPreferences(column, newSortOrder, dataTimePeriod)
  }

  const handleTimePeriodChange = (value: string) => {
    setUiSelection(value)
    if (value === 'trending') {
      saveSortPreferences('trending', 'desc', dataTimePeriod)
    } else {
      const newTimePeriod = value
      setDataTimePeriod(newTimePeriod)
      
      let newSortBy = persistentSort.sortBy
      if (persistentSort.sortBy === 'trending') {
        newSortBy = 'age'
      }
      
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
              {/* Enhanced Controls Row */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    onClick={() => handleViewModeChange('table')}
                    className="h-9 px-3"
                  >
                    <Table className="h-4 w-4 mr-1" />
                    Table
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'boxed' ? 'default' : 'outline'}
                    onClick={() => handleViewModeChange('boxed')}
                    className="h-9 px-3"
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Boxes
                  </Button>
                </div>

                {/* Search Input - Only show in table view */}
                {viewMode === 'table' && (
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
                )}

                {/* Time Period Tabs */}
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

                {/* Connection Status */}
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

              {/* Content Area - Conditional Rendering */}
              {viewMode === 'table' ? (
                <div className="border rounded-lg overflow-hidden table-shadow table-border bg-background">
                  <div className="relative overflow-hidden">
                    <div className="max-h-[75vh] overflow-auto scrollbar-thin">
                      <table className="w-full">
                        <TableHeader 
                          persistentSort={persistentSort} 
                          onSortToggle={handleSortToggle} 
                        />
                        
                        <tbody>
                          {isLoading ? (
                            Array.from({ length: pageSize }, (_, i) => (
                              <tr key={i} className="border-b animate-pulse h-16">
                                <td className="sticky left-0 z-10 w-[240px] p-3 bg-background border-r shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted"></div>
                                    <div className="flex-1">
                                      <div className="h-4 bg-muted rounded mb-1"></div>
                                      <div className="h-3 bg-muted/70 rounded w-16"></div>
                                    </div>
                                  </div>
                                </td>
                                
                                {Array.from({ length: 18 }, (_, cellIndex) => (
                                  <td key={cellIndex} className="p-2 text-center">
                                    <div className="h-3 w-8 bg-muted rounded mx-auto"></div>
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            currentTokens.map((token, index) => (
                              <TokenTableRow
                                key={`${token.mint_address}-${token._updatedAt || 0}`}
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

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalTokens={sortedTokens.length}
                    onPageChange={setCurrentPage}
                  />
                </div>
              ) : (
                /* Boxed View */
                <BoxedViewLayout
                  liveTokens={liveTokens}
                  dataTimePeriod={dataTimePeriod}
                  onBuy={handleBuy}
                  onSell={handleSell}
                  selectedQuickSellPercent={quickSellPercent}
                  sortTokens={sortTokens}
                  filterTokens={filterTokens}
                />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
      <SolBalanceSidebar />
    </SidebarProvider>
  )
}