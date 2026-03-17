/**
 * Proxy for /v1/track — transaction tracking
 * Uses Midgard actions endpoint for tx tracking
 */
import { NextRequest, NextResponse } from 'next/server'

const MIDGARD = 'https://midgard.ninerealms.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hash, chainId } = body

    if (hash) {
      // Try to find the tx in Midgard
      const res = await fetch(`${MIDGARD}/v2/actions?txid=${hash}&limit=1`)
      if (res.ok) {
        const data = await res.json()
        if (data.actions?.length > 0) {
          const action = data.actions[0]
          return NextResponse.json({
            hash,
            status: action.status === 'success' ? 'completed' : action.status,
            legs: [],
          })
        }
      }
    }

    // Return pending status for unknown txs (expected for in-flight)
    return NextResponse.json({
      hash: hash || '',
      status: 'pending',
      legs: [],
    })
  } catch (err: any) {
    return NextResponse.json({ hash: '', status: 'unknown', legs: [] })
  }
}
