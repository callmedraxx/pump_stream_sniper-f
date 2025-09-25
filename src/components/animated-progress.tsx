"use client"

import { useEffect, useState, useRef } from "react"
import { Progress } from "./ui/progress"

interface AnimatedProgressProps {
  value: number
  previousValue?: number
  duration?: number
  className?: string
  showPercentage?: boolean
  // New props for ATH sparkle logic
  currentMcap?: number
  athMcap?: number
}

export function AnimatedProgress({
  value,
  previousValue,
  duration = 3000,
  className = "",
  showPercentage = false,
  currentMcap,
  athMcap
}: AnimatedProgressProps) {
  const [currentValue, setCurrentValue] = useState(previousValue ?? value)
  const [isAnimating, setIsAnimating] = useState(false)

  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    // Always animate when the target value changes, even for small differences
    // Use a small threshold to avoid unnecessary animations for tiny changes
    const valueDiff = Math.abs(value - currentValue)
    if (valueDiff > 0.01) { // Changed from strict equality to allow small changes
      setIsAnimating(true)
      const startValue = currentValue
      const endValue = value
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const interpolatedValue = startValue + (endValue - startValue) * easeOutCubic

        setCurrentValue(interpolatedValue)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setCurrentValue(endValue)
          setIsAnimating(false)
          animationRef.current = null
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [value, duration])

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const shouldSparkle = () => {
    // Sparkle when progress is near completion (98%+) or very low (2%-)
    if (currentValue >= 98 || currentValue <= 2) return true
    
    // Sparkle when market cap is within 5% of ATH
    if (currentMcap && athMcap && athMcap > 0) {
      const percentFromAth = ((athMcap - currentMcap) / athMcap) * 100
      return percentFromAth <= 5 // Within 5% of ATH
    }
    
    return false
  }

  const isLargeNearAth = () => {
    // Strong flame only for tokens with meaningful market cap (>= 20k)
    if (!currentMcap || !athMcap || athMcap <= 0) return false
    if (currentMcap < 20000) return false
    const percentFromAth = ((athMcap - currentMcap) / athMcap) * 100
    return percentFromAth <= 2 // within 2% of ATH
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="relative">
        <Progress 
          value={Math.min(currentValue, 100)} 
          className={`h-2`}
        />
        <div className={`absolute inset-0 h-2 rounded-full overflow-hidden`}>
          <div
            className={`${getProgressColor(currentValue)} h-full rounded-full`}
            style={{
              width: `${Math.min(currentValue, 100)}%`,
              background: `linear-gradient(90deg, ${
                currentValue >= 80 ? '#22c55e' :
                currentValue >= 50 ? '#eab308' : '#ef4444'
              }, ${
                currentValue >= 80 ? '#16a34a' :
                currentValue >= 50 ? '#ca8a04' : '#dc2626'
              })`
            }}
          />

          {/* Enhanced sparkle indicator rendered above the fill (right edge) */}
          {shouldSparkle() && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 mr-[-8px] pointer-events-none"
              style={{ transform: 'translateY(-50%)' }}
            >
              {currentMcap && athMcap && athMcap > 0 && ((athMcap - currentMcap) / athMcap) * 100 <= 5 ? (
                <div className="relative">
                  <div className="animate-ping absolute inset-0 rounded-full bg-yellow-400 opacity-75"></div>
                  <div className="animate-pulse absolute inset-0 rounded-full bg-yellow-300 opacity-50"></div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
                       className="relative z-10 animate-ath-sparkle">
                    <path d="M12 2l1.9 4.2L18 8l-4.2 1.9L12 14l-1.9-4.1L6 8l4.1-1.8L12 2z" fill="#fbbf24" opacity="1" />
                    <path d="M12 2l1.9 4.2L18 8l-4.2 1.9L12 14l-1.9-4.1L6 8l4.1-1.8L12 2z" fill="#f59e0b" opacity="0.8" />
                    <circle cx="12" cy="12" r="11" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
                  </svg>
                </div>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-sparkle">
                  <path d="M12 2l1.9 4.2L18 8l-4.2 1.9L12 14l-1.9-4.1L6 8l4.1-1.8L12 2z" fill="white" opacity="0.95" />
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Harsh flame overlay for large tokens near ATH (mcap >= 20k and within 2% of ATH) */}
        {isLargeNearAth() && (
          <div className="absolute inset-0 pointer-events-none overflow-visible flame-overlay">
            <div className="flame-container pointer-events-none">
              <div className="flame flame-1"></div>
              <div className="flame flame-2"></div>
              <div className="flame flame-3"></div>
              <div className="flame-glow"></div>
            </div>
          </div>
        )}
      </div>
      {showPercentage && (
        <div className="text-xs text-center text-muted-foreground">
          {currentValue.toFixed(1)}%
        </div>
      )}
    </div>
  )
}
