"use client"

import { useState, useEffect } from 'react'
import { useSolBalance } from '@/hooks/useSolBalance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, ChevronLeft, ChevronRight, TrendingUp, Clock, Zap } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { cn } from '@/lib/utils'

// Animated number component for smooth balance updates
function AnimatedNumber({ value, decimals = 4, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true)
      const startValue = displayValue
      const endValue = value
      const duration = 800
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Smooth easing function
        const easedProgress = 1 - Math.pow(1 - progress, 3)
        const currentValue = startValue + (endValue - startValue) * easedProgress

        setDisplayValue(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [value, displayValue])

  return (
    <span className={cn(
      "transition-all duration-200",
      isAnimating && "text-emerald-500 scale-105"
    )}>
      {displayValue.toFixed(decimals)}{suffix}
    </span>
  )
}

export function SolBalanceSidebar() {
  const { connected, publicKey } = useWallet()
  const { lamports, sol, error } = useSolBalance()
  const [isExpanded, setIsExpanded] = useState(false)
  const [prevSol, setPrevSol] = useState(sol)
  const [balanceChange, setBalanceChange] = useState<'up' | 'down' | 'same'>('same')

  // Track balance changes for visual feedback
  useEffect(() => {
    if (sol !== prevSol && prevSol > 0) {
      setBalanceChange(sol > prevSol ? 'up' : sol < prevSol ? 'down' : 'same')
      setPrevSol(sol)
      
      // Reset change indicator after animation
      const timer = setTimeout(() => setBalanceChange('same'), 1000)
      return () => clearTimeout(timer)
    } else if (prevSol === 0) {
      setPrevSol(sol)
    }
  }, [sol, prevSol])

  if (!connected) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-l-0 rounded-l-xl shadow-lg p-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Wallet className="h-4 w-4" />
            <span className="text-xs">Connect</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
      <div className={cn(
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-r-0 shadow-xl transition-all duration-300 ease-out",
        isExpanded ? "rounded-l-2xl w-80" : "rounded-l-xl w-16"
      )}>
        {/* Toggle Button */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2">
          <Button
            variant="secondary"
            size="sm"
            className="h-16 w-8 rounded-l-lg rounded-r-none border-r-0 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!isExpanded ? (
            // Collapsed State
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className={cn(
                  "p-2 rounded-full transition-colors duration-200",
                  balanceChange === 'up' && "bg-emerald-100 dark:bg-emerald-900/30",
                  balanceChange === 'down' && "bg-red-100 dark:bg-red-900/30",
                  balanceChange === 'same' && "bg-orange-100 dark:bg-orange-900/30"
                )}>
                  <Wallet className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    balanceChange === 'up' && "text-emerald-600 dark:text-emerald-400",
                    balanceChange === 'down' && "text-red-600 dark:text-red-400",
                    balanceChange === 'same' && "text-orange-600 dark:text-orange-400"
                  )} />
                </div>
                {balanceChange !== 'same' && (
                  <div className="absolute -top-1 -right-1">
                    <TrendingUp className={cn(
                      "h-3 w-3 animate-bounce",
                      balanceChange === 'up' ? "text-emerald-500 rotate-0" : "text-red-500 rotate-180"
                    )} />
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className={cn(
                  "text-sm font-bold transition-colors duration-200",
                  balanceChange === 'up' && "text-emerald-600 dark:text-emerald-400",
                  balanceChange === 'down' && "text-red-600 dark:text-red-400",
                  balanceChange === 'same' && "text-orange-900 dark:text-orange-100"
                )}>
                  <AnimatedNumber value={sol} decimals={2} />
                </div>
                <div className="text-xs text-muted-foreground">SOL</div>
              </div>

              <div className={cn(
                "w-2 h-2 rounded-full transition-colors duration-200",
                error ? "bg-red-500 animate-pulse" : "bg-emerald-500"
              )} />
            </div>
          ) : (
            // Expanded State
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-full transition-colors duration-200",
                    balanceChange === 'up' && "bg-emerald-100 dark:bg-emerald-900/30",
                    balanceChange === 'down' && "bg-red-100 dark:bg-red-900/30",
                    balanceChange === 'same' && "bg-orange-100 dark:bg-orange-900/30"
                  )}>
                    <Wallet className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      balanceChange === 'up' && "text-emerald-600 dark:text-emerald-400",
                      balanceChange === 'down' && "text-red-600 dark:text-red-400",
                      balanceChange === 'same' && "text-orange-600 dark:text-orange-400"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Wallet Balance</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Live updates</span>
                    </div>
                  </div>
                </div>
                
                {balanceChange !== 'same' && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
                    balanceChange === 'up' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                    balanceChange === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  )}>
                    <TrendingUp className={cn(
                      "h-3 w-3",
                      balanceChange === 'down' && "rotate-180"
                    )} />
                    <span>{balanceChange === 'up' ? '+' : '-'}</span>
                  </div>
                )}
              </div>

              {/* Balance Display */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-800/50">
                <div className="text-center space-y-2">
                  <div className={cn(
                    "text-3xl font-bold transition-all duration-300",
                    balanceChange === 'up' && "text-emerald-600 dark:text-emerald-400 scale-105",
                    balanceChange === 'down' && "text-red-600 dark:text-red-400 scale-105",
                    balanceChange === 'same' && "text-orange-900 dark:text-orange-100"
                  )}>
                    <AnimatedNumber value={sol} decimals={4} suffix=" SOL" />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <AnimatedNumber value={lamports} decimals={0} suffix=" lamports" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-200",
                    error ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  )} />
                  <span className="text-sm font-medium">Status</span>
                </div>
                
                <Badge
                  variant={error ? "destructive" : "default"}
                  className={cn(
                    "text-xs transition-colors duration-200",
                    !error && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  )}
                >
                  {error ? 'Error' : 'Live'}
                </Badge>
              </div>

              {/* Wallet Info */}
              {publicKey && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium">Wallet Address</span>
                  </div>
                  <code className="text-xs text-muted-foreground break-all">
                    {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                  </code>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-xs text-red-800 dark:text-red-300">
                    {error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}