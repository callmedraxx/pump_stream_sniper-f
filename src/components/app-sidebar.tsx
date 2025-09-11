"use client"

import * as React from "react"
import { IconInnerShadowTop } from "@tabler/icons-react"
// Button import removed - not used
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [maxBuyAmount, setMaxBuyAmount] = React.useState("")
  const [autoSnipe, setAutoSnipe] = React.useState(false)

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
      <SidebarContent>
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="maxBuy">Max Buy Amount</Label>
            <Input
              id="maxBuy"
              type="number"
              placeholder="Enter max buy amount"
              value={maxBuyAmount}
              onChange={(e) => setMaxBuyAmount(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="autoSnipe"
              checked={autoSnipe}
              onCheckedChange={setAutoSnipe}
            />
            <Label htmlFor="autoSnipe">Auto Snipe</Label>
          </div>
          {/* Add more parameters as needed */}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4">
          <WalletMultiButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
