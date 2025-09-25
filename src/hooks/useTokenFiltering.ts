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
        console.log('[useTokenFiltering] 📁 Loaded saved filters:', parsed)
        setPersistentFilters(parsed)
      } else {
        console.log('[useTokenFiltering] 📁 No saved filters, using null')
        setPersistentFilters(null)
      }
    } catch (e) {
      console.warn('Failed to load filters', e)
      console.log('[useTokenFiltering] 📁 Error loading filters, setting excludeMigrated: true')
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
    const filtered = applyFilters(tokens, effective)
    return filtered
  }, [persistentFilters])

  return {
    persistentFilters,
    saveFilters,
    filterTokens
  }
}

export default useTokenFiltering
