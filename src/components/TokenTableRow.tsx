"use client"

import { LiveToken, SortPreferences } from "@/types/token.types"
import { formatMarketCap, formatVolume, parseMarketCap } from "@/utils/format.utils"
import { TokenImage } from "./TokenImage"
import { LiveAge } from "./LiveAge"
import { AnimatedNumber, AnimatedPercentage } from "@/components/animated-number"
import { AnimatedProgress } from "@/components/animated-progress"

interface TokenTableRowProps {
  token: LiveToken
  index: number
  startIndex: number
  dataTimePeriod: string
  persistentSort: SortPreferences
  getCreatorCount: (creator: string) => number
}

export function TokenTableRow({ 
  token, 
  index, 
  startIndex, 
  dataTimePeriod, 
  persistentSort,
  getCreatorCount 
}: TokenTableRowProps) {
  return (
    <tr 
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
              #{startIndex + index + 1}
            </span>
            <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              {token.token_info.image_uri ? (
                <TokenImage
                  src={token.token_info.image_uri}
                  alt={token.token_info.symbol}
                  symbol={token.token_info.symbol}
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
  )
}