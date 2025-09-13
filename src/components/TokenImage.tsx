"use client"

import { useState } from "react"
import Image from "next/image"

interface TokenImageProps {
  src: string
  alt: string
  symbol: string
}

export function TokenImage({ src, alt, symbol }: TokenImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
        {symbol?.charAt(0) || '?'}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={32}
      height={32}
      className="h-full w-full object-cover"
      onError={() => setHasError(true)}
    />
  )
}