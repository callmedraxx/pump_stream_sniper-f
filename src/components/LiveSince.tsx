"use client"

import React, { useEffect, useState } from "react"
import { parseFormattedAge, getHumanReadableAge } from "@/utils/time.utils"

interface LiveSinceProps {
  // backend may send ISO strings or numeric timestamps (seconds or ms), accept both
  createdFormatted?: string | number | null
  className?: string
}

export const LiveSince: React.FC<LiveSinceProps> = ({ 
  createdFormatted, 
  className 
}) => {
  // Normalize createdFormatted to a string that existing utils accept.
  const normalize = (v?: string | number | null) => {
    if (v == null) return ''
    // If number looks like seconds (10 digits), convert to ms
    if (typeof v === 'number') {
      // if likely in seconds (<= 1e10), convert to ms
      const n = v
      const ms = n < 1e12 ? n * 1000 : n
      return new Date(ms).toISOString()
    }
    return String(v)
  }

  const normalized = normalize(createdFormatted)
  const [displayAge, setDisplayAge] = useState(() => getHumanReadableAge(normalized))
  
  useEffect(() => {
    // Update the display age immediately when the normalized value changes
    setDisplayAge(getHumanReadableAge(normalized))
    
    // Set up interval to update relative time every second for recent tokens
    const interval = setInterval(() => {
      // Parse the current age and check if it's valid
  const timestamp = parseFormattedAge(normalized)
      if (timestamp === 0) return

      // For recent tokens, keep updating every second to show live seconds/minutes/hours
      // For older tokens, update the human-readable label (e.g., "2h", "3d")
      const ageInMinutes = (Date.now() - timestamp) / (1000 * 60)

      if (ageInMinutes < 10) {
        // For recent tokens, calculate and display live age
        const now = Date.now()
        const ageMs = now - timestamp
        const ageSeconds = Math.floor(ageMs / 1000)
        const ageMinutes = Math.floor(ageSeconds / 60)
        const ageHours = Math.floor(ageMinutes / 60)

        let newAge: string
        if (ageHours > 0) {
          newAge = `${ageHours}h`
        } else if (ageMinutes > 0) {
          newAge = `${ageMinutes}m`
        } else {
          newAge = `${Math.max(1, ageSeconds)}s`
        }

        setDisplayAge(newAge)
      } else {
        // Older tokens: use the general human readable formatter
        setDisplayAge(getHumanReadableAge(normalized))
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [normalized])
  
  return <span className={className}>{displayAge}</span>
}