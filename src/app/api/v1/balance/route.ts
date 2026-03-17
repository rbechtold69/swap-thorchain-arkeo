/**
 * Proxy for /v1/balance — fetches native + token balances
 * For EVM chains: uses eth_getBalance via Arkeo sentinel RPCs
 * For THORChain: uses Midgard
 * Returns format expected by USwapApi.getChainBalance
 */
import { NextRequest, NextResponse } from 'next/server'

const MIDGARD = 'https://midgard.ninerealms.com'

// Chain → RPC endpoint mapping (Arkeo sentinels via Caddy proxy)
const CHAIN_RPC: Record<string, string> = {
  ETH: 'https://swap.arkeomarketplace.com/rpc/oxfury/eth-mainnet-fullnode',
  BSC: 'https://swap.arkeomarketplace.com/rpc/liquify/bsc-mainnet-fullnode',
  BASE: 'https://swap.arkeomarketplace.com/rpc/liquify/base-mainnet-fullnode',
  POLYGON: 'https://swap.arkeomarketplace.com/rpc/liquify/polygon-mainnet-fullnode',
  ARB: 'https://swap.arkeomarketplace.com/rpc/everstake/arbitrum-mainnet-fullnode',
  AVAX: 'https://api.avax.network/ext/bc/C/rpc',
}

// Chain → native asset info
const CHAIN_ASSETS: Record<string, { symbol: string; ticker: string; decimals: number }> = {
  ETH: { symbol: 'ETH', ticker: 'ETH', decimals: 18 },
  BSC: { symbol: 'BNB', ticker: 'BNB', decimals: 18 },
  BASE: { symbol: 'ETH', ticker: 'ETH', decimals: 18 },
  POLYGON: { symbol: 'POL', ticker: 'POL', decimals: 18 },
  ARB: { symbol: 'ETH', ticker: 'ETH', decimals: 18 },
  AVAX: { symbol: 'AVAX', ticker: 'AVAX', decimals: 18 },
}

async function getEvmBalance(chain: string, address: string) {
  const rpc = CHAIN_RPC[chain]
  if (!rpc) return []

  const asset = CHAIN_ASSETS[chain]
  if (!asset) return []

  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    })

    const data = await res.json()
    if (!data.result) return []

    const balanceWei = BigInt(data.result)
    // SDK expects human-readable value (e.g. "0.0437"), not raw wei
    const divisor = BigInt(10 ** asset.decimals)
    const whole = balanceWei / divisor
    const remainder = balanceWei % divisor
    const remainderStr = remainder.toString().padStart(asset.decimals, '0')
    const humanValue = `${whole}.${remainderStr}`

    return [{
      chain,
      identifier: `${chain}.${asset.symbol}`,
      symbol: asset.symbol,
      ticker: asset.ticker,
      value: humanValue,
      decimal: asset.decimals,
      isGasAsset: true,
    }]
  } catch (err: any) {
    console.error(`EVM balance error for ${chain}:`, err.message)
    return []
  }
}

async function getThorchainBalance(address: string) {
  try {
    const res = await fetch(`${MIDGARD}/v2/balance/${address}`)
    if (!res.ok) return []

    const data = await res.json()
    if (!data.coins) return []

    return data.coins.map((c: any) => ({
      chain: c.asset?.split('.')[0] || 'THOR',
      identifier: c.asset || 'THOR.RUNE',
      symbol: c.asset?.split('.')[1] || 'RUNE',
      ticker: c.asset?.split('.')[1]?.split('-')[0] || 'RUNE',
      value: c.amount || '0',
      decimal: 8,
    }))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const chain = req.nextUrl.searchParams.get('chain')?.toUpperCase()
  const address = req.nextUrl.searchParams.get('address')

  if (!chain || !address) {
    return NextResponse.json([], { status: 400 })
  }

  let balances: any[] = []

  if (chain === 'THOR' || chain === 'THORCHAIN') {
    balances = await getThorchainBalance(address)
  } else if (CHAIN_RPC[chain]) {
    balances = await getEvmBalance(chain, address)
  }

  return NextResponse.json(balances)
}
