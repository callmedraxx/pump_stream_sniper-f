import { NextResponse } from 'next/server'

type SellRequest = {
  mint: string
  percent: number
}

export async function POST(req: Request) {
  try {
    const body: SellRequest = await req.json()

    if (!body?.mint || typeof body?.percent !== 'number') {
      return NextResponse.json({ error: 'mint and percent are required' }, { status: 400 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL
    if (!backendUrl) {
      return NextResponse.json({ error: 'Server not configured (missing NEXT_PUBLIC_API_URL)' }, { status: 500 })
    }

    // Forward request to real backend
    const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/vibe/prepare-sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await resp.text()
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: resp.status })
    } catch (e) {
      return new Response(text, { status: resp.status })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
