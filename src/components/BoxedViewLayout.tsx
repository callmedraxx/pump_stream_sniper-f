import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { LiveToken } from '@/types/token.types'
import { AnimatedNumber, AnimatedPercentage } from '@/components/animated-number'
import { AnimatedProgress } from '@/components/animated-progress'
import { formatMarketCap, formatVolume, parseMarketCap } from '@/utils/format.utils'
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
    <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20 group rounded-2xl">
      <CardContent className="p-3">
        {/* Header with rank and image */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              #{rank}
            </span>
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {token.token_info.image_uri ? (
                <img
                  src={token.token_info.image_uri}
                  alt={token.token_info.symbol}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="fallback h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {token.token_info.symbol?.charAt(0) || '?'}
              </div>
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
          <p className="text-[12px] text-muted-foreground mb-2 flex items-center gap-2">
            <span className="truncate">${token.token_info.symbol || 'UNKNOWN'}</span>
            {token.token_info.mint && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  try { navigator.clipboard.writeText(token.token_info.mint) } catch (err) {}
                }}
                className="text-[10px] px-2 py-1 rounded bg-muted/20 hover:bg-muted/30"
                title="Copy mint"
              >
                {token.token_info.mint.slice(0,8)}...{token.token_info.mint.slice(-6)}
              </button>
            )}
          </p>
          
          {/* Age and Live Since */}
          <div className="flex justify-between text-[12px] text-muted-foreground mb-2">
            <div>
              Age: <LiveAge createdFormatted={token.creator_info.created_formatted || 'Unknown'} />
            </div>
            <div>
              Live: <LiveSince createdFormatted={token.timestamps?.created_at} />
            </div>
          </div>
        </div>

        {/* Market Data */}
  <div className="space-y-1 mb-3">
          {/* Market Cap and ATH */}
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">MCAP</span>
            <AnimatedNumber
              value={parseMarketCap(token.market_data.usd_market_cap)}
              previousValue={token._previousValues?.usd_market_cap ? parseMarketCap(token._previousValues.usd_market_cap) : undefined}
              formatFn={formatMarketCap}
              className="text-[12px] font-medium"
              duration={1200}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">ATH</span>
            <div className="flex items-center gap-2">
              <AnimatedNumber
                value={parseMarketCap(token.market_data.ath || '0')}
                previousValue={token._previousValues?.ath ? parseMarketCap(token._previousValues.ath) : undefined}
                formatFn={formatMarketCap}
                className="text-[12px] font-medium"
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
                className="w-full h-1.5"
                currentMcap={parseFloat(token.market_data.usd_market_cap || '0')}
                athMcap={parseFloat(token.market_data.ath || '0')}
              />
            </div>
          )}

          {/* Trading Stats */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
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

          {/* Small sparkline chart */}
          <div className="mt-2 flex justify-center">
            {(() => {
              const rawCandles = (token.trading_info as any)?.candle_data ?? (token.raw_data as any)?.candle_data
              if (!rawCandles || !Array.isArray(rawCandles) || rawCandles.length === 0) {
                return <div className="h-8 w-24 bg-muted/30 rounded flex items-center justify-center text-[10px] text-muted-foreground">No chart</div>
              }

              const data = rawCandles.map((c: any) => {
                if (c == null) return 0
                if (typeof c === 'number') return c
                const close = c.close ?? c[4] ?? 0
                const n = parseFloat(String(close))
                return isNaN(n) ? 0 : n
              })

              const w = 160
              const h = 44
              const pad = 4
              const len = data.length
              const min = Math.min(...data)
              const max = Math.max(...data)
              const range = max === min ? 1 : max - min
              const step = len > 1 ? (w - pad * 2) / (len - 1) : 0
              const points = data.map((v: number, i: number) => {
                const x = pad + i * step
                const y = pad + (1 - (v - min) / range) * (h - pad * 2)
                return `${x.toFixed(2)},${y.toFixed(2)}`
              }).join(' ')
              const stroke = token._isUpdated ? '#16a34a' : '#7c3aed'
              return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block rounded">
                  <polyline
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={points}
                  />
                </svg>
              )
            })()}
          </div>

          {/* Viewers and Activity */}
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted-foreground">Viewers</span>
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

          {/* Dev Activity summary (buy/sell, amounts, since) */}
          <div className="mt-2 text-[12px]">
            {(() => {
              const dev = (token.activity_info as any)?.dev_activity ?? (token.raw_data as any)?.dev_activity
              if (!dev) return <div className="text-muted-foreground text-[12px]">No dev activity</div>
              const isBuy = dev.type === 'buy'
              const amountSOL = dev.amountSOL ?? dev.amountSol ?? dev.amount_sol ?? 0
              const amountUSD = dev.amountUSD ?? dev.amountUsd ?? dev.amount_usd ?? 0
                      return (
                        <div className="grid grid-cols-3 gap-1 items-center">
                          <div className="col-span-1">
                            <div className="text-[11px] font-medium">{isBuy ? 'Dev Buy' : 'Dev Sell'}</div>
                            <div className="text-[11px] text-muted-foreground"><LiveSince createdFormatted={dev.timestamp || dev.time || dev.ts} /></div>
                          </div>
                          <div className="col-span-1">
                            <div className="text-[11px]">{Number(amountSOL).toFixed(2)} SOL</div>
                            <div className="text-[11px] text-muted-foreground">{Number(amountUSD).toFixed(2)} USD</div>
                          </div>
                          <div className="col-span-1">
                            {/* Creator balances */}
                            {(() => {
                              const sol = (token.activity_info as any)?.creator_balance_sol ?? (token.raw_data as any)?.creator_balance_sol
                              const usd = (token.activity_info as any)?.creator_balance_usd ?? (token.raw_data as any)?.creator_balance_usd
                              return (
                                <div className="text-[11px] text-right">
                                  {sol != null && <div>{Number(sol).toFixed(2)} SOL</div>}
                                  {usd != null && <div className="text-muted-foreground">${Number(usd).toFixed(2)}</div>}
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      )
            })()}
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
        <div className="space-y-2">
          {/* Main Links */}
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
          
          {/* Social Links */}
          {(() => {
            const social = token.social_links ?? (token.raw_data as any)?.social_links ?? {}
            return (social.twitter || social.website || social.telegram) && (
              <div className="flex justify-center gap-3">
                {social.twitter && (
                  <a
                    href={social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-500 text-sm transition-colors duration-200"
                    title="Twitter"
                  >
                    𝕏
                  </a>
                )}
                {social.website && (
                  <a
                    href={social.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:text-green-600 text-sm transition-colors duration-200"
                    title="Website"
                  >
                    🌐
                  </a>
                )}
                {social.telegram && (
                  <a
                    href={social.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm transition-colors duration-200"
                    title="Telegram"
                  >
                    💬
                  </a>
                )}
              </div>
            )
          })()}
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
  const itemsPerPage = 12

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[600px]">
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
    <div className="space-y-8">
      {/* Latest Live Tokens Section */}
      <TokenSection
        title="New Tokens"
        tokens={latestTokens}
        dataTimePeriod={dataTimePeriod}
        onBuy={onBuy}
        onSell={onSell}
        selectedQuickSellPercent={selectedQuickSellPercent}
        searchPlaceholder="Search new tokens..."
      />

      {/* Top Market Cap Section */}
      <TokenSection
        title="Top by Market Cap"
        tokens={topMarketCapTokens}
        dataTimePeriod={dataTimePeriod}
        onBuy={onBuy}
        onSell={onSell}
        selectedQuickSellPercent={selectedQuickSellPercent}
        searchPlaceholder="Search by market cap..."
      />

      {/* Migrated Tokens Section */}
      <TokenSection
        title="Migrated Tokens"
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