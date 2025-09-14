"use client"

import { useEffect, useState, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { TokenDebugPanel } from "@/components/token-debug-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { useWebsocket } from "@/hooks/use-websocket"
import { useTokenSorting } from "@/hooks/useTokenSorting"
import { useTokenFiltering } from "@/hooks/useTokenFiltering"
import { LiveToken } from "@/types/token.types"
import { TableHeader } from "../../components/TableHeader"
import { TokenTableRow } from "../../components/TokenTableRow"
import { PaginationControls } from "../../components/PaginationControls"

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

  // Trading handlers (UI wiring)
  const [quickSellPercent, setQuickSellPercent] = useState<number | undefined>(undefined)

  // Read persisted quick sell percent only on the client after mount to avoid
  // server/client markup mismatch (hydration errors).
  useEffect(() => {
    try {
      const v = localStorage.getItem('quickSellPercent')
      if (v) setQuickSellPercent(Number(v))
    } catch (e) {}
  }, [])

  const handleBuy = (token: LiveToken) => {
    // Read buy amount from localStorage (set by sidebar) as a quick wiring point
    let amountSOL = 0
    try {
      const s = localStorage.getItem('buyAmountSOL')
      amountSOL = s ? Number(s) : 0
    } catch(e) {
      amountSOL = 0
    }
    console.log('Buy requested', token.token_info.symbol, 'amountSOL=', amountSOL)
    // TODO: integrate with wallet + prepareBuyTransaction
  }

  const handleSell = (token: LiveToken, percent?: number) => {
    const p = typeof percent === 'number' ? percent : (quickSellPercent ?? 25)
    console.log('Sell requested', token.token_info.symbol, 'percent=', p)
    // TODO: integrate with wallet + prepareSellTransaction
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
  <AppSidebar variant="inset" filters={persistentFilters ?? undefined} onSaveFilters={saveFilters} quickSellPercent={quickSellPercent} onQuickSellChange={(p) => setQuickSellPercent(p)} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4">
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
      
      {/* Debug Panel
      <TokenDebugPanel 
        tokens={tokens}
        isConnected={isConnected}
        lastUpdate={lastUpdate}
      /> */}
    </SidebarProvider>
  )
}