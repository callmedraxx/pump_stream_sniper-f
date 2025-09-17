import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { LiveToken } from '@/types/token.types'
import { AnimatedNumber, AnimatedPercentage } from '@/components/animated-number'
import { AnimatedProgress } from '@/components/animated-progress'
import { formatMarketCap, formatVolume, parseMarketCap } from '@/utils/format.utils'
import { TokenImage } from './TokenImage'
import { LiveAge } from './LiveAge'
import { LiveSince } from './LiveSince'

interface TokenBoxProps {
  token: LiveToken
  dataTimePeriod: string
  onBuy?: (token: LiveToken) => void
  onSell?: (token: LiveToken, percent: number) => void
  selectedQuickSellPercent?: number
  rank: number
}

const TokenBox: React.FC<TokenBoxProps> = ({
  token,
  dataTimePeriod,
  onBuy,
  onSell,
  selectedQuickSellPercent,
  rank
}) => {
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 group">
      <CardContent className="p-4">
        {/* Header with rank and image */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              #{rank}
            </span>
            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {token.token_info.image_uri ? (
                <TokenImage
                  src={token.token_info.image_uri}
                  alt={token.token_info.symbol}
                  symbol={token.token_info.symbol}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {token.token_info.symbol?.charAt(0) || '?'}
                </div>
              )}
            </div>
          </div>
          
          {/* Live indicator */}
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-700 dark:text-green-400">LIVE</span>
          </div>
        </div>

        {/* Token Info */}
        <div className="mb-3">
          <h3 className="font-semibold text-sm truncate mb-1">
            {token.token_info.name || 'Unnamed Token'}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            ${token.token_info.symbol || 'UNKNOWN'}
          </p>
          
          {/* Age and Live Since */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <div>
              Age: <LiveAge createdFormatted={token.creator_info.created_formatted || 'Unknown'} />
            </div>
            <div>
              Live: <LiveSince createdFormatted={token.timestamps?.created_at} />
            </div>
          </div>
        </div>

        {/* Market Data */}
        <div className="space-y-2 mb-4">
          {/* Market Cap and ATH */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">MCAP</span>
            <AnimatedNumber
              value={parseMarketCap(token.market_data.usd_market_cap)}
              previousValue={token._previousValues?.usd_market_cap ? parseMarketCap(token._previousValues.usd_market_cap) : undefined}
              formatFn={formatMarketCap}
              className="text-xs font-medium"
              duration={1200}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">ATH</span>
            <div className="flex items-center gap-2">
              <AnimatedNumber
                value={parseMarketCap(token.market_data.ath || '0')}
                previousValue={token._previousValues?.ath ? parseMarketCap(token._previousValues.ath) : undefined}
                formatFn={formatMarketCap}
                className="text-xs font-medium"
                duration={1200}
              />
            </div>
          </div>

          {/* Progress bar for ATH */}
          {token.market_data.ath && token.market_data.progress_percentage && (
            <div className="w-full">
              <AnimatedProgress
                value={token.market_data.progress_percentage}
                previousValue={token._previousValues?.progress_percentage}
                duration={1500}
                className="w-full h-2"
              />
            </div>
          )}

          {/* Trading Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vol:</span>
              <AnimatedNumber
                value={token.trading_info[`volume_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                previousValue={token._previousValues?.[`volume_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                formatFn={formatVolume}
                duration={1000}
              />
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Txns:</span>
              <AnimatedNumber
                value={token.trading_info[`txns_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                previousValue={token._previousValues?.[`txns_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                formatFn={(value: number) => value.toLocaleString()}
                duration={1000}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Traders:</span>
              <AnimatedNumber
                value={token.trading_info[`traders_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                previousValue={token._previousValues?.[`traders_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                formatFn={(value: number) => value.toLocaleString()}
                duration={1000}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Change:</span>
              <AnimatedPercentage
                value={token.trading_info[`price_change_${dataTimePeriod}` as keyof typeof token.trading_info] as number || 0}
                previousValue={token._previousValues?.[`price_change_${dataTimePeriod}` as keyof typeof token._previousValues] as number}
                duration={1000}
              />
            </div>
          </div>

          {/* Viewers and Activity */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Viewers</span>
            <div className="flex items-center gap-2">
              <AnimatedNumber
                value={token.activity_info.viewers || 0}
                previousValue={token._previousValues?.viewers}
                formatFn={(value: number) => value.toLocaleString()}
                className="text-xs font-medium"
                duration={1000}
              />
              <AnimatedNumber
                value={token.pool_info.reply_count || 0}
                previousValue={token._previousValues?.reply_count}
                formatFn={(value: number) => `${value}💬`}
                className="text-xs text-muted-foreground"
                duration={1000}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            onClick={() => onBuy?.(token)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
          >
            Buy
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onSell?.(token, selectedQuickSellPercent ?? 25)}
            className="flex-1 h-8"
          >
            Sell {selectedQuickSellPercent ?? 25}%
          </Button>
        </div>

        {/* Links */}
        <div className="flex gap-2">
          <a
            href={`https://pump.fun/coin/${token.token_info.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs text-blue-500 hover:text-blue-600 py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          >
            Pump.fun
          </a>
          <a
            href={`https://gmgn.ai/sol/token/${token.token_info.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs text-purple-500 hover:text-purple-600 py-1 px-2 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
          >
            GMGN
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

interface SectionProps {
  title: string
  tokens: LiveToken[]
  dataTimePeriod: string
  onBuy?: (token: LiveToken) => void
  onSell?: (token: LiveToken, percent: number) => void
  selectedQuickSellPercent?: number
  searchPlaceholder?: string
}

const TokenSection: React.FC<SectionProps> = ({
  title,
  tokens,
  dataTimePeriod,
  onBuy,
  onSell,
  selectedQuickSellPercent,
  searchPlaceholder = "Search tokens..."
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens
    
    const query = searchQuery.toLowerCase().trim()
    return tokens.filter(token => {
      const symbol = (token.token_info?.symbol || '').toLowerCase()
      const name = (token.token_info?.name || '').toLowerCase()
      const mint = (token.token_info?.mint || '').toLowerCase()
      return symbol.includes(query) || name.includes(query) || mint.includes(query)
    })
  }, [tokens, searchQuery])

  const totalPages = Math.ceil(filteredTokens.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentTokens = filteredTokens.slice(startIndex, startIndex + itemsPerPage)

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {filteredTokens.length} tokens
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-3 min-h-[600px]">
        {currentTokens.map((token, index) => (
          <TokenBox
            key={token.token_info.mint}
            token={token}
            dataTimePeriod={dataTimePeriod}
            onBuy={onBuy}
            onSell={onSell}
            selectedQuickSellPercent={selectedQuickSellPercent}
            rank={startIndex + index + 1}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTokens.length)} of {filteredTokens.length}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm px-2">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface BoxedViewLayoutProps {
  liveTokens: LiveToken[]
  dataTimePeriod: string
  onBuy?: (token: LiveToken) => void
  onSell?: (token: LiveToken, percent: number) => void
  selectedQuickSellPercent?: number
  sortTokens: (tokens: LiveToken[], overridePrefs?: any) => LiveToken[]
  filterTokens: (tokens: LiveToken[]) => LiveToken[]
}

export const BoxedViewLayout: React.FC<BoxedViewLayoutProps> = ({
  liveTokens,
  dataTimePeriod,
  onBuy,
  onSell,
  selectedQuickSellPercent,
  sortTokens,
  filterTokens
}) => {
  // Apply base filtering first
  const baseFilteredTokens = useMemo(() => {
    return filterTokens(liveTokens)
  }, [liveTokens, filterTokens])

  // Section 1: Latest Live Tokens (sorted by live_since, newest first)
  const latestTokens = useMemo(() => {
    return sortTokens(baseFilteredTokens, { sortBy: 'live_since', sortOrder: 'desc', dataTimePeriod })
  }, [baseFilteredTokens, sortTokens, dataTimePeriod])

  // Section 2: Top by Market Cap (sorted by mcap, highest first)
  const topMarketCapTokens = useMemo(() => {
    return sortTokens(baseFilteredTokens, { sortBy: 'mcap', sortOrder: 'desc', dataTimePeriod })
  }, [baseFilteredTokens, sortTokens, dataTimePeriod])

  // Section 3: Migrated Tokens Only (filtered for migrated, sorted by live_since)
  const migratedTokens = useMemo(() => {
    // Filter only migrated tokens (those with complete: true or raydium_pool)
    const migrated = baseFilteredTokens.filter(token => 
      token.pool_info.complete || token.pool_info.raydium_pool
    )
    return sortTokens(migrated, { sortBy: 'live_since', sortOrder: 'desc', dataTimePeriod })
  }, [baseFilteredTokens, sortTokens, dataTimePeriod])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Latest Live Tokens Section */}
      <TokenSection
        title="New Live"
        tokens={latestTokens}
        dataTimePeriod={dataTimePeriod}
        onBuy={onBuy}
        onSell={onSell}
        selectedQuickSellPercent={selectedQuickSellPercent}
        searchPlaceholder="Search new tokens..."
      />

      {/* Top Market Cap Section */}
      <TokenSection
        title="Market Cap"
        tokens={topMarketCapTokens}
        dataTimePeriod={dataTimePeriod}
        onBuy={onBuy}
        onSell={onSell}
        selectedQuickSellPercent={selectedQuickSellPercent}
        searchPlaceholder="Search by market cap..."
      />

      {/* Migrated Tokens Section */}
      <TokenSection
        title="Migrated"
        tokens={migratedTokens}
        dataTimePeriod={dataTimePeriod}
        onBuy={onBuy}
        onSell={onSell}
        selectedQuickSellPercent={selectedQuickSellPercent}
        searchPlaceholder="Search migrated tokens..."
      />
    </div>
  )
}