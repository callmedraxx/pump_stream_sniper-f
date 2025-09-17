"use client"

import * as React from "react"
import { IconInnerShadowTop, IconFilter, IconX, IconSettings, IconInfoCircle } from "@tabler/icons-react"
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
  const [minTraders, setMinTraders] = React.useState<number | undefined>(filters?.minTraders)
  const [minUsdMarketCap, setMinUsdMarketCap] = React.useState<number | undefined>(filters?.minUsdMarketCap)
  const [minAgeDays, setMinAgeDays] = React.useState<number | undefined>((filters as any)?.minAgeDays)
  const [minVolume24h, setMinVolume24h] = React.useState<number | undefined>((filters as any)?.minVolume24h)
  const [minTxns24h, setMinTxns24h] = React.useState<number | undefined>((filters as any)?.minTxns24h)
  const [creatorContains, setCreatorContains] = React.useState<string | undefined>((filters as any)?.creatorContains)
  // Always show only migrated tokens by default and enforce it in the sidebar
  const [excludeMigrated, setExcludeMigrated] = React.useState<boolean>((filters as any)?.excludeMigrated ?? false)
  // new: show only migrated tokens toggle
  const [onlyMigrated, setOnlyMigrated] = React.useState<boolean>((filters as any)?.onlyMigrated ?? false)

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
    setMinTraders(undefined)
    setMinUsdMarketCap(undefined)
    setMinAgeDays(undefined)
    setMinVolume24h(undefined)
    setMinTxns24h(undefined)
    setCreatorContains(undefined)
  // keep migrated-only filter applied
  setExcludeMigrated(false)
  setOnlyMigrated(false)
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
  excludeMigrated,
  onlyMigrated
    })
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
    setMinTraders(filters?.minTraders)
    setMinUsdMarketCap(filters?.minUsdMarketCap)
    setMinAgeDays((filters as any)?.minAgeDays)
    setMinVolume24h((filters as any)?.minVolume24h)
    setMinTxns24h((filters as any)?.minTxns24h)
    setCreatorContains((filters as any)?.creatorContains)
    setExcludeMigrated((filters as any)?.excludeMigrated ?? false)
    setOnlyMigrated((filters as any)?.onlyMigrated ?? false)
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