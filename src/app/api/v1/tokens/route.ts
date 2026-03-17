/**
 * Proxy for /v1/tokens — builds token list from public THORNode pool data
 * Replaces the gated api.thorchain.org/v1/tokens endpoint
 */
import { NextRequest, NextResponse } from 'next/server'

const THORNODE = 'https://thornode.ninerealms.com'
const MIDGARD = 'https://midgard.ninerealms.com'

// Logo mapping for major assets
const LOGOS: Record<string, string> = {
  'THOR.RUNE': 'https://static.thorswap.net/token-list/images/thor.rune.png',
  'BTC.BTC': 'https://static.thorswap.net/token-list/images/btc.btc.png',
  'ETH.ETH': 'https://static.thorswap.net/token-list/images/eth.eth.png',
  'BCH.BCH': 'https://static.thorswap.net/token-list/images/bch.bch.png',
  'LTC.LTC': 'https://static.thorswap.net/token-list/images/ltc.ltc.png',
  'BNB.BNB': 'https://static.thorswap.net/token-list/images/bnb.bnb.png',
  'DOGE.DOGE': 'https://static.thorswap.net/token-list/images/doge.doge.png',
  'AVAX.AVAX': 'https://static.thorswap.net/token-list/images/avax.avax.png',
  'GAIA.ATOM': 'https://static.thorswap.net/token-list/images/gaia.atom.png',
  'BASE.ETH': 'https://static.thorswap.net/token-list/images/base.eth.png',
  'BSC.BNB': 'https://static.thorswap.net/token-list/images/bsc.bnb.png',
}

// Chain to chainId mapping
const CHAIN_IDS: Record<string, string> = {
  ETH: '1',
  BSC: '56',
  AVAX: '43114',
  BASE: '8453',
  BTC: 'bitcoin',
  BCH: 'bitcoincash',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  GAIA: 'cosmoshub-4',
  THOR: 'thorchain-1',
}

// Chain to decimals
const CHAIN_DECIMALS: Record<string, number> = {
  ETH: 18,
  BSC: 18,
  AVAX: 18,
  BASE: 18,
  BTC: 8,
  BCH: 8,
  LTC: 8,
  DOGE: 8,
  GAIA: 6,
  THOR: 8,
}

function getAssetDecimals(asset: string): number {
  const chain = asset.split('.')[0]
  // ERC20/BEP20 tokens - check if it has a contract address
  if (asset.includes('-')) {
    // Most ERC20 tokens are 18 decimals, USDC/USDT are 6
    const symbol = asset.split('.')[1].split('-')[0]
    if (['USDC', 'USDT'].includes(symbol)) return 6
    if (['WBTC', 'BTCB'].includes(symbol)) return 8
    return 18
  }
  return CHAIN_DECIMALS[chain] || 8
}

function parseAssetIdentifier(asset: string) {
  const [chain, rest] = asset.split('.')
  const parts = rest?.split('-') || [rest]
  const ticker = parts[0]
  const address = parts.length > 1 ? parts[parts.length - 1] : undefined
  const symbol = rest
  return { chain, ticker, symbol, address, identifier: asset }
}

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') || 'THORCHAIN'
  
  try {
    // Fetch pools from public thornode
    const poolsRes = await fetch(`${THORNODE}/thorchain/pools`, { next: { revalidate: 60 } })
    const pools = await poolsRes.json()

    const tokens: any[] = []

    // Add RUNE as the native asset
    tokens.push({
      address: undefined,
      chain: 'THOR',
      chainId: 'thorchain-1',
      coingeckoId: 'thorchain',
      decimals: 8,
      identifier: 'THOR.RUNE',
      logoURI: LOGOS['THOR.RUNE'] || '',
      name: 'RUNE',
      shortCode: 'r',
      symbol: 'RUNE',
      ticker: 'RUNE',
    })

    // Convert each available pool to a token entry
    for (const pool of pools) {
      if (pool.status !== 'Available') continue

      const parsed = parseAssetIdentifier(pool.asset)
      const decimals = getAssetDecimals(pool.asset)
      const logo = LOGOS[pool.asset] || `https://static.thorswap.net/token-list/images/${pool.asset.toLowerCase()}.png`

      tokens.push({
        address: parsed.address?.toLowerCase(),
        chain: parsed.chain,
        chainId: CHAIN_IDS[parsed.chain] || parsed.chain.toLowerCase(),
        coingeckoId: undefined,
        decimals,
        identifier: pool.asset,
        logoURI: logo,
        name: parsed.ticker,
        shortCode: parsed.ticker.substring(0, 3).toLowerCase(),
        symbol: parsed.symbol,
        ticker: parsed.ticker,
      })
    }

    return NextResponse.json({ tokens, count: tokens.length })
  } catch (err: any) {
    console.error('Token list error:', err.message)
    return NextResponse.json({ tokens: [], count: 0, error: err.message }, { status: 500 })
  }
}
