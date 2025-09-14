import { useCallback, useEffect, useState } from 'react'
import { LiveToken } from '@/types/token.types'
import { applyFilters, FilterPreferences } from '@/utils/filter.utils'

export const useTokenFiltering = () => {
  const [persistentFilters, setPersistentFilters] = useState<FilterPreferences | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tokenTableFilters')
      if (saved) {
        setPersistentFilters(JSON.parse(saved))
      }
    } catch (e) {
      console.warn('Failed to load filters', e)
    }
  }, [])

  const saveFilters = useCallback((filters: FilterPreferences | null) => {
    setPersistentFilters(filters)
    try {
      if (filters) localStorage.setItem('tokenTableFilters', JSON.stringify(filters))
      else localStorage.removeItem('tokenTableFilters')
    } catch (e) {
      console.warn('Failed to save filters', e)
    }
  }, [])

  const filterTokens = useCallback((tokens: LiveToken[]) => {
    if (!tokens || tokens.length === 0) return tokens
    return applyFilters(tokens, persistentFilters)
  }, [persistentFilters])

  return {
    persistentFilters,
    saveFilters,
    filterTokens
  }
}

export default useTokenFiltering
