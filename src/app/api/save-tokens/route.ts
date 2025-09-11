import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { tokens, timestamp } = await request.json()

    if (!tokens || !Array.isArray(tokens)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tokens data' },
        { status: 400 }
      )
    }

    // Create the data structure to save
    const dataToSave = {
      event: 'live_tokens_update',
      timestamp: timestamp || new Date().toISOString(),
      token_count: tokens.length,
      data: tokens
    }

    // Path to the tokens.json file in the public directory
    const filePath = path.join(process.cwd(), 'public', 'tokens.json')

    // Ensure the directory exists
    const dirPath = path.dirname(filePath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    // Write the data to the file
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2))

    //console.log(`✅ Saved ${tokens.length} tokens to ${filePath}`)

    return NextResponse.json({
      success: true,
      message: `Saved ${tokens.length} tokens to file`,
      filePath: filePath
    })

  } catch (error) {
   // console.error('Error saving tokens to file:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save tokens to file' },
      { status: 500 }
    )
  }
}
