import React, { useState, useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
    <Card className="relative overflow-hidden mb-6 hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20 group rounded-2xl">
      <CardContent className="p-3">
        {/* Header with rank and image */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              #{rank}
            </span>
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {token.image_url ? (
                <img
                  src={token.image_url}
                  alt={token.symbol}
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
                {token.symbol?.charAt(0) || '?'}
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
            {token.name || 'Unnamed Token'}
          </h3>
          <p className="text-[12px] text-muted-foreground mb-2 flex items-center gap-2">
            <span className="truncate">${token.symbol || 'UNKNOWN'}</span>
            {token.mint_address && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  try { navigator.clipboard.writeText(token.mint_address) } catch (err) {}
                }}
                className="text-[10px] px-2 py-1 rounded bg-muted/20 hover:bg-muted/30"
                title="Copy mint"
              >
                {token.mint_address.slice(0,8)}...{token.mint_address.slice(-6)}
              </button>
            )}
          </p>
          
          {/* Age and Live Since */}
          <div className="flex justify-between text-[12px] text-muted-foreground mb-2">
            <div>
                Age: <LiveAge createdFormatted={token.created_at || token.age || 'Unknown'} />
            </div>
              <div>
                Live: <LiveSince createdFormatted={token.live_since || token.created_at} />
              </div>
          </div>
        </div>

        {/* Market Data */}
  <div className="space-y-1 mb-3">
          {/* Market Cap and ATH */}
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">MCAP</span>
            <AnimatedNumber
              value={parseMarketCap(token.mcap)}
              previousValue={token._previousValues?.mcap ? parseMarketCap(token._previousValues.mcap as any) : undefined}
              formatFn={formatMarketCap}
              className="text-[12px] font-medium"
              duration={3000}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">ATH</span>
            <div className="flex items-center gap-2">
              <AnimatedNumber
                value={parseMarketCap(token.ath || 0)}
                previousValue={token._previousValues?.ath ? parseMarketCap(token._previousValues.ath as any) : undefined}
                formatFn={formatMarketCap}
                className="text-[12px] font-medium"
                duration={3000}
              />
            </div>
          </div>

          {/* Progress bar for ATH */}
          {token.ath && token.progress && (
            <div className="w-full">
              <AnimatedProgress
                value={token.progress}
                previousValue={token._previousValues?.progress}
                duration={3000}
                className="w-full h-1.5"
                currentMcap={Number(token.mcap || 0)}
                athMcap={Number(token.ath || 0)}
              />
            </div>
          )}

          {/* Trading Stats */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vol:</span>
              <AnimatedNumber
                value={(token as any)[`volume_${dataTimePeriod}`] as number || 0}
                previousValue={(token._previousValues as any)?.[`volume_${dataTimePeriod}`] as number}
                formatFn={formatVolume}
                duration={3000}
              />
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Txns:</span>
              <AnimatedNumber
                value={(token as any)[`txns_${dataTimePeriod}`] as number || 0}
                previousValue={(token._previousValues as any)?.[`txns_${dataTimePeriod}`] as number}
                formatFn={(value: number) => value.toLocaleString()}
                duration={3000}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Traders:</span>
              <AnimatedNumber
                value={(token as any)[`traders_${dataTimePeriod}`] as number || 0}
                previousValue={(token._previousValues as any)?.[`traders_${dataTimePeriod}`] as number}
                formatFn={(value: number) => value.toLocaleString()}
                duration={3000}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Change:</span>
              <AnimatedPercentage
                value={(token as any)[`price_change_${dataTimePeriod}`] as number || 0}
                previousValue={(token._previousValues as any)?.[`price_change_${dataTimePeriod}`] as number}
                duration={3000}
              />
            </div>
          </div>

          {/* Small sparkline chart */}
          <div className="mt-2 flex justify-center">
            {(() => {
              const rawCandles = (token.candle_data as any) ?? (token.raw_data as any)?.candle_data
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
                  value={token.viewers || 0}
                  previousValue={token._previousValues?.viewers}
                  formatFn={(value: number) => value.toLocaleString()}
                  className="text-xs font-medium"
                  duration={3000}
                />
              <AnimatedNumber
                  value={token.reply_count || 0}
                  previousValue={token._previousValues?.reply_count}
                  formatFn={(value: number) => `${value}💬`}
                  className="text-xs text-muted-foreground"
                  duration={3000}
              />
            </div>
          </div>

          {/* Dev Activity summary (buy/sell, amounts, since) */}
          <div className="mt-2 text-[12px]">
            {(() => {
        const dev = (token.dev_activity as any) ?? (token.raw_data as any)?.dev_activity
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
                              const sol = (token.creator_balance_sol as any) ?? (token.raw_data as any)?.creator_balance_sol
                              const usd = (token.creator_balance_usd as any) ?? (token.raw_data as any)?.creator_balance_usd
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
              href={`https://pump.fun/coin/${token.mint_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs text-blue-500 hover:text-blue-600 py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              Pump.fun
            </a>
            <a
              href={`https://gmgn.ai/sol/token/${token.mint_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs text-purple-500 hover:text-purple-600 py-1 px-2 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
            >
              GMGN
            </a>
          </div>
          
          {/* Social Links */}
          {(() => {
            const social = (token.twitter || token.website || token.telegram)
              ? { twitter: token.twitter, website: token.website, telegram: token.telegram }
              : (token.raw_data as any)?.social_links || {}
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
  const gridContainerRef = useRef<HTMLDivElement | null>(null)

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens
    
    const query = searchQuery.toLowerCase().trim()
    return tokens.filter(token => {
      const symbol = (token.symbol || '').toLowerCase()
      const name = (token.name || '').toLowerCase()
      const mint = (token.mint_address || '').toLowerCase()
      return symbol.includes(query) || name.includes(query) || mint.includes(query)
    })
  }, [tokens, searchQuery])

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

      {/* Virtualized Token Grid: render rows where each row contains two
          TokenBox components (two columns). This reduces DOM nodes while
          keeping the 2-per-row layout. */}
      <div
        ref={gridContainerRef}
        className="max-h-[600px] overflow-auto scrollbar-thin mb-6"
        style={{ height: '600px' }}
      >
        {(() => {
          const rowCount = Math.max(1, Math.ceil(filteredTokens.length / 2))
          const rowVirtualizer = useVirtualizer({
            count: rowCount,
            getScrollElement: () => gridContainerRef.current,
            estimateSize: () => 500,
            overscan: 4,
            horizontal: false,
          })

          return (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowIndex = virtualRow.index
                const i = rowIndex * 2
                return (
                  <div
                    key={rowIndex}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {[0, 1].map((col) => {
                        const idx = i + col
                        const token = filteredTokens[idx]
                        return token ? (
                          <TokenBox
                            key={token.mint_address}
                            token={token}
                            dataTimePeriod={dataTimePeriod}
                            onBuy={onBuy}
                            onSell={onSell}
                            selectedQuickSellPercent={selectedQuickSellPercent}
                            rank={idx + 1}
                          />
                        ) : (
                          <div key={`empty-${rowIndex}-${col}`} />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
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
      token.complete || token.raydium_pool
    )
    return sortTokens(migrated, { sortBy: 'live_since', sortOrder: 'desc', dataTimePeriod })
  }, [baseFilteredTokens, sortTokens, dataTimePeriod])

  return (
    <div className="space-y-8">
      {/* On larger screens show three columns (one per category). Each
          TokenSection internally uses a two-column grid for token boxes,
          producing 6 boxes per full-width row (3 sections × 2 boxes). */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <TokenSection
            title="New Live"
            tokens={latestTokens}
            dataTimePeriod={dataTimePeriod}
            onBuy={onBuy}
            onSell={onSell}
            selectedQuickSellPercent={selectedQuickSellPercent}
            searchPlaceholder="Search new tokens..."
          />
        </div>

        <div>
          <TokenSection
            title="Market Cap"
            tokens={topMarketCapTokens}
            dataTimePeriod={dataTimePeriod}
            onBuy={onBuy}
            onSell={onSell}
            selectedQuickSellPercent={selectedQuickSellPercent}
            searchPlaceholder="Search by market cap..."
          />
        </div>

        <div>
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
      </div>
    </div>
  )
}