"use client"

import { useEffect, useState } from "react"
import { Progress } from "./ui/progress"

interface AnimatedProgressProps {
  value: number
  previousValue?: number
  duration?: number
  className?: string
  showPercentage?: boolean
}

export function AnimatedProgress({
  value,
  previousValue,
  duration = 1500,
  className = "",
  showPercentage = false
}: AnimatedProgressProps) {
  const [currentValue, setCurrentValue] = useState(previousValue ?? value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value !== currentValue) {
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
          requestAnimationFrame(animate)
        } else {
          setCurrentValue(endValue)
          setIsAnimating(false)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [value, currentValue, duration])

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="relative">
        <Progress 
          value={Math.min(currentValue, 100)} 
          className={`h-2 transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
        />
        <div 
          className={`absolute inset-0 h-2 ${getProgressColor(currentValue)} rounded-full transition-all duration-500 ease-out`}
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
      </div>
      {showPercentage && (
        <div className="text-xs text-center text-muted-foreground">
          {currentValue.toFixed(1)}%
        </div>
      )}
    </div>
  )
}
