"use client"

import { useEffect, useState, useRef } from "react"

interface AnimatedNumberProps {
  value: number
  previousValue?: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  formatFn?: (value: number) => string
  decimals?: number
}

export function AnimatedNumber({
  value,
  previousValue,
  duration = 1000,
  className = "",
  prefix = "",
  suffix = "",
  formatFn,
  decimals = 0
}: AnimatedNumberProps) {
  const [currentValue, setCurrentValue] = useState(previousValue ?? value)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number>(0)

  const isIncreasing = value > currentValue
  const isDecreasing = value < currentValue
  const hasChanged = value !== currentValue

  useEffect(() => {
    if (hasChanged) {
      setIsAnimating(true)
      const startValue = currentValue
      const endValue = value
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        let interpolatedValue = startValue + (endValue - startValue) * easeOutCubic

        // If decimals is zero, round to nearest integer to avoid floating point values
        // showing during the animation for counts (viewers, txns, etc.)
        if (decimals === 0) {
          interpolatedValue = Math.round(interpolatedValue)
        }

        setCurrentValue(interpolatedValue)
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setCurrentValue(endValue)
          setIsAnimating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }
  }, [value, currentValue, duration, hasChanged])

  const formatValue = (val: number) => {
    if (formatFn) {
      return formatFn(val)
    }
    return val.toFixed(decimals)
  }

  const getColorClass = () => {
    if (!isAnimating && !hasChanged) return ""
    if (isIncreasing) return "text-green-500"
    if (isDecreasing) return "text-red-500"
    return ""
  }

  return (
    <span className={`transition-colors duration-300 ${getColorClass()} ${className}`}>
      {prefix}{formatValue(currentValue)}{suffix}
    </span>
  )
}

interface AnimatedPercentageProps {
  value: number
  previousValue?: number
  duration?: number
  className?: string
}

export function AnimatedPercentage({
  value,
  previousValue,
  duration = 1000,
  className = ""
}: AnimatedPercentageProps) {
  const isPositive = value >= 0
  const prefix = isPositive ? "+" : ""
  
  return (
    <AnimatedNumber
      value={value * 100}
      previousValue={previousValue ? previousValue * 100 : undefined}
      duration={duration}
      className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'} ${className}`}
      prefix={prefix}
      suffix="%"
      decimals={2}
    />
  )
}
