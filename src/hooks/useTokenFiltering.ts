import { useCallback, useEffect, useState } from 'react'
import { LiveToken } from '@/types/token.types'
import { applyFilters, FilterPreferences } from '@/utils/filter.utils'

export const useTokenFiltering = () => {
  const [persistentFilters, setPersistentFilters] = useState<FilterPreferences | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tokenTableFilters')
      if (saved) {
        const parsed = JSON.parse(saved) as FilterPreferences
        setPersistentFilters(parsed)
      } else {
        setPersistentFilters(null)
      }
    } catch (e) {
      console.warn('Failed to load filters', e)
      setPersistentFilters({ excludeMigrated: true })
    }
  }, [])

  const saveFilters = useCallback((filters: FilterPreferences | null) => {
  const toSave: FilterPreferences = { ...(filters || {}) }
  setPersistentFilters(toSave)
    try {
      localStorage.setItem('tokenTableFilters', JSON.stringify(toSave))
    } catch (e) {
      console.warn('Failed to save filters', e)
    }
  }, [])

  const filterTokens = useCallback((tokens: LiveToken[]) => {
    if (!tokens || tokens.length === 0) return tokens
  const effective = { ...(persistentFilters || {}) }
  return applyFilters(tokens, effective)
  }, [persistentFilters])

  return {
    persistentFilters,
    saveFilters,
    filterTokens
  }
}

export default useTokenFiltering
