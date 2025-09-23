"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  
  const scrollBy = (amount: number, behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({ left: amount, behavior })
  }

  // Hold-to-scroll implementation
  const rafRef = React.useRef<number | null>(null)
  const directionRef = React.useRef<number>(0)
  const speedRef = React.useRef<number>(300) // pixels per second

  const stopHoldScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    directionRef.current = 0
  }

  const startHoldScroll = (dir: number) => {
    stopHoldScroll()
    directionRef.current = dir
    let last = performance.now()
    const step = (now: number) => {
      const elapsed = now - last
      last = now
      const distance = (speedRef.current * (elapsed / 1000)) * directionRef.current
      if (containerRef.current) containerRef.current.scrollLeft += distance
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  return (
    <div className="relative w-full">
  <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[9999]">
        <button
          aria-label="Scroll left"
          onClick={() => scrollBy(-300)}
          onPointerDown={() => startHoldScroll(-1)}
          onPointerUp={() => stopHoldScroll()}
          onPointerLeave={() => stopHoldScroll()}
          className="p-2 rounded-lg bg-black/50 hover:bg-black/60 text-white text-xs shadow-lg table-scroll-btn"
          style={{ backdropFilter: 'blur(4px)', cursor: 'pointer' }}
        >
          ◀
        </button>
      </div>
  <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[9999]">
        <button
          aria-label="Scroll right"
          onClick={() => scrollBy(300)}
          onPointerDown={() => startHoldScroll(1)}
          onPointerUp={() => stopHoldScroll()}
          onPointerLeave={() => stopHoldScroll()}
          className="p-2 rounded-lg bg-black/50 hover:bg-black/60 text-white text-xs shadow-lg table-scroll-btn"
          style={{ backdropFilter: 'blur(4px)', cursor: 'pointer' }}
        >
          ▶
        </button>
      </div>

      <div
        ref={containerRef}
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-xs", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-xs [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap text-xs [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
