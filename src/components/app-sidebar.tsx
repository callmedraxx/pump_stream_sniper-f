"use client"

import * as React from "react"
import { IconInnerShadowTop, IconFilter, IconX } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import type { FilterPreferences } from '@/utils/filter.utils'
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  filters?: FilterPreferences | null
  onSaveFilters?: (filters: FilterPreferences | null) => void
}

export function AppSidebar({ filters, onSaveFilters, ...props }: AppSidebarProps) {
  const [maxBuyAmount, setMaxBuyAmount] = React.useState("")
  const [autoSnipe, setAutoSnipe] = React.useState(false)
  const [minViewers, setMinViewers] = React.useState<number | undefined>(filters?.minViewers)
  const [minTraders, setMinTraders] = React.useState<number | undefined>(filters?.minTraders)
  const [minUsdMarketCap, setMinUsdMarketCap] = React.useState<number | undefined>(filters?.minUsdMarketCap)
  const [minAgeDays, setMinAgeDays] = React.useState<number | undefined>((filters as any)?.minAgeDays)
  const [minVolume24h, setMinVolume24h] = React.useState<number | undefined>((filters as any)?.minVolume24h)
  const [minTxns24h, setMinTxns24h] = React.useState<number | undefined>((filters as any)?.minTxns24h)
  const [creatorContains, setCreatorContains] = React.useState<string | undefined>((filters as any)?.creatorContains)
  const [excludeMigrated, setExcludeMigrated] = React.useState<boolean>((filters as any)?.excludeMigrated ?? false)

  const clearAllFilters = () => {
    setMinViewers(undefined)
    setMinTraders(undefined)
    setMinUsdMarketCap(undefined)
    setMinAgeDays(undefined)
    setMinVolume24h(undefined)
    setMinTxns24h(undefined)
    setCreatorContains(undefined)
    setExcludeMigrated(false)
    onSaveFilters?.(null)
  }

  const applyFilters = () => {
    onSaveFilters?.({
      minViewers,
      minTraders,
      minUsdMarketCap,
      minAgeDays,
      minVolume24h,
      minTxns24h,
      creatorContains,
      excludeMigrated
    })
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <div>
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">PumpFun Stream Sniper</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Trading Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Trading</h3>
            <div className="space-y-2">
              <Label htmlFor="maxBuy" className="text-xs text-gray-400">Max Buy Amount</Label>
              <Input
                id="maxBuy"
                type="number"
                placeholder="0.1"
                value={maxBuyAmount}
                onChange={(e) => setMaxBuyAmount(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoSnipe" className="text-xs text-gray-400">Auto Snipe</Label>
              <Switch
                id="autoSnipe"
                checked={autoSnipe}
                onCheckedChange={setAutoSnipe}
                className="scale-75"
              />
            </div>
          </div>

          {/* Filters Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <IconFilter className="size-4" />
              <h3 className="text-sm font-semibold text-white">Filters</h3>
            </div>
            
            {/* Filter Grid - 2 columns for better space usage */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="minViewers" className="text-xs text-gray-400">Min Viewers</Label>
                <Input 
                  id="minViewers" 
                  type="number" 
                  placeholder="0"
                  value={minViewers ?? ''} 
                  onChange={(e) => setMinViewers(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-sm" 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="minTraders" className="text-xs text-gray-400">Min Traders</Label>
                <Input 
                  id="minTraders" 
                  type="number" 
                  placeholder="0"
                  value={minTraders ?? ''} 
                  onChange={(e) => setMinTraders(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-sm" 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="minUsdMarketCap" className="text-xs text-gray-400">Min Market Cap</Label>
                <Input 
                  id="minUsdMarketCap" 
                  type="number" 
                  placeholder="1000"
                  value={minUsdMarketCap ?? ''} 
                  onChange={(e) => setMinUsdMarketCap(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-sm" 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="minAgeDays" className="text-xs text-gray-400">Min Age (days)</Label>
                <Input 
                  id="minAgeDays" 
                  type="number" 
                  placeholder="0"
                  value={minAgeDays ?? ''} 
                  onChange={(e) => setMinAgeDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-sm" 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="minVolume24h" className="text-xs text-gray-400">Min Volume 24h</Label>
                <Input 
                  id="minVolume24h" 
                  type="number" 
                  placeholder="0"
                  value={minVolume24h ?? ''} 
                  onChange={(e) => setMinVolume24h(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-sm" 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="minTxns24h" className="text-xs text-gray-400">Min Txns 24h</Label>
                <Input 
                  id="minTxns24h" 
                  type="number" 
                  placeholder="0"
                  value={minTxns24h ?? ''} 
                  onChange={(e) => setMinTxns24h(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-8 text-sm" 
                />
              </div>
            </div>

            {/* Full width inputs */}
            <div className="space-y-2">
              <Label htmlFor="creatorContains" className="text-xs text-gray-400">Creator Contains</Label>
              <Input 
                id="creatorContains" 
                type="text" 
                placeholder="wallet address or partial..."
                value={creatorContains ?? ''} 
                onChange={(e) => setCreatorContains(e.target.value ? e.target.value : undefined)}
                className="h-8 text-sm" 
              />
            </div>

            {/* Switch for migration filter */}
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="excludeMigrated" className="text-xs text-gray-400">Show only migrated tokens</Label>
              <Switch 
                id="excludeMigrated" 
                checked={excludeMigrated} 
                onCheckedChange={setExcludeMigrated}
                className="scale-75"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={applyFilters}
                className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                Apply Filters
              </Button>
              <Button
                onClick={clearAllFilters}
                variant="outline"
                className="h-8 px-2 text-xs font-medium border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                size="sm"
              >
                <IconX className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3">
          <div className="w-full [&>button]:w-full [&>button]:justify-center [&>button]:text-sm [&>button]:h-9">
            <WalletMultiButton />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
