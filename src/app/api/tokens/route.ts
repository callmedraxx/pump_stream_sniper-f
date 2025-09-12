import { NextRequest, NextResponse } from 'next/server'
import { tokenStorage } from '@/lib/token-storage'

// GET endpoint to fetch current tokens
export async function GET(request: NextRequest) {
  try {
    const tokensData = tokenStorage.getTokens()

    if (!tokensData) {
      console.log('📭 No tokens data available in storage (serverless environment)')
      return NextResponse.json(
        {
          event: 'live_tokens_update',
          timestamp: new Date().toISOString(),
          token_count: 0,
          data: [],
          last_sse_update: new Date().toISOString(),
          backend_total_count: 0
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    console.log(`📤 Returning ${tokensData.data.length} tokens from storage`)
    // Add cache headers for better performance
    const response = NextResponse.json(tokensData)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('❌ Error fetching tokens:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch tokens data'
      },
      { status: 500 }
    )
  }
}// HEAD endpoint to check for updates (for file watching replacement)
export async function HEAD(request: NextRequest) {
  try {
    const lastUpdate = tokenStorage.getLastUpdate()
    
    const response = new NextResponse(null, { status: 200 })
    
    if (lastUpdate) {
      response.headers.set('Last-Modified', new Date(lastUpdate).toUTCString())
    }
    
    response.headers.set('Cache-Control', 'no-cache')
    
    return response
    
  } catch (error) {
    console.error('Error checking tokens update time:', error)
    return new NextResponse(null, { status: 500 })
  }
}

// GET endpoint for stats (useful for debugging)
export async function OPTIONS(request: NextRequest) {
  try {
    const stats = tokenStorage.getStats()
    
    return NextResponse.json({
      ...stats,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error fetching storage stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
