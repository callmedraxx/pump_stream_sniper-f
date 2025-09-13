import { useCallback, useEffect, useState } from "react"
import { LiveToken, SortPreferences } from "@/types/token.types"
import {
  sortByAge,
  sortByMarketCap,
  sortByATH,
  sortByVolume,
  sortByTransactions,
  sortByTraders,
  sortByPriceChange,
  sortByViewers,
  sortBySymbol,
  sortByCreator,
  sortByTrending
} from "@/utils/sort.utils"

export const useTokenSorting = () => {
  const [persistentSort, setPersistentSort] = useState<SortPreferences>({
    sortBy: 'mcap',
    sortOrder: 'desc',
    dataTimePeriod: '24h'
  })

  // Load persistent sort preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedSort = localStorage.getItem('tokenTableSort')
      if (savedSort) {
        const sortPrefs = JSON.parse(savedSort)
        // Validate the saved preferences
        if (sortPrefs.sortBy && (sortPrefs.sortOrder === 'asc' || sortPrefs.sortOrder === 'desc') && sortPrefs.dataTimePeriod) {
          setPersistentSort(sortPrefs)
          console.log(`📊 Loaded saved sort preferences: ${sortPrefs.sortBy} ${sortPrefs.sortOrder} (${sortPrefs.dataTimePeriod})`)
        }
      }
    } catch (error) {
      console.warn('Failed to load sort preferences from localStorage:', error)
    }
  }, [])

  // Save persistent sort to localStorage
  const saveSortPreferences = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc', newDataTimePeriod: string) => {
    const sortPrefs = {
      sortBy: newSortBy,
      sortOrder: newSortOrder,
      dataTimePeriod: newDataTimePeriod
    }

    setPersistentSort(sortPrefs)
    
    try {
      localStorage.setItem('tokenTableSort', JSON.stringify(sortPrefs))
    } catch (e) {
      console.warn('Failed to save sort preferences to localStorage', e)
    }

    console.log(`🎯 Sort preferences saved: ${sortPrefs.sortBy} (${sortPrefs.sortOrder})`)
  }, [])

  // Unified function to sort tokens based on current sort criteria
  const sortTokens = useCallback((tokens: LiveToken[], overridePrefs?: SortPreferences): LiveToken[] => {
    if (tokens.length === 0) return tokens
    const prefs = overridePrefs || persistentSort

    let sortedTokens: LiveToken[]

    switch (prefs.sortBy) {
      case 'age':
        sortedTokens = sortByAge(tokens, prefs.sortOrder)
        break
      case 'mcap':
        sortedTokens = sortByMarketCap(tokens, prefs.sortOrder)
        break
      case 'ath':
        sortedTokens = sortByATH(tokens, prefs.sortOrder)
        break
      case 'volume':
        sortedTokens = sortByVolume(tokens, prefs.sortOrder, prefs.dataTimePeriod)
        break
      case 'txns':
        sortedTokens = sortByTransactions(tokens, prefs.sortOrder, prefs.dataTimePeriod)
        break
      case 'traders':
        sortedTokens = sortByTraders(tokens, prefs.sortOrder, prefs.dataTimePeriod)
        break
      case 'price_change':
        sortedTokens = sortByPriceChange(tokens, prefs.sortOrder, prefs.dataTimePeriod)
        break
      case 'viewers':
        sortedTokens = sortByViewers(tokens, prefs.sortOrder)
        break
      case 'creator':
        sortedTokens = sortByCreator(tokens, prefs.sortOrder)
        break
      case 'symbol':
        sortedTokens = sortBySymbol(tokens, prefs.sortOrder)
        break
      case 'trending':
        sortedTokens = sortByTrending(tokens, prefs.dataTimePeriod)
        break
      default:
        sortedTokens = sortByMarketCap(tokens, 'desc') // Default fallback: market cap highest first
    }

    return sortedTokens
  }, [persistentSort])

  return {
    persistentSort,
    saveSortPreferences,
    sortTokens
  }
}