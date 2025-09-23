"use client"

import { LiveToken, SortPreferences } from "@/types/token.types"
import { formatMarketCap, formatVolume, parseMarketCap } from "@/utils/format.utils"
import { LiveAge } from "./LiveAge"
import { AnimatedNumber, AnimatedPercentage } from "@/components/animated-number"
import { AnimatedProgress } from "@/components/animated-progress"
import { LiveSince } from "./LiveSince"

interface TokenTableRowProps {
  token: LiveToken
  index: number
  startIndex: number
  dataTimePeriod: string
  persistentSort: SortPreferences
  getCreatorCount: (creator: string) => number
  // Callbacks for trading actions (UI wiring only)
  onBuy?: (token: LiveToken) => void
  onSell?: (token: LiveToken, percent: number) => void
  // UI helper: selected quick sell percent from sidebar
  selectedQuickSellPercent?: number
}

export function TokenTableRow({ 
  token, 
  index, 
  startIndex, 
  dataTimePeriod, 
  persistentSort,
  getCreatorCount,
  onBuy,
  onSell,
  selectedQuickSellPercent,
}: TokenTableRowProps) {
  return (
    <tr 
      className={`border-b hover:bg-muted/30 transition-colors duration-300 h-16 ${
        token._isUpdated ? 'bg-green-50/30' : ''
      }`}
    >
      {/* Fixed Token Cell */}
      <td className="sticky left-0 z-10 w-[220px] bg-background border-r shadow-sm">
        <a
          href={`https://pump.fun/coin/${token.token_info.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`block p-2 hover:bg-muted/50 transition-colors duration-200 cursor-pointer ${
            token._isUpdated ? 'bg-green-50 border-l-4 border-l-green-500 -ml-3 pl-3' : ''
          }`}
          title={`Watch ${token.token_info.name || 'token'} live stream on Pump.fun`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono w-6">
              #{startIndex + index + 1}
            </span>
            <div className="h-6 w-6 rounded-full bg-muted flex-shrink-0 overflow-hidden">
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
              <div className="fallback h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold">
                {token.token_info.symbol?.charAt(0) || '?'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate text-[13px]">
                {token.token_info.name ? (token.token_info.name.length > 22 ? token.token_info.name.slice(0,22) + '...' : token.token_info.name) : 'Unnamed Token'}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                ${token.token_info.symbol || 'UNKNOWN'} • {token.token_info.mint ? `${token.token_info.mint.slice(0,6)}...${token.token_info.mint.slice(-4)}` : ''}
              </div>
              {/* Buy / Sell buttons under the symbol */}
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onBuy?.(token)
                  }}
                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Buy"
                >
                  Buy
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onSell?.(token, selectedQuickSellPercent ?? 25)
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white"
                    title={`Sell ${selectedQuickSellPercent ?? 25}%`}
                  >
                    Sell {selectedQuickSellPercent ?? 25}%
                  </button>
                </div>
              </div>
            </div>
          </div>
        </a>
      </td>
      
      {/* Graph - small sparkline using candle_data when available */}
      <td className="w-[80px] p-2 text-center">
        {(() => {
          const rawCandles = (token.trading_info as any)?.candle_data ?? (token.raw_data as any)?.candle_data
          if (!rawCandles || !Array.isArray(rawCandles) || rawCandles.length === 0) {
            return (
              <div className="h-8 w-12 bg-muted/30 rounded flex items-center justify-center text-[10px] text-muted-foreground mx-auto">
                Chart
              </div>
            )
          }

          // Extract close prices (they may be strings inside objects)
          const data = rawCandles.map((c: any) => {
            if (c == null) return 0
            if (typeof c === 'number') return c
            const close = c.close ?? c[4] ?? 0
            const n = parseFloat(String(close))
            return isNaN(n) ? 0 : n
          })

          const w = 48
          const h = 18
          const pad = 2
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
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto inline-block">
              <polyline
                fill="none"
                stroke={stroke}
                strokeWidth={1.4}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
            </svg>
          )
        })()}
      </td>
      
      {/* Age */}
      <td className="w-[70px] p-2 text-center">
        <LiveAge 
          createdFormatted={token.creator_info.created_formatted || 'Unknown'}
          className="text-xs"
        />
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
                currentMcap={parseFloat(token.market_data.usd_market_cap || '0')}
                athMcap={parseFloat(token.market_data.ath || '0')}
              />
            </div>
          )}
        </div>
      </td>
      
      {/* LIVE SINCE */}
      <td className="w-[90px] p-2 text-center">
        <LiveSince
          createdFormatted={token.timestamps?.created_at}
          className="text-xs"
        />
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
      
      {/* Viewers - Updated to show both viewers and reply_count with proper animation */}
      <td className="w-[60px] p-2 text-center">
        <div className="flex flex-col items-center justify-center gap-0.5">
          {/* Viewers count */}
          <AnimatedNumber
            value={token.activity_info.viewers || 0}
            previousValue={token._previousValues?.viewers}
            formatFn={(value: number) => value.toLocaleString()}
            className="text-xs font-medium"
            duration={1000}
          />
          {/* Reply count - smaller and muted */}
          <AnimatedNumber
            value={token.pool_info.reply_count || 0}
            previousValue={token._previousValues?.reply_count}
            formatFn={(value: number) => `${value.toLocaleString()}💬`}
            className="text-[10px] text-muted-foreground"
            duration={1000}
          />
        </div>
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
      
      {/* GMGN */}
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
      
      {/* Socials */}
      <td className="w-[80px] p-2 text-center">
        {(() => {
          const social = token.social_links ?? (token.raw_data as any)?.social_links ?? {}
          return (
            <div className="flex justify-center gap-1">
              {social.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-500 text-[10px] transition-colors duration-200"
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
                  className="text-green-500 hover:text-green-600 text-[10px] transition-colors duration-200"
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
                  className="text-blue-500 hover:text-blue-600 text-[10px] transition-colors duration-200"
                  title="Telegram"
                >
                  💬
                </a>
              )}
            </div>
          )
        })()}
      </td>
      
      {/* Dev Buy */}
      <td className="w-[90px] p-2 text-center">
        {(() => {
          const dev = (token.activity_info as any)?.dev_activity ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'buy') return <span className="text-[10px] text-muted-foreground">-</span>
          const amountSOL = dev.amountSOL ?? dev.amountSol ?? dev.amount_sol ?? 0
          return (
            <div className="text-[10px]">{Number(amountSOL).toFixed(2)} SOL</div>
          )
        })()}
      </td>
      
      {/* Dev Buy Since */}
      <td className="w-[100px] p-2 text-center">
        {(() => {
          const dev = (token.activity_info as any)?.dev_activity ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'buy') return <span className="text-[10px] text-muted-foreground">-</span>
          return (
            <LiveSince createdFormatted={dev.timestamp || dev.time || dev.ts} className="text-[10px]" />
          )
        })()}
      </td>
      
      {/* Dev Sell */}
      <td className="w-[90px] p-2 text-center">
        {(() => {
          const dev = (token.activity_info as any)?.dev_activity ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'sell') return <span className="text-[10px] text-muted-foreground">-</span>
          const amountSOL = dev.amountSOL ?? dev.amountSol ?? dev.amount_sol ?? 0
          return (
            <div className="text-[10px]">{Number(amountSOL).toFixed(2)} SOL</div>
          )
        })()}
      </td>
      
      {/* Dev Sell Since */}
      <td className="w-[100px] p-2 text-center">
        {(() => {
          const dev = (token.activity_info as any)?.dev_activity ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'sell') return <span className="text-[10px] text-muted-foreground">-</span>
          return (
            <LiveSince createdFormatted={dev.timestamp || dev.time || dev.ts} className="text-[10px]" />
          )
        })()}
      </td>
      
      {/* Created Count */}
      <td className="w-[80px] p-2 text-center">
        {(() => {
          const count = (token.activity_info as any)?.created_coin_count ?? (token.raw_data as any)?.created_coin_count
          return count ? <span className="text-[10px] font-medium">{count}</span> : <span className="text-[10px] text-muted-foreground">-</span>
        })()}
      </td>
    </tr>
  )
}