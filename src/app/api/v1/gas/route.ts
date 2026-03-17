/**
 * Proxy for /v1/gas — gas rates from public THORNode
 */
import { NextResponse } from 'next/server'

const THORNODE = 'https://thornode.ninerealms.com'

const CHAIN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  BCH: 'bitcoincash',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-c',
  BSC: 'binance-smart-chain',
  GAIA: 'cosmoshub-4',
  BASE: 'base',
  THOR: 'thorchain-1',
}

export async function GET() {
  try {
    const res = await fetch(`${THORNODE}/thorchain/inbound_addresses`, { next: { revalidate: 30 } })
    const inbounds = await res.json()

    const gasRates = inbounds.map((ib: any, i: number) => ({
      id: i + 1,
      chainId: CHAIN_IDS[ib.chain] || ib.chain.toLowerCase(),
      value: ib.gas_rate || '0',
      unit: ib.gas_rate_units || 'satsperbyte',
      createdAt: new Date().toISOString(),
    }))

    return NextResponse.json(gasRates)
  } catch (err: any) {
    return NextResponse.json([], { status: 500 })
  }
}
