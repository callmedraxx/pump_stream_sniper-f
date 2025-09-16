"use client"

import { useEffect, useState, useMemo } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useWebsocket } from "@/hooks/use-websocket"
import { useTokenSorting } from "@/hooks/useTokenSorting"
import { useTokenFiltering } from "@/hooks/useTokenFiltering"
import { useSolBalance } from "@/hooks/useSolBalance"
import { LiveToken } from "@/types/token.types"
import { TableHeader } from "../../components/TableHeader"
import { TokenTableRow } from "../../components/TokenTableRow"
import { PaginationControls } from "../../components/PaginationControls"
import { SolBalanceSidebar } from "../../components/SolBalanceSidebar"

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

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [uiSelection, setUiSelection] = useState<string>('24h') // UI selection: time period or 'trending'
  const [dataTimePeriod, setDataTimePeriod] = useState<string>('24h') // Actual time period for data display
  const [tokens, setTokens] = useState<LiveToken[]>([])

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
    const filtered = filterTokens(liveTokens)
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
              {/* Connection Status */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  {wallet.connected && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 ml-4" />
                      <span className="text-sm text-muted-foreground">
                        Wallet: Connected
                      </span>
                    </>
                  )}
                </div>
                {isTrading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                    <span className="text-sm text-blue-500">Processing transaction...</span>
                  </div>
                )}
              </div>
              {/* Time Period Selector */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                <Tabs value={uiSelection} onValueChange={handleTimePeriodChange} className="flex-1">
                  <TabsList className="grid w-full max-w-md grid-cols-5">
                    <TabsTrigger value="5m">5M</TabsTrigger>
                    <TabsTrigger value="1h">1H</TabsTrigger>
                    <TabsTrigger value="6h">6H</TabsTrigger>
                    <TabsTrigger value="24h">24H</TabsTrigger>
                    <TabsTrigger value="trending">TRENDING</TabsTrigger>
                  </TabsList>
                </Tabs>
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