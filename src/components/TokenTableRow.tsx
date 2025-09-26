"use client"

import React from 'react'
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
  // Local UI state to briefly show update highlight even when _isUpdated
  // may be toggled by incoming realtime events. We show the green
  // highlight for a short duration (500ms) so animations still play but
  // the row doesn't remain highlighted.
  const [showHighlight, setShowHighlight] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (token._isUpdated) {
      setShowHighlight(true)
      const t = setTimeout(() => setShowHighlight(false), 300)
      return () => clearTimeout(t)
    }
    // If token._isUpdated becomes false, ensure highlight is cleared
    setShowHighlight(false)
  }, [token._isUpdated])

  // Shake on insert: when a token is newly inserted we expect no
  // _previousValues; trigger a short 200ms shake animation.
  const [shake, setShake] = React.useState(false)
  React.useEffect(() => {
    const isInsert = !!token._isUpdated && !token._previousValues
    if (isInsert) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 200)
      return () => clearTimeout(t)
    }
    setShake(false)
  }, [token._isUpdated, token._previousValues])

  return (
    <tr 
      className={`border-b hover:bg-muted/30 transition-colors duration-300 h-16 ${
        showHighlight ? 'bg-green-50/30' : ''
      } ${shake ? 'row-shake' : ''}`}
    >
      {/* Fixed Token Cell */}
      <td className="sticky left-0 z-10 w-[220px] bg-background border-r shadow-sm">
        <a
          href={`https://pump.fun/coin/${token.mint_address}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`block p-2 hover:bg-muted/50 transition-colors duration-200 cursor-pointer ${showHighlight ? 'bg-green-50 border-l-4 border-l-green-500 -ml-3 pl-3' : ''}`}
          title={`Watch ${token.name || 'token'} live stream on Pump.fun`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono w-6">
              #{startIndex + index + 1}
            </span>
            <div className="h-6 w-6 rounded-full bg-muted flex-shrink-0 overflow-hidden">
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
              <div className="fallback h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold">
                {token.symbol?.charAt(0) || '?'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className={`font-medium truncate text-[13px] transition-colors duration-200 ${showHighlight ? 'text-black' : 'text-white'}`}>
                {token.name ? (token.name.length > 22 ? token.name.slice(0,22) + '...' : token.name) : 'Unnamed Token'}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                ${token.symbol || 'UNKNOWN'} • {token.mint_address ? `${token.mint_address.slice(0,6)}...${token.mint_address.slice(-4)}` : ''}
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
          const rawCandles = (token.candle_data as any) ?? (token.raw_data as any)?.candle_data
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
          createdFormatted={token.age || token.created_at || 'Unknown'}
          className="text-xs"
        />
      </td>
      
      {/* MCAP */}
      <td className="w-[90px] p-2 text-center">
        <AnimatedNumber
          value={parseMarketCap(token.mcap)}
          previousValue={token._previousValues?.mcap ? parseMarketCap(token._previousValues.mcap) : undefined}
          formatFn={formatMarketCap}
          className="text-xs font-medium"
          duration={3000}
        />
      </td>
      
      {/* ATH */}
      <td className="w-[80px] p-2">
        <div className="flex flex-col items-center justify-center space-y-1">
          <AnimatedNumber
            value={parseMarketCap(token.ath || 0)}
            previousValue={token._previousValues?.ath ? parseMarketCap(token._previousValues.ath) : undefined}
            formatFn={formatMarketCap}
            className="text-xs font-medium text-white"
            duration={3000}
          />
          {token.ath && token.progress && (
            <div className="w-full px-1">
              <AnimatedProgress
                value={token.progress}
                previousValue={token._previousValues?.progress}
                duration={3000}
                className="w-full"
                currentMcap={parseFloat(String(token.mcap || 0))}
                athMcap={parseFloat(String(token.ath || 0))}
              />
            </div>
          )}
        </div>
      </td>
      
      {/* LIVE SINCE */}
      <td className="w-[90px] p-2 text-center">
        <LiveSince
          createdFormatted={token.live_since || token.created_at || token.age}
          className="text-xs"
        />
      </td>
      
      {/* Volume */}
      <td className="w-[80px] p-2 text-center">
        <AnimatedNumber
          value={(token as any)[`volume_${dataTimePeriod}`] as number || 0}
          previousValue={(token._previousValues as any)?.[`volume_${dataTimePeriod}`] as number}
          formatFn={formatVolume}
          className="text-xs"
          duration={3000}
        />
      </td>
      
      {/* Transactions */}
      <td className="w-[70px] p-2 text-center">
          <AnimatedNumber
            value={(token as any)[`txns_${dataTimePeriod}`] as number || 0}
            previousValue={(token._previousValues as any)?.[`txns_${dataTimePeriod}`] as number}
          formatFn={(value: number) => value.toLocaleString()}
          className="text-xs"
          duration={3000}
        />
      </td>
      
      {/* Traders */}
      <td className="w-[80px] p-2 text-center">
          <AnimatedNumber
            value={(token as any)[`traders_${dataTimePeriod}`] as number || 0}
            previousValue={(token._previousValues as any)?.[`traders_${dataTimePeriod}`] as number}
          formatFn={(value: number) => value.toLocaleString()}
          className="text-xs"
          duration={3000}
        />
      </td>
      
      {/* Price Change */}
      <td className="w-[90px] p-2 text-center">
          <AnimatedPercentage
            value={(token as any)[`price_change_${dataTimePeriod}`] as number || 0}
            previousValue={(token._previousValues as any)?.[`price_change_${dataTimePeriod}`] as number}
          className="text-xs"
          duration={3000}
        />
      </td>
      
      {/* Viewers - Updated to show both viewers and reply_count with proper animation */}
      <td className="w-[60px] p-2 text-center">
        <div className="flex flex-col items-center justify-center gap-0.5">
          {/* Viewers count */}
          <AnimatedNumber
            value={token.viewers || 0}
            previousValue={token._previousValues?.viewers}
            formatFn={(value: number) => value.toLocaleString()}
            className="text-xs font-medium"
            duration={3000}
          />
          {/* Reply count - smaller and muted */}
          <AnimatedNumber
            value={token.reply_count || 0}
            previousValue={token._previousValues?.reply_count}
            formatFn={(value: number) => `${value.toLocaleString()}💬`}
            className="text-[10px] text-muted-foreground"
            duration={3000}
          />
        </div>
      </td>
      
      {/* Creator */}
      <td className="w-[100px] p-2 text-center">
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] font-mono text-muted-foreground">
            {token.creator ? 
              `${token.creator.slice(0, 4)}...${token.creator.slice(-4)}` 
              : 'Unknown'}
          </span>
          {persistentSort.sortBy === 'creator' && (
            <span className="text-[8px] px-1 py-0.5 bg-blue-500/20 text-blue-600 rounded-full border border-blue-500/30">
              {getCreatorCount(token.creator || 'Unknown')} tokens
            </span>
          )}
        </div>
      </td>
      
      {/* GMGN */}
      <td className="w-[80px] p-2 text-center">
        <a
          href={`https://gmgn.ai/sol/token/${token.mint_address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 text-[10px] font-medium transition-colors duration-200 truncate block"
          title={`View ${token.symbol || 'token'} on GMGN`}
        >
          gmgn.ai
        </a>
      </td>
      
      {/* Socials */}
      <td className="w-[80px] p-2 text-center">
        {(() => {
          const social = (token.twitter || token.website || token.telegram)
            ? { twitter: token.twitter, website: token.website, telegram: token.telegram }
            : (token.raw_data as any)?.social_links || {}
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
          const dev = (token.dev_activity as any) ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'buy') return <span className="text-[10px] text-muted-foreground">-</span>
          const amountSOL = dev.amountSOL ?? dev.amountSol ?? dev.amount_sol ?? 0
          const prevDev = (token._previousValues as any)?.dev_activity as any
          const prevAmount = prevDev ? (prevDev.amountSOL ?? prevDev.amountSol ?? prevDev.amount_sol ?? 0) : undefined
          return (
            <AnimatedNumber
              value={Number(amountSOL)}
              previousValue={prevAmount}
              formatFn={(v: number) => `${Number(v).toFixed(2)} SOL`}
              className="text-[10px]"
              duration={3000}
            />
          )
        })()}
      </td>
      
      {/* Dev Buy Since */}
      <td className="w-[100px] p-2 text-center">
        {(() => {
          const dev = (token.dev_activity as any) ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'buy') return <span className="text-[10px] text-muted-foreground">-</span>
          return (
            <LiveSince createdFormatted={dev.timestamp || dev.time || dev.ts} className="text-[10px]" />
          )
        })()}
      </td>
      
      {/* Dev Sell */}
      <td className="w-[90px] p-2 text-center">
        {(() => {
          const dev = (token.dev_activity as any) ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'sell') return <span className="text-[10px] text-muted-foreground">-</span>
          const amountSOL = dev.amountSOL ?? dev.amountSol ?? dev.amount_sol ?? 0
          const prevDev = (token._previousValues as any)?.dev_activity as any
          const prevAmount = prevDev ? (prevDev.amountSOL ?? prevDev.amountSol ?? prevDev.amount_sol ?? 0) : undefined
          return (
            <AnimatedNumber
              value={Number(amountSOL)}
              previousValue={prevAmount}
              formatFn={(v: number) => `${Number(v).toFixed(2)} SOL`}
              className="text-[10px]"
              duration={3000}
            />
          )
        })()}
      </td>
      
      {/* Dev Sell Since */}
      <td className="w-[100px] p-2 text-center">
        {(() => {
          const dev = (token.dev_activity as any) ?? (token.raw_data as any)?.dev_activity
          if (!dev || dev.type !== 'sell') return <span className="text-[10px] text-muted-foreground">-</span>
          return (
            <LiveSince createdFormatted={dev.timestamp || dev.time || dev.ts} className="text-[10px]" />
          )
        })()}
      </td>
      
      {/* Created Count */}
      <td className="w-[80px] p-2 text-center">
          {(() => {
          const count = token.created_coin_count ?? (token.raw_data as any)?.created_coin_count
          const prevCount = token._previousValues?.created_coin_count
          return count ? (
            <AnimatedNumber
              value={Number(count)}
              previousValue={prevCount}
              formatFn={(v: number) => Number(v).toLocaleString()}
              className="text-[10px] font-medium"
              duration={3000}
            />
          ) : <span className="text-[10px] text-muted-foreground">-</span>
        })()}
      </td>
    </tr>
  )
}