/**
 * Proxy for /memoless/api/v1/assets — memoless swap supported assets
 * Fetches from THORNode pools and returns assets that support memoless
 */
import { NextResponse } from 'next/server'

const THORNODE = 'https://thornode.ninerealms.com'

export async function GET() {
  try {
    const poolsRes = await fetch(`${THORNODE}/thorchain/pools`, { next: { revalidate: 60 } })
    const pools = await poolsRes.json()

    // Memoless swaps are supported for assets in available pools
    const assets = pools
      .filter((p: any) => p.status === 'Available')
      .map((p: any) => {
        const [chain, rest] = p.asset.split('.')
        const ticker = rest?.split('-')[0] || rest
        const decimals = ['ETH', 'BSC', 'AVAX', 'BASE'].includes(chain) ? 18 : 8
        const priceUSD = parseInt(p.balance_rune) > 0 && parseInt(p.balance_asset) > 0
          ? (parseInt(p.balance_rune) / parseInt(p.balance_asset))
          : 0

        return {
          asset: p.asset,
          balanceRune: parseInt(p.balance_rune) / 1e8,
          decimals,
          isToken: p.asset.includes('-'),
          priceUSD,
          status: 'Available',
        }
      })

    return NextResponse.json({
      assets,
      success: true,
    })
  } catch (err: any) {
    return NextResponse.json({ assets: [], success: false, error: { message: err.message } })
  }
}
