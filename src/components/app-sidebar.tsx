"use client"

import * as React from "react"
import { IconInnerShadowTop, IconFilter, IconX, IconSettings, IconInfoCircle, IconLoader } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FilterPreferences } from '@/utils/filter.utils'
// Wallet UI triggers client-only behavior; dynamically import to avoid SSR hydration mismatches
import dynamic from 'next/dynamic'
const WalletMultiButton = dynamic(
  // import the component only on the client
  () => import('@solana/wallet-adapter-react-ui').then(m => m.WalletMultiButton),
  { ssr: false }
)
import { useWallet } from "@solana/wallet-adapter-react"
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
  quickSellPercent?: number
  onQuickSellChange?: (p: number) => void
}

export function AppSidebar({ filters, onSaveFilters, quickSellPercent, onQuickSellChange, ...props }: AppSidebarProps) {
  const wallet = useWallet()
  const [buyAmountSOL, setBuyAmountSOL] = React.useState("")
  const [enableSimulation, setEnableSimulation] = React.useState(true)
  const [slippageTolerance, setSlippageTolerance] = React.useState("5")
  const [maxRetries, setMaxRetries] = React.useState("3")
  
  // Filter states
  const [minViewers, setMinViewers] = React.useState<number | undefined>(filters?.minViewers)
  const [maxViewers, setMaxViewers] = React.useState<number | undefined>(filters?.maxViewers)
  const [minTraders, setMinTraders] = React.useState<number | undefined>(filters?.minTraders)
  const [maxTraders, setMaxTraders] = React.useState<number | undefined>(filters?.maxTraders)
  const [minUsdMarketCap, setMinUsdMarketCap] = React.useState<number | undefined>(filters?.minUsdMarketCap)
  const [maxUsdMarketCap, setMaxUsdMarketCap] = React.useState<number | undefined>(filters?.maxUsdMarketCap)
  const [minAgeDays, setMinAgeDays] = React.useState<number | undefined>((filters as any)?.minAgeDays)
  const [maxAgeDays, setMaxAgeDays] = React.useState<number | undefined>((filters as any)?.maxAgeDays)
  const [minVolume24h, setMinVolume24h] = React.useState<number | undefined>((filters as any)?.minVolume24h)
  const [maxVolume24h, setMaxVolume24h] = React.useState<number | undefined>((filters as any)?.maxVolume24h)
  const [minTxns24h, setMinTxns24h] = React.useState<number | undefined>((filters as any)?.minTxns24h)
  const [maxTxns24h, setMaxTxns24h] = React.useState<number | undefined>((filters as any)?.maxTxns24h)
  const [creatorContains, setCreatorContains] = React.useState<string | undefined>((filters as any)?.creatorContains)
  // Always show only migrated tokens by default and enforce it in the sidebar
  const [excludeMigrated, setExcludeMigrated] = React.useState<boolean>((filters as any)?.excludeMigrated ?? false)
  // new: show only migrated tokens toggle
  const [onlyMigrated, setOnlyMigrated] = React.useState<boolean>((filters as any)?.onlyMigrated ?? false)
  // Dev-related filter states
  const [minCreatedCount, setMinCreatedCount] = React.useState<number | undefined>((filters as any)?.minCreatedCount)
  const [maxCreatedCount, setMaxCreatedCount] = React.useState<number | undefined>((filters as any)?.maxCreatedCount)
  const [minCreatorBalanceSol, setMinCreatorBalanceSol] = React.useState<number | undefined>((filters as any)?.minCreatorBalanceSol)
  const [maxCreatorBalanceSol, setMaxCreatorBalanceSol] = React.useState<number | undefined>((filters as any)?.maxCreatorBalanceSol)
  const [minCreatorBalanceUsd, setMinCreatorBalanceUsd] = React.useState<number | undefined>((filters as any)?.minCreatorBalanceUsd)
  const [maxCreatorBalanceUsd, setMaxCreatorBalanceUsd] = React.useState<number | undefined>((filters as any)?.maxCreatorBalanceUsd)
  const [hasTelegram, setHasTelegram] = React.useState<boolean>((filters as any)?.hasTelegram ?? false)
  const [hasSocials, setHasSocials] = React.useState<boolean>((filters as any)?.hasSocials ?? false)
  const [mcapNearAthPercent, setMcapNearAthPercent] = React.useState<number | undefined>((filters as any)?.mcapNearAthPercent)
  
  // Notification filter states
  const [notifyMinViewers, setNotifyMinViewers] = React.useState<number | undefined>((filters as any)?.notifyMinViewers)
  const [notifyMaxViewers, setNotifyMaxViewers] = React.useState<number | undefined>((filters as any)?.notifyMaxViewers)
  const [notifyMinTraders, setNotifyMinTraders] = React.useState<number | undefined>((filters as any)?.notifyMinTraders)
  const [notifyMaxTraders, setNotifyMaxTraders] = React.useState<number | undefined>((filters as any)?.notifyMaxTraders)
  const [notifyMinUsdMarketCap, setNotifyMinUsdMarketCap] = React.useState<number | undefined>((filters as any)?.notifyMinUsdMarketCap)
  const [notifyMaxUsdMarketCap, setNotifyMaxUsdMarketCap] = React.useState<number | undefined>((filters as any)?.notifyMaxUsdMarketCap)
  const [notifyMinVolume24h, setNotifyMinVolume24h] = React.useState<number | undefined>((filters as any)?.notifyMinVolume24h)
  const [notifyMaxVolume24h, setNotifyMaxVolume24h] = React.useState<number | undefined>((filters as any)?.notifyMaxVolume24h)
  const [notifyMinTxns24h, setNotifyMinTxns24h] = React.useState<number | undefined>((filters as any)?.notifyMinTxns24h)
  const [notifyMaxTxns24h, setNotifyMaxTxns24h] = React.useState<number | undefined>((filters as any)?.notifyMaxTxns24h)
  const [notifyHasSocials, setNotifyHasSocials] = React.useState<boolean>((filters as any)?.notifyHasSocials ?? false)
  const [notifyHasTelegram, setNotifyHasTelegram] = React.useState<boolean>((filters as any)?.notifyHasTelegram ?? false)

  // Loading state for filter application
  const [isApplyingFilters, setIsApplyingFilters] = React.useState(false)

  // Load persisted trading settings
  React.useEffect(() => {
    try {
      const savedBuyAmount = localStorage.getItem('buyAmountSOL')
      const savedSimulation = localStorage.getItem('enableSimulation')
      const savedSlippage = localStorage.getItem('slippageTolerance')
      const savedRetries = localStorage.getItem('maxRetries')
      
      if (savedBuyAmount) setBuyAmountSOL(savedBuyAmount)
      if (savedSimulation) setEnableSimulation(savedSimulation === 'true')
      if (savedSlippage) setSlippageTolerance(savedSlippage)
      if (savedRetries) setMaxRetries(savedRetries)
    } catch (e) {
      console.warn('Failed to load trading settings:', e)
    }
  }, [])

  const clearAllFilters = () => {
    setMinViewers(undefined)
    setMaxViewers(undefined)
    setMinTraders(undefined)
    setMaxTraders(undefined)
    setMinUsdMarketCap(undefined)
    setMaxUsdMarketCap(undefined)
    setMinAgeDays(undefined)
    setMaxAgeDays(undefined)
    setMinVolume24h(undefined)
    setMaxVolume24h(undefined)
    setMinTxns24h(undefined)
    setMaxTxns24h(undefined)
    setCreatorContains(undefined)
    setMinCreatedCount(undefined)
    setMaxCreatedCount(undefined)
    setMinCreatorBalanceSol(undefined)
    setMaxCreatorBalanceSol(undefined)
    setMinCreatorBalanceUsd(undefined)
    setMaxCreatorBalanceUsd(undefined)
    setHasTelegram(false)
    setHasSocials(false)
    setMcapNearAthPercent(undefined)
    // Clear notification filters
    setNotifyMinViewers(undefined)
    setNotifyMaxViewers(undefined)
    setNotifyMinTraders(undefined)
    setNotifyMaxTraders(undefined)
    setNotifyMinUsdMarketCap(undefined)
    setNotifyMaxUsdMarketCap(undefined)
    setNotifyMinVolume24h(undefined)
    setNotifyMaxVolume24h(undefined)
    setNotifyMinTxns24h(undefined)
    setNotifyMaxTxns24h(undefined)
    setNotifyHasSocials(false)
    setNotifyHasTelegram(false)
  // keep migrated-only filter applied
  setExcludeMigrated(false)
  setOnlyMigrated(false)
    onSaveFilters?.(null)
  }

  const applyFilters = async () => {
    if (isApplyingFilters) return // Prevent multiple clicks
    
    setIsApplyingFilters(true)
    try {
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      
      onSaveFilters?.({
        minViewers,
        maxViewers,
        minTraders,
        maxTraders,
        minUsdMarketCap,
        maxUsdMarketCap,
        minAgeDays,
        maxAgeDays,
        minVolume24h,
        maxVolume24h,
        minTxns24h,
        maxTxns24h,
        creatorContains,
    excludeMigrated,
    onlyMigrated
        ,minCreatedCount,
        maxCreatedCount,
        minCreatorBalanceSol,
        maxCreatorBalanceSol,
        minCreatorBalanceUsd,
        maxCreatorBalanceUsd,
        hasTelegram,
        hasSocials,
        mcapNearAthPercent,
        // Notification filters
        notifyMinViewers,
        notifyMaxViewers,
        notifyMinTraders,
        notifyMaxTraders,
        notifyMinUsdMarketCap,
        notifyMaxUsdMarketCap,
        notifyMinVolume24h,
        notifyMaxVolume24h,
        notifyMinTxns24h,
        notifyMaxTxns24h,
        notifyHasSocials,
        notifyHasTelegram
      })
    } finally {
      setIsApplyingFilters(false)
    }
  }

  // Persist buy amount and trading settings
  React.useEffect(() => {
    try {
      if (buyAmountSOL) localStorage.setItem('buyAmountSOL', buyAmountSOL)
      else localStorage.removeItem('buyAmountSOL')
      
      localStorage.setItem('enableSimulation', enableSimulation.toString())
      localStorage.setItem('slippageTolerance', slippageTolerance)
      localStorage.setItem('maxRetries', maxRetries)
    } catch (e) {
      console.warn('Failed to save trading settings:', e)
    }
  }, [buyAmountSOL, enableSimulation, slippageTolerance, maxRetries])

  // Track mount so we don't apply client-only selected styles during SSR
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sync UI state when parent 'filters' prop changes
  React.useEffect(() => {
    setMinViewers(filters?.minViewers)
    setMaxViewers(filters?.maxViewers)
    setMinTraders(filters?.minTraders)
    setMaxTraders(filters?.maxTraders)
    setMinUsdMarketCap(filters?.minUsdMarketCap)
    setMaxUsdMarketCap(filters?.maxUsdMarketCap)
    setMinAgeDays((filters as any)?.minAgeDays)
    setMaxAgeDays((filters as any)?.maxAgeDays)
    setMinVolume24h((filters as any)?.minVolume24h)
    setMaxVolume24h((filters as any)?.maxVolume24h)
    setMinTxns24h((filters as any)?.minTxns24h)
    setMaxTxns24h((filters as any)?.maxTxns24h)
    setCreatorContains((filters as any)?.creatorContains)
    setExcludeMigrated((filters as any)?.excludeMigrated ?? false)
    setOnlyMigrated((filters as any)?.onlyMigrated ?? false)
      setMinCreatedCount((filters as any)?.minCreatedCount)
      setMaxCreatedCount((filters as any)?.maxCreatedCount)
      setMinCreatorBalanceSol((filters as any)?.minCreatorBalanceSol)
      setMaxCreatorBalanceSol((filters as any)?.maxCreatorBalanceSol)
      setMinCreatorBalanceUsd((filters as any)?.minCreatorBalanceUsd)
      setMaxCreatorBalanceUsd((filters as any)?.maxCreatorBalanceUsd)
      setHasTelegram((filters as any)?.hasTelegram ?? false)
      setHasSocials((filters as any)?.hasSocials ?? false)
      setMcapNearAthPercent((filters as any)?.mcapNearAthPercent)
      // Sync notification filter states
      setNotifyMinViewers((filters as any)?.notifyMinViewers)
      setNotifyMaxViewers((filters as any)?.notifyMaxViewers)
      setNotifyMinTraders((filters as any)?.notifyMinTraders)
      setNotifyMaxTraders((filters as any)?.notifyMaxTraders)
      setNotifyMinUsdMarketCap((filters as any)?.notifyMinUsdMarketCap)
      setNotifyMaxUsdMarketCap((filters as any)?.notifyMaxUsdMarketCap)
      setNotifyMinVolume24h((filters as any)?.notifyMinVolume24h)
      setNotifyMaxVolume24h((filters as any)?.notifyMaxVolume24h)
      setNotifyMinTxns24h((filters as any)?.notifyMinTxns24h)
      setNotifyMaxTxns24h((filters as any)?.notifyMaxTxns24h)
      setNotifyHasSocials((filters as any)?.notifyHasSocials ?? false)
      setNotifyHasTelegram((filters as any)?.notifyHasTelegram ?? false)
  }, [filters])

  // Show a Sonner toast on wallet connect (replaces Alert component)
  React.useEffect(() => {
    if (wallet && wallet.connected && wallet.publicKey) {
      try {
        toast.success(`Wallet connected: ${wallet.publicKey.toString().slice(0, 8)}...`)
      } catch (e) {}
    }
  }, [wallet?.connected, wallet?.publicKey])

  return (
    <TooltipProvider>
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
            {/* Wallet connect toast is shown on client when wallet becomes connected */}

            {/* Trading Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <IconSettings className="size-4" />
                <h3 className="text-sm font-semibold text-white">Trading Settings</h3>
              </div>
              
              <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="buyAmountSOL" className="text-xs text-gray-400">Buy Amount (SOL)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <IconInfoCircle className="size-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-48">Amount of SOL to spend when buying tokens. This will be used for all buy transactions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="buyAmountSOL"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.1"
                    value={buyAmountSOL}
                    onChange={(e) => setBuyAmountSOL(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-400">Quick Sell Percentages</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <IconInfoCircle className="size-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-48">Choose what percentage of your tokens to sell with one click</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-1">
                    {[25, 50, 75, 100].map(p => {
                      const isSelected = quickSellPercent === p
                      const baseClass = "text-xs px-2 py-1 rounded transition-colors"
                      const selectedClass = "bg-red-600 hover:bg-red-700 text-white"
                      const unselectedClass = "bg-gray-200 dark:bg-muted/30 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-muted/50"
                      const appliedClass = mounted && isSelected ? `${baseClass} ${selectedClass}` : `${baseClass} ${unselectedClass}`
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            try {
                              onQuickSellChange?.(p)
                              localStorage.setItem('quickSellPercent', String(p))
                            } catch(e){}
                          }}
                          className={appliedClass}
                          title={`Sell ${p}%`}
                        >
                          {p}%
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="slippageTolerance" className="text-xs text-gray-400">Slippage %</Label>
                    <Input
                      id="slippageTolerance"
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      placeholder="5"
                      value={slippageTolerance}
                      onChange={(e) => setSlippageTolerance(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="maxRetries" className="text-xs text-gray-400">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min="0"
                      max="10"
                      placeholder="3"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="enableSimulation" className="text-xs text-gray-400">Simulate Before Send</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <IconInfoCircle className="size-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-48">Test transactions before executing them. Recommended for safety.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch 
                    id="enableSimulation" 
                    checked={enableSimulation} 
                    onCheckedChange={setEnableSimulation}
                    className="scale-75"
                  />
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <IconFilter className="size-4" />
                <h3 className="text-sm font-semibold text-white">Token Filters</h3>
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

              {/* Max filters */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="maxViewers" className="text-xs text-gray-400">Max Viewers</Label>
                  <Input 
                    id="maxViewers" 
                    type="number" 
                    placeholder="0"
                    value={maxViewers ?? ''} 
                    onChange={(e) => setMaxViewers(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm" 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="maxTraders" className="text-xs text-gray-400">Max Traders</Label>
                  <Input 
                    id="maxTraders" 
                    type="number" 
                    placeholder="0"
                    value={maxTraders ?? ''} 
                    onChange={(e) => setMaxTraders(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm" 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="maxUsdMarketCap" className="text-xs text-gray-400">Max Market Cap</Label>
                  <Input 
                    id="maxUsdMarketCap" 
                    type="number" 
                    placeholder="1000000"
                    value={maxUsdMarketCap ?? ''} 
                    onChange={(e) => setMaxUsdMarketCap(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm" 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="maxAgeDays" className="text-xs text-gray-400">Max Age (days)</Label>
                  <Input 
                    id="maxAgeDays" 
                    type="number" 
                    placeholder="30"
                    value={maxAgeDays ?? ''} 
                    onChange={(e) => setMaxAgeDays(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm" 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="maxVolume24h" className="text-xs text-gray-400">Max Volume 24h</Label>
                  <Input 
                    id="maxVolume24h" 
                    type="number" 
                    placeholder="100000"
                    value={maxVolume24h ?? ''} 
                    onChange={(e) => setMaxVolume24h(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm" 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="maxTxns24h" className="text-xs text-gray-400">Max Txns 24h</Label>
                  <Input 
                    id="maxTxns24h" 
                    type="number" 
                    placeholder="1000"
                    value={maxTxns24h ?? ''} 
                    onChange={(e) => setMaxTxns24h(e.target.value ? Number(e.target.value) : undefined)}
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
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="minCreatedCount" className="text-xs text-gray-400">Min Created Count</Label>
                    <Input
                      id="minCreatedCount"
                      type="number"
                      placeholder="0"
                      value={minCreatedCount ?? ''}
                      onChange={(e) => setMinCreatedCount(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minCreatorBalanceSol" className="text-xs text-gray-400">Min Creator Balance (SOL)</Label>
                    <Input
                      id="minCreatorBalanceSol"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={minCreatorBalanceSol ?? ''}
                      onChange={(e) => setMinCreatorBalanceSol(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div>
                    <Label htmlFor="minCreatorBalanceUsd" className="text-xs text-gray-400">Min Creator Balance (USD)</Label>
                    <Input
                      id="minCreatorBalanceUsd"
                      type="number"
                      step="1"
                      placeholder="0"
                      value={minCreatorBalanceUsd ?? ''}
                      onChange={(e) => setMinCreatorBalanceUsd(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="maxCreatedCount" className="text-xs text-gray-400">Max Created Count</Label>
                    <Input
                      id="maxCreatedCount"
                      type="number"
                      placeholder="100"
                      value={maxCreatedCount ?? ''}
                      onChange={(e) => setMaxCreatedCount(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxCreatorBalanceSol" className="text-xs text-gray-400">Max Creator Balance (SOL)</Label>
                    <Input
                      id="maxCreatorBalanceSol"
                      type="number"
                      step="0.01"
                      placeholder="100"
                      value={maxCreatorBalanceSol ?? ''}
                      onChange={(e) => setMaxCreatorBalanceSol(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div>
                    <Label htmlFor="maxCreatorBalanceUsd" className="text-xs text-gray-400">Max Creator Balance (USD)</Label>
                    <Input
                      id="maxCreatorBalanceUsd"
                      type="number"
                      step="1"
                      placeholder="10000"
                      value={maxCreatorBalanceUsd ?? ''}
                      onChange={(e) => setMaxCreatorBalanceUsd(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">Has Telegram</p>
                  <Switch id="hasTelegram" checked={hasTelegram} onCheckedChange={(v) => setHasTelegram(Boolean(v))} className="scale-75" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">Has Socials</p>
                  <Switch id="hasSocials" checked={hasSocials} onCheckedChange={(v) => setHasSocials(Boolean(v))} className="scale-75" />
                </div>
                <div className="space-y-1 mt-2">
                  <Label htmlFor="mcapNearAthPercent" className="text-xs text-gray-400">MCap Near ATH (%)</Label>
                  <Input
                    id="mcapNearAthPercent"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="10"
                    value={mcapNearAthPercent ?? ''}
                    onChange={(e) => setMcapNearAthPercent(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Migration filters: only migrated */}
              <div className="py-1 grid grid-cols-1 gap-2">

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Show only migrated tokens</p>
                  </div>
                  <Switch
                    id="onlyMigrated"
                    checked={onlyMigrated}
                    onCheckedChange={(v) => setOnlyMigrated(Boolean(v))}
                    className="scale-75"
                  />
                </div>
              </div>

              {/* Notification Filters Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <IconSettings className="size-4" />
                  <h3 className="text-sm font-semibold text-white">Notification Filters</h3>
                  <Tooltip>
                    <TooltipTrigger>
                      <IconInfoCircle className="size-3 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-48">Only receive notifications for new live tokens that match these criteria. Leave empty to get notified for all new tokens.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Notification Filter Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="notifyMinViewers" className="text-xs text-gray-400">Min Viewers</Label>
                    <Input
                      id="notifyMinViewers"
                      type="number"
                      placeholder="0"
                      value={notifyMinViewers ?? ''}
                      onChange={(e) => setNotifyMinViewers(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMinTraders" className="text-xs text-gray-400">Min Traders</Label>
                    <Input
                      id="notifyMinTraders"
                      type="number"
                      placeholder="0"
                      value={notifyMinTraders ?? ''}
                      onChange={(e) => setNotifyMinTraders(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMinUsdMarketCap" className="text-xs text-gray-400">Min Market Cap</Label>
                    <Input
                      id="notifyMinUsdMarketCap"
                      type="number"
                      placeholder="1000"
                      value={notifyMinUsdMarketCap ?? ''}
                      onChange={(e) => setNotifyMinUsdMarketCap(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMinVolume24h" className="text-xs text-gray-400">Min Volume 24h</Label>
                    <Input
                      id="notifyMinVolume24h"
                      type="number"
                      placeholder="1000"
                      value={notifyMinVolume24h ?? ''}
                      onChange={(e) => setNotifyMinVolume24h(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMinTxns24h" className="text-xs text-gray-400">Min Txns 24h</Label>
                    <Input
                      id="notifyMinTxns24h"
                      type="number"
                      placeholder="10"
                      value={notifyMinTxns24h ?? ''}
                      onChange={(e) => setNotifyMinTxns24h(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMaxViewers" className="text-xs text-gray-400">Max Viewers</Label>
                    <Input
                      id="notifyMaxViewers"
                      type="number"
                      placeholder="1000"
                      value={notifyMaxViewers ?? ''}
                      onChange={(e) => setNotifyMaxViewers(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMaxTraders" className="text-xs text-gray-400">Max Traders</Label>
                    <Input
                      id="notifyMaxTraders"
                      type="number"
                      placeholder="100"
                      value={notifyMaxTraders ?? ''}
                      onChange={(e) => setNotifyMaxTraders(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMaxUsdMarketCap" className="text-xs text-gray-400">Max Market Cap</Label>
                    <Input
                      id="notifyMaxUsdMarketCap"
                      type="number"
                      placeholder="100000"
                      value={notifyMaxUsdMarketCap ?? ''}
                      onChange={(e) => setNotifyMaxUsdMarketCap(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMaxVolume24h" className="text-xs text-gray-400">Max Volume 24h</Label>
                    <Input
                      id="notifyMaxVolume24h"
                      type="number"
                      placeholder="100000"
                      value={notifyMaxVolume24h ?? ''}
                      onChange={(e) => setNotifyMaxVolume24h(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notifyMaxTxns24h" className="text-xs text-gray-400">Max Txns 24h</Label>
                    <Input
                      id="notifyMaxTxns24h"
                      type="number"
                      placeholder="1000"
                      value={notifyMaxTxns24h ?? ''}
                      onChange={(e) => setNotifyMaxTxns24h(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">Has Socials</p>
                  <Switch id="notifyHasSocials" checked={notifyHasSocials} onCheckedChange={(v) => setNotifyHasSocials(Boolean(v))} className="scale-75" />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">Has Telegram</p>
                  <Switch id="notifyHasTelegram" checked={notifyHasTelegram} onCheckedChange={(v) => setNotifyHasTelegram(Boolean(v))} className="scale-75" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={applyFilters}
                  disabled={isApplyingFilters}
                  className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white"
                  size="sm"
                >
                  {isApplyingFilters ? (
                    <>
                      <IconLoader className="size-3 mr-1 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Apply Filters'
                  )}
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

            {/* Trading Info */}
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">VibeStation Integration</h4>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>• All transactions use VibeStation RPC</p>
                <p>• Transactions are simulated for safety</p>
                <p>• You sign all transactions locally</p>
                <p>• No server-side execution required</p>
              </div>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter>
          <div className="p-3">
            <div className="w-full [&>button]:w-full [&>button]:justify-center [&>button]:text-sm [&>button]:h-9">
              <WalletMultiButton />
            </div>
            {!wallet.connected && (
              <p className="text-xs text-center text-gray-500 mt-2">
                Connect wallet to start trading
              </p>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}