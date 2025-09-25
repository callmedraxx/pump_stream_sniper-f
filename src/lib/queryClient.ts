import { QueryClient } from '@tanstack/react-query'

// Single shared QueryClient instance for the app.
// Import this from non-React modules (like your WebSocket service) to
// update cached data (queryClient.setQueryData) when WebSocket events arrive.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10, // 10s
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})