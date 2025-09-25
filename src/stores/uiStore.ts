import { create } from 'zustand'

interface UIState {
  // View mode: 'table' | 'boxed'
  viewMode: 'table' | 'boxed'
  // Currently selected token mint for details/highlighting
  selectedMint: string | null
  // Current page for pagination
  currentPage: number
  // Page size for pagination
  pageSize: number
  // Search/filter query
  searchQuery: string
  // Sort configuration
  sortBy: string
  sortDirection: 'asc' | 'desc'
  // Audio playing state (if you have audio features)
  playingAudio: boolean
  // Any other ephemeral UI state
}

interface UIActions {
  setViewMode: (mode: 'table' | 'boxed') => void
  setSelectedMint: (mint: string | null) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearchQuery: (query: string) => void
  setSortBy: (field: string) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  toggleAudio: () => void
  resetFilters: () => void
}

const initialState: UIState = {
  viewMode: 'table',
  selectedMint: null,
  currentPage: 1,
  pageSize: 50,
  searchQuery: '',
  sortBy: 'created_timestamp',
  sortDirection: 'desc',
  playingAudio: false,
}

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  ...initialState,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedMint: (mint) => set({ selectedMint: mint }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (field) => set({ sortBy: field }),
  setSortDirection: (direction) => set({ sortDirection: direction }),
  toggleAudio: () => set((state) => ({ playingAudio: !state.playingAudio })),
  resetFilters: () => set({
    searchQuery: '',
    sortBy: 'created_timestamp',
    sortDirection: 'desc',
    currentPage: 1,
  }),
}))