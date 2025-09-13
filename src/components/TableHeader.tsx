"use client"

import { ChevronUp, ChevronDown, Minus } from "lucide-react"
import { SortPreferences } from "@/types/token.types"

interface TableHeaderProps {
  persistentSort: SortPreferences
  onSortToggle: (column: string) => void
}

export function TableHeader({ persistentSort, onSortToggle }: TableHeaderProps) {
  const renderSortIcon = (column: string) => {
    if (persistentSort.sortBy !== column) return <Minus className="h-3 w-3 text-muted-foreground/50" />
    return persistentSort.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  return (
    <thead className="sticky top-0 z-20 bg-background border-b backdrop-blur-sm">
      <tr>
        {/* Fixed Token Header */}
        <th className="sticky left-0 z-30 w-[220px] px-4 py-3 text-left text-xs font-semibold bg-background border-r shadow-sm">
          TOKEN
        </th>
        
        {/* Scrollable Headers */}
        <th className="w-[80px] px-2 py-3 text-xs font-medium text-center border-r">
          GRAPH
        </th>
        <th 
          className="w-[70px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('age')}
        >
          <div className="flex items-center justify-center gap-1">
            AGE {renderSortIcon('age')}
          </div>
        </th>
        <th 
          className="w-[90px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('mcap')}
        >
          <div className="flex items-center justify-center gap-1">
            MCAP {renderSortIcon('mcap')}
          </div>
        </th>
        <th 
          className="w-[80px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('ath')}
        >
          <div className="flex items-center justify-center gap-1">
            ATH {renderSortIcon('ath')}
          </div>
        </th>
        <th 
          className="w-[80px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('volume')}
        >
          <div className="flex items-center justify-center gap-1">
            VOL {renderSortIcon('volume')}
          </div>
        </th>
        <th 
          className="w-[70px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('txns')}
        >
          <div className="flex items-center justify-center gap-1">
            TXN {renderSortIcon('txns')}
          </div>
        </th>
        <th 
          className="w-[80px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('traders')}
        >
          <div className="flex items-center justify-center gap-1">
            TRADERS {renderSortIcon('traders')}
          </div>
        </th>
        <th 
          className="w-[90px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('price_change')}
        >
          <div className="flex items-center justify-center gap-1">
            CHANGE {renderSortIcon('price_change')}
          </div>
        </th>
        <th 
          className="w-[60px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center border-r transition-colors" 
          onClick={() => onSortToggle('viewers')}
        >
          <div className="flex items-center justify-center gap-1">
            VIEWS {renderSortIcon('viewers')}
          </div>
        </th>
        <th 
          className="w-[100px] px-2 py-3 text-xs font-medium cursor-pointer hover:bg-muted/50 text-center transition-colors" 
          onClick={() => onSortToggle('creator')}
        >
          <div className="flex items-center justify-center gap-1">
            CREATOR {renderSortIcon('creator')}
          </div>
        </th>
        <th className="w-[80px] px-2 py-3 text-xs font-medium text-center">
          GMGN
        </th>
      </tr>
    </thead>
  )
}