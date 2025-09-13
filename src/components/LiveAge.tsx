"use client"

import React, { useEffect, useState } from "react"
import { parseFormattedAge, getHumanReadableAge } from "@/utils/time.utils"

interface LiveAgeProps {
  createdFormatted: string
  className?: string
}

export const LiveAge: React.FC<LiveAgeProps> = ({ 
  createdFormatted, 
  className 
}) => {
  const [displayAge, setDisplayAge] = useState(() => getHumanReadableAge(createdFormatted))
  
  useEffect(() => {
  // Update the display age immediately when the prop changes
  setDisplayAge(getHumanReadableAge(createdFormatted))
    
    // Set up interval to update relative time every second for recent tokens
    const interval = setInterval(() => {
      // Parse the current age and check if it's valid
      const timestamp = parseFormattedAge(createdFormatted)
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
        setDisplayAge(getHumanReadableAge(createdFormatted))
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [createdFormatted])
  
  return <span className={className}>{displayAge}</span>
}