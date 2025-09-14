// Lightweight stubs for Solana transaction preparation.
// These functions are placeholders: they return an object describing the intended action.

export async function prepareBuyTransaction(mint: string, amountSOL: number) {
  // TODO: implement using wallet adapter, connection, and swap program (e.g., Jupiter or custom AMM)
  return {
    action: 'buy',
    mint,
    amountSOL,
    preparedAt: Date.now(),
  }
}

export async function prepareSellTransaction(mint: string, percent: number) {
  // TODO: implement using wallet adapter, connection, and swap program
  return {
    action: 'sell',
    mint,
    percent,
    preparedAt: Date.now(),
  }
}
