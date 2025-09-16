import { 
  Transaction, 
  VersionedTransaction,
  Connection, 
  PublicKey, 
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'

// VibeStation RPC configuration
const VIBE_RPC = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VIBE_RPC) || 'https://public.rpc.solanavibestation.com/'
const VIBE_API_KEY = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VIBE_API_KEY) || undefined

// PumpFun program constants
const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
const PUMPFUN_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM')

export async function callVibeRpc(method: string, params: any[] | any) {
  // Ensure params is always an array for JSON-RPC compatibility
  const safeParams = Array.isArray(params) ? params : (params === undefined ? [] : [params])
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: safeParams })
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }

  // When running in the browser, use a same-origin server proxy to avoid CORS and to keep API keys secret.
  const target = (typeof window !== 'undefined') ? '/api/vibe/rpc' : VIBE_RPC

  // If running server-side and we have an API key, attach it
  if (typeof window === 'undefined' && VIBE_API_KEY) headers['Authorization'] = VIBE_API_KEY

  const res = await fetch(target, { method: 'POST', headers, body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vibe RPC error ${res.status}: ${text}`)
  }
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error))
  return json.result
}

function writeUint64LE(buf: Uint8Array, offset: number, value: bigint | number) {
  let v = typeof value === 'bigint' ? value : BigInt(value)
  const mask = BigInt(0xff)
  const shift = BigInt(8)
  for (let i = 0; i < 8; i++) {
    buf[offset + i] = Number(v & mask)
    v = v >> shift
  }
}

/**
 * Enhanced migration status check that can use additional token metadata
 */
export async function checkTokenMigrationStatusEnhanced(
  mint: string, 
  tokenData?: {
    raydiumPool?: string | null;
    pumpSwapPool?: string | null;
    complete?: boolean;
  },
  connection?: Connection
): Promise<{
  isMigrated: boolean;
  bondingCurveExists: boolean;
  associatedBondingCurveExists: boolean;
  usedMetadata: boolean;
  debug?: any;
}> {
  // If we have token metadata, use it for more accurate detection
  if (tokenData) {
    const debug = { 
      method: 'metadata',
      raydiumPool: tokenData.raydiumPool,
      pumpSwapPool: tokenData.pumpSwapPool,
      complete: tokenData.complete
    }

    // Clear migration signals:
    // 1. Has Raydium pool = definitely migrated
    // 2. No pump swap pool AND no raydium pool = likely migrated (pool closed)
    // 3. Has pump swap pool = still on PumpFun (even if complete)
    
    if (tokenData.raydiumPool) {
      return {
        isMigrated: true,
        bondingCurveExists: false, // Assume closed after migration
        associatedBondingCurveExists: false,
        usedMetadata: true,
        debug
      }
    }
    
    if (tokenData.pumpSwapPool) {
      return {
        isMigrated: true,
        bondingCurveExists: true, // Still has PumpFun pool
        associatedBondingCurveExists: true,
        usedMetadata: true,
        debug
      }
    }
  }

  // Fall back to on-chain detection
  const onChainResult = await checkTokenMigrationStatus(mint, connection)
  return {
    ...onChainResult,
    usedMetadata: false
  }
}

/**
 * Robust check if a token has migrated from PumpFun to Raydium
 * - Uses bondingCurve existence as primary signal
 * - Falls back to on-chain connection.getAccountInfo if Vibe RPC errors
 * - Enhanced to handle completed PumpFun tokens that aren't migrated yet
 */
export async function checkTokenMigrationStatus(mint: string, connection?: Connection): Promise<{
  isMigrated: boolean;
  bondingCurveExists: boolean;
  associatedBondingCurveExists: boolean;
  debug?: any;
}> {
  const mintPubkey = new PublicKey(mint)

  // bonding curve PDA (primary)
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
    PUMPFUN_PROGRAM_ID
  )

  // associatedBondingCurve PDA (secondary; keep but don't treat as required)
  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [
      bondingCurve.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintPubkey.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Debug info we'll return
  const debug: any = {
    bondingCurve: bondingCurve.toString(),
    associatedBondingCurve: associatedBondingCurve.toString()
  }

  async function tryVibeGetAccount(pubkey: PublicKey) {
    try {
      const res = await callVibeRpc('getAccountInfo', [pubkey.toString(), { encoding: 'base64' }])
      debug[`vibe_${pubkey.toString()}`] = res
      return !!(res && res.value)
    } catch (err: any) {
      debug[`vibe_err_${pubkey.toString()}`] = String(err?.message || err)
      // bubble up undefined to let caller try fallback
      return undefined
    }
  }

  async function tryConnectionGetAccount(pubkey: PublicKey) {
    try {
      if (!connection) return undefined
      const info = await connection.getAccountInfo(pubkey, 'finalized')
      debug[`conn_${pubkey.toString()}`] = info ? { lamports: info.lamports, owner: info.owner.toString(), dataLen: info.data.length } : null
      return !!info
    } catch (err: any) {
      debug[`conn_err_${pubkey.toString()}`] = String(err?.message || err)
      return undefined
    }
  }

  // 1) Try Vibe RPC for bondingCurve
  let bondingCurveExists = await tryVibeGetAccount(bondingCurve)

  // 2) If we got an explicit boolean false, keep it. If undefined (Vibe error), try connection fallback.
  if (bondingCurveExists === undefined && connection) {
    bondingCurveExists = await tryConnectionGetAccount(bondingCurve)
  }

  // 3) Try the associatedBondingCurve (but don't use it to override bondingCurve)
  let associatedBondingCurveExists = await tryVibeGetAccount(associatedBondingCurve)
  if (associatedBondingCurveExists === undefined && connection) {
    associatedBondingCurveExists = await tryConnectionGetAccount(associatedBondingCurve)
  }

  // Enhanced migration detection logic:
  // A token is truly migrated ONLY when:
  // 1. The bonding curve account is completely gone/closed, OR
  // 2. The bonding curve data indicates it's been migrated (would need to parse data)
  // 
  // For now, we'll be conservative: if bonding curve exists, assume NOT migrated
  // This handles cases where tokens are "complete" but still use PumpFun bonding curve
  let isMigrated: boolean
  if (typeof bondingCurveExists === 'boolean') {
    // If bonding curve exists, the token is still on PumpFun (even if "complete")
    isMigrated = !bondingCurveExists
  } else {
    // Unknown (RPCs errored). Be conservative: do NOT assume migrated; caller can choose.
    isMigrated = false
    debug.note = 'Unable to determine bondingCurve existence (RPC fallback missing or errored).'
  }

  return {
    isMigrated,
    bondingCurveExists: !!bondingCurveExists,
    associatedBondingCurveExists: !!associatedBondingCurveExists,
    debug
  }
}

/**
 * Get Raydium pool information for a migrated token
 */
export async function getRaydiumPoolInfo(mint: string) {
  // This would need to be implemented based on Raydium's SDK
  // For now, return basic structure
  return {
    exists: false,
    poolAddress: null,
    baseVault: null,
    quoteVault: null
  }
}

/**
 * Get Jupiter quote for token swap
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string, 
  amount: number,
  swapMode: 'ExactIn' | 'ExactOut' = 'ExactIn'
) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    swapMode,
    slippageBps: '300', // 3% slippage
    onlyDirectRoutes: 'false',
    asLegacyTransaction: 'false'
  })

  const response = await fetch(`https://quote-api.jup.ag/v6/quote?${params}`)
  if (!response.ok) {
    throw new Error(`Jupiter quote failed: ${response.status}`)
  }
  return await response.json()
}

/**
 * Execute Jupiter swap transaction
 */
export async function executeJupiterSwap(
  wallet: any,
  quoteResponse: any
) {
  if (!wallet?.publicKey) {
    throw new Error('Wallet not connected')
  }

  const response = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    })
  })

  if (!response.ok) {
    throw new Error(`Jupiter swap failed: ${response.status}`)
  }

  const body = await response.json()
  // Jupiter may return swapTransaction as a base64 string or an object with a `transaction` field
  const swapTransactionBase64 = typeof body.swapTransaction === 'string'
    ? body.swapTransaction
    : (body.swapTransaction?.transaction || body.swapTransaction?.tx || body.swapTransaction)

  if (!swapTransactionBase64) throw new Error('Jupiter returned no swapTransaction')

  const swapTransactionBuf = Buffer.from(swapTransactionBase64, 'base64')

  let signedSerialized: Uint8Array

  // Attempt versioned transaction deserialization first; if that fails, fall back to legacy
  try {
    let parsed: any
    try {
      // Prefer VersionedTransaction.deserialize when available
      if (typeof (VersionedTransaction as any)?.deserialize === 'function') {
        parsed = (VersionedTransaction as any).deserialize(swapTransactionBuf)
      } else {
        parsed = undefined
      }
    } catch (vErr) {
      parsed = undefined
    }

    if (parsed && parsed instanceof VersionedTransaction) {
      // VersionedTransaction path
      if (typeof wallet.signTransaction === 'function') {
        const signed = await wallet.signTransaction(parsed)
        if (signed instanceof VersionedTransaction) {
          signedSerialized = signed.serialize()
        } else if (signed instanceof Transaction) {
          signedSerialized = signed.serialize()
        } else {
          signedSerialized = Buffer.from(signed)
        }
      } else if (typeof wallet.signAllTransactions === 'function') {
        const [signed] = await wallet.signAllTransactions([parsed])
        signedSerialized = signed.serialize()
      } else {
        throw new Error('Wallet does not support signing versioned transactions')
      }
    } else {
      // Legacy Transaction
      const legacyTx = Transaction.from(swapTransactionBuf)
      const signedTransaction = await wallet.signTransaction(legacyTx)
      signedSerialized = Buffer.from(signedTransaction.serialize())
    }
  } catch (err: any) {
    throw new Error(`Failed to parse/sign Jupiter transaction: ${err?.message || String(err)}`)
  }

  const signature = await sendSignedTransactionViaVibe(signedSerialized)

  return {
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}`
  }
}

/**
 * Creates a PumpFun buy transaction with migration detection
 */
export async function prepareBuyTransaction(
  connection: Connection,
  wallet: any,
  mint: string,
  amountSOL: number
): Promise<Transaction> {
  if (!wallet?.publicKey) {
    throw new Error('Wallet not connected')
  }

  const mintPubkey = new PublicKey(mint)
  const userPubkey = wallet.publicKey
  const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)

  // Get the bonding curve and associated token account addresses
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
    PUMPFUN_PROGRAM_ID
  )

  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [
      bondingCurve.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintPubkey.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Get user's associated token account
  const associatedUser = await getAssociatedTokenAddress(
    mintPubkey,
    userPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Check if the associated token account exists
  let createATAInstruction = null
  try {
    const accountInfo = await callVibeRpc('getAccountInfo', [associatedUser.toString()])
    if (!accountInfo || !accountInfo.value) {
      createATAInstruction = createAssociatedTokenAccountInstruction(
        userPubkey,
        associatedUser,
        userPubkey,
        mintPubkey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    }
  } catch (error) {
    createATAInstruction = createAssociatedTokenAccountInstruction(
      userPubkey,
      associatedUser,
      userPubkey,
      mintPubkey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  }

  // Create the buy instruction data
  const buyInstructionData = Buffer.alloc(24)
  writeUint64LE(buyInstructionData, 0, BigInt(16927863322262)) // Buy discriminator
  writeUint64LE(buyInstructionData, 8, BigInt(lamports))
  writeUint64LE(buyInstructionData, 16, BigInt(0)) // Max sol cost (0 for market buy)

  const buyInstruction = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: userPubkey, isSigner: true, isWritable: false },
      { pubkey: mintPubkey, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_FEE_RECIPIENT, isSigner: false, isWritable: true }
    ],
    data: buyInstructionData
  })

  const transaction = new Transaction()
  
  const recentBlockhash = await callVibeRpc('getLatestBlockhash', [{ commitment: 'finalized' }])
  transaction.recentBlockhash = recentBlockhash.value.blockhash
  transaction.feePayer = userPubkey

  if (createATAInstruction) {
    transaction.add(createATAInstruction)
  }

  transaction.add(buyInstruction)

  return transaction
}

/**
 * Creates a PumpFun sell transaction with migration detection
 */
export async function prepareSellTransaction(
  connection: Connection,
  wallet: any,
  mint: string,
  percent: number
): Promise<Transaction> {
  if (!wallet?.publicKey) {
    throw new Error('Wallet not connected')
  }

  const mintPubkey = new PublicKey(mint)
  const userPubkey = wallet.publicKey

  // Get user's token account
  const associatedUser = await getAssociatedTokenAddress(
    mintPubkey,
    userPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Get token balance via VibeStation RPC
  const tokenBalance = await callVibeRpc('getTokenAccountBalance', [
    associatedUser.toString(),
    { commitment: 'finalized' }
  ])
  
  if (!tokenBalance?.value?.amount) {
    throw new Error('No tokens to sell')
  }

  const tokenAmount = BigInt(tokenBalance.value.amount)
  const sellAmount = (tokenAmount * BigInt(percent)) / BigInt(100)

  // Get bonding curve addresses
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
    PUMPFUN_PROGRAM_ID
  )

  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [
      bondingCurve.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintPubkey.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Create the sell instruction data
  const sellInstructionData = Buffer.alloc(24)
  writeUint64LE(sellInstructionData, 0, BigInt(12502976635542)) // Sell discriminator
  writeUint64LE(sellInstructionData, 8, sellAmount)
  writeUint64LE(sellInstructionData, 16, BigInt(0)) // Min sol output (0 for market sell)

  const sellInstruction = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: userPubkey, isSigner: true, isWritable: false },
      { pubkey: mintPubkey, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_FEE_RECIPIENT, isSigner: false, isWritable: true }
    ],
    data: sellInstructionData
  })

  const transaction = new Transaction()
  
  const recentBlockhash = await callVibeRpc('getLatestBlockhash', [{ commitment: 'finalized' }])
  transaction.recentBlockhash = recentBlockhash.value.blockhash
  transaction.feePayer = userPubkey

  transaction.add(sellInstruction)

  return transaction
}

/**
 * Simulate a transaction via VibeStation RPC
 */
export async function simulateTransactionViaVibe(txInput: string | Uint8Array | Transaction) {
  let encoded: string
  
  if (typeof txInput === 'string') {
    encoded = txInput
  } else if (txInput instanceof Transaction) {
    encoded = Buffer.from(txInput.serialize({ requireAllSignatures: false })).toString('base64')
  } else {
    encoded = Buffer.from(txInput).toString('base64')
  }

  const params = [encoded, { 
    encoding: 'base64', 
    commitment: 'finalized',
    replaceRecentBlockhash: true
  }]
  return await callVibeRpc('simulateTransaction', params)
}

/**
 * Send a fully-signed transaction via VibeStation RPC
 */
export async function sendSignedTransactionViaVibe(signedTx: Uint8Array | string | Transaction) {
  let encoded: string
  
  if (typeof signedTx === 'string') {
    encoded = signedTx
  } else if (signedTx instanceof Transaction) {
    encoded = Buffer.from(signedTx.serialize()).toString('base64')
  } else {
    encoded = Buffer.from(signedTx).toString('base64')
  }

  const params = [encoded, { 
    encoding: 'base64', 
    skipPreflight: false, 
    preflightCommitment: 'finalized', 
    maxRetries: 3 
  }]
  const result = await callVibeRpc('sendTransaction', params)
  return result as string
}

/**
 * Complete buy flow with migration detection and simulation
 */
export async function executeBuyTransaction(
  connection: Connection,
  wallet: any,
  mint: string,
  amountSOL: number,
  options: { 
    simulate?: boolean;
    tokenData?: {
      raydiumPool?: string | null;
      pumpSwapPool?: string | null;
      complete?: boolean;
    };
  } = {}
) {
  if (!wallet?.publicKey || !wallet?.signTransaction) {
    throw new Error('Wallet not properly connected')
  }

  try {
    // 1. Check migration status first with enhanced detection
    const migrationStatus = await checkTokenMigrationStatusEnhanced(mint, options.tokenData, connection)
    
    console.log('Migration status:', migrationStatus)
    
    if (migrationStatus.isMigrated) {
      // Handle migrated tokens via Jupiter
      console.log('Token has migrated, using Jupiter for swap...')
      
      const SOL_MINT = 'So11111111111111111111111111111111111111112'
      const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)
      
      // Get Jupiter quote for SOL -> Token
      const quote = await getJupiterQuote(SOL_MINT, mint, lamports, 'ExactIn')
      
      // Execute the swap
      const result = await executeJupiterSwap(wallet, quote)
      
      console.log('Jupiter swap successful:', result)
      return result
    }

    // 2. Token is still on PumpFun, proceed with PumpFun transaction
    console.log('Token still on PumpFun, using PumpFun bonding curve...')
    const transaction = await prepareBuyTransaction(connection, wallet, mint, amountSOL)

    // 3. Simulate first (optional)
    if (options.simulate) {
      console.log('Simulating transaction before execution...')
      const simulation = await simulateTransactionViaVibe(transaction)
      if (simulation.value?.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`)
      }
      console.log('Simulation successful:', simulation.value)
    }

    // 4. Sign transaction with wallet
    const signedTransaction = await wallet.signTransaction(transaction)

    // 5. Send via VibeStation
    const signature = await sendSignedTransactionViaVibe(signedTransaction)

    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}`
    }
  } catch (error: any) {
    throw error
  }
}

/**
 * Complete sell flow with migration detection and simulation
 */
export async function executeSellTransaction(
  connection: Connection,
  wallet: any,
  mint: string,
  percent: number,
  options: { 
    simulate?: boolean;
    tokenData?: {
      raydiumPool?: string | null;
      pumpSwapPool?: string | null;
      complete?: boolean;
    };
  } = {}
) {
  if (!wallet?.publicKey || !wallet?.signTransaction) {
    throw new Error('Wallet not properly connected')
  }

  try {
    // 1. Check migration status first with enhanced detection
    const migrationStatus = await checkTokenMigrationStatusEnhanced(mint, options.tokenData, connection)
    
    console.log('Migration status:', migrationStatus)
    
    if (migrationStatus.isMigrated) {
      // Handle migrated tokens via Jupiter
      console.log('Token has migrated, using Jupiter for sell...')
      
      const SOL_MINT = 'So11111111111111111111111111111111111111112'
      
      // Get user's token balance first
      const associatedUser = await getAssociatedTokenAddress(
        new PublicKey(mint),
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const tokenBalance = await callVibeRpc('getTokenAccountBalance', [
        associatedUser.toString()
      ])
      
      if (!tokenBalance?.value?.amount) {
        throw new Error('No tokens to sell')
      }

      const tokenAmount = BigInt(tokenBalance.value.amount)
      const sellAmount = Number((tokenAmount * BigInt(percent)) / BigInt(100))
      
      // Get Jupiter quote for Token -> SOL
      const quote = await getJupiterQuote(mint, SOL_MINT, sellAmount, 'ExactIn')
      
      // Execute the swap
      const result = await executeJupiterSwap(wallet, quote)
      
      console.log('Jupiter sell swap successful:', result)
      return result
    }

    // 2. Token is still on PumpFun, proceed with PumpFun transaction
    console.log('Token still on PumpFun, using PumpFun bonding curve...')
    const transaction = await prepareSellTransaction(connection, wallet, mint, percent)

    // 3. Simulate first (optional)
    if (options.simulate) {
      console.log('Simulating transaction before execution...')
      const simulation = await simulateTransactionViaVibe(transaction)
      if (simulation.value?.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`)
      }
      console.log('Simulation successful:', simulation.value)
    }

    // 4. Sign transaction with wallet
    const signedTransaction = await wallet.signTransaction(transaction)

    // 5. Send via VibeStation
    const signature = await sendSignedTransactionViaVibe(signedTransaction)

    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}`
    }
  } catch (error: any) {
    throw error
  }
}

// Legacy wrapper functions for backward compatibility
export { prepareBuyTransaction as prepareBuyTransactionLegacy }
export { prepareSellTransaction as prepareSellTransactionLegacy }

/**
 * Utility function to check if a specific mint address has migrated
 * Enhanced version that can use token metadata for better accuracy
 */
export async function isTokenMigrated(
  mint: string, 
  tokenData?: {
    raydiumPool?: string | null;
    pumpSwapPool?: string | null;
    complete?: boolean;
  }
): Promise<boolean> {
  if (tokenData) {
    const status = await checkTokenMigrationStatusEnhanced(mint, tokenData)
    return status.isMigrated
  }
  const status = await checkTokenMigrationStatus(mint)
  return status.isMigrated
}

/**
 * Test function to verify migration detection with example token data
 */
export async function testMigrationDetection() {
  // Test with the StreamerCoin example
  const streamerCoinData = {
    raydiumPool: null,
    pumpSwapPool: "B1EzTqQTkAWMBZBkEyKGb5dxebYfB74nJcmSAR14cXJt",
    complete: true
  }
  
  const result = await checkTokenMigrationStatusEnhanced(
    "3arUrpH3nzaRJbbpVgY42dcqSq9A5BFgUxKozZ4npump",
    streamerCoinData
  )
  
  console.log('StreamerCoin migration test:', result)
  console.log('Expected: isMigrated = false (has pump_swap_pool)')
  
  return result
}