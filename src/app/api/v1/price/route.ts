/**
 * Proxy for /v1/price — asset prices from pool depth ratios + CoinGecko
 */
import { NextRequest, NextResponse } from 'next/server'

const MIDGARD = 'https://midgard.ninerealms.com'
const COINGECKO = 'https://api.coingecko.com/api/v3'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tokens = body?.tokens || []

    // Get pool prices from Midgard
    const poolsRes = await fetch(`${MIDGARD}/v2/pools`, { next: { revalidate: 30 } })
    const pools = await poolsRes.json()

    // Build price map from pool data (price = RUNE side / asset side, adjusted)
    const priceMap: Record<string, number> = {}
    for (const pool of pools) {
      if (pool.assetPriceUSD) {
        priceMap[pool.asset] = parseFloat(pool.assetPriceUSD)
      }
    }

    // RUNE price from Midgard stats
    try {
      const statsRes = await fetch(`${MIDGARD}/v2/stats`, { next: { revalidate: 60 } })
      const stats = await statsRes.json()
      if (stats.runePriceUSD) {
        priceMap['THOR.RUNE'] = parseFloat(stats.runePriceUSD)
      }
    } catch {}

    const results = tokens.map((t: any) => {
      const identifier = t.identifier || t
      const price = priceMap[identifier]
      return {
        identifier,
        price_usd: price || 0,
        provider: 'thorchain',
        timestamp: Date.now(),
      }
    })

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json([])
  }
}
