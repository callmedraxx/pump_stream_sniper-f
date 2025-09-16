import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const VIBE_RPC = process.env.NEXT_PUBLIC_VIBE_RPC || 'https://public.rpc.solanavibestation.com/'
  // Server-only token (preferred). You can set VIBE_API_TOKEN_HEADER to customize header name (default: X-Token)
  const VIBE_API_TOKEN = process.env.VIBE_API_TOKEN || process.env.VIBE_API_KEY || process.env.NEXT_PUBLIC_VIBE_API_KEY
  const VIBE_API_TOKEN_HEADER = process.env.VIBE_API_TOKEN_HEADER || 'X-Token'

  // debug: print endpoint and whether a token is configured
  // (do not log tokens in production)

    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (VIBE_API_TOKEN) headers[VIBE_API_TOKEN_HEADER] = VIBE_API_TOKEN

  // optional debug log (do not log full token in production)
  console.log('vibe rpc', VIBE_RPC, VIBE_API_TOKEN ? `${VIBE_API_TOKEN_HEADER} ${String(VIBE_API_TOKEN).slice(0,8)}...` : 'no-token')

    const res = await fetch(VIBE_RPC, { method: 'POST', headers, body: JSON.stringify(body) })
    const text = await res.text()
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
