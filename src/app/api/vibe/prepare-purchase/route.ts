import { NextResponse } from 'next/server'

type PrepareRequest = {
  mint: string
  amountSOL: number
}

export async function POST(req: Request) {
  try {
    const body: PrepareRequest = await req.json()

    if (!body?.mint || !body?.amountSOL) {
      return NextResponse.json({ error: 'mint and amountSOL are required' }, { status: 400 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL
    if (!backendUrl) {
      return NextResponse.json({ error: 'Server not configured (missing NEXT_PUBLIC_API_URL)' }, { status: 500 })
    }

    // Forward request to real backend
    const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/vibe/prepare-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await resp.text()
    // Try parse JSON, else return raw text
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
