/**
 * Proxy for /v1/swap — returns a route with transaction data
 * The SDK calls this after the user confirms a swap to get the actual tx to sign
 */
import { NextRequest, NextResponse } from 'next/server'

const THORNODE = 'https://thornode.ninerealms.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { routeId, sourceAddress, destinationAddress } = body

    // For THORChain swaps, the route already contains memo + inbound address
    // The wallet SDK constructs the transaction itself using these
    // This endpoint mainly confirms the route is still valid

    // Re-fetch quote to get fresh data
    // routeId format is typically: sellAsset-buyAsset-amount-provider
    return NextResponse.json({
      error: 'Direct swap execution not supported via proxy. Use wallet SDK with memo + inbound address.',
    }, { status: 501 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
