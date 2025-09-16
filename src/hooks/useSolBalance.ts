import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { callVibeRpc } from '@/lib/solana'

export interface BalanceInfo {
  lamports: number
  sol: number
  error: string | null
}

export function useSolBalance(pollInterval: number = 5000): BalanceInfo {
  const { publicKey, connected } = useWallet()
  const [balance, setBalance] = useState<BalanceInfo>({
    lamports: 0,
    sol: 0,
    error: null
  })

  const fetchBalance = async (silent: boolean = false) => {
    if (!publicKey || !connected) {
      setBalance(prev => ({ ...prev, lamports: 0, sol: 0, error: null }))
      return
    }

    try {
      const response = await callVibeRpc('getBalance', [
        publicKey.toString(),
        { commitment: 'confirmed' }
      ])

      const lamports = response.value || 0
      const sol = lamports / 1_000_000_000

      setBalance({
        lamports,
        sol,
        error: null
      })
    } catch (error: any) {
      console.error('Failed to fetch SOL balance:', error)
      // Only update error on first fetch, not during polling
      if (!silent) {
        setBalance(prev => ({
          ...prev,
          error: error.message || 'Failed to fetch balance'
        }))
      }
    }
  }

  useEffect(() => {
    // Initial fetch (can show errors)
    fetchBalance(false)

    // Set up polling (silent updates)
    const interval = setInterval(() => fetchBalance(true), pollInterval)

    return () => clearInterval(interval)
  }, [publicKey, connected, pollInterval])

  return balance
}