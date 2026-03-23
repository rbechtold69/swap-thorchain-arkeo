/**
 * Proxy for /v1/quote — forwards to public THORNode quote endpoint
 * Replaces the gated api.thorchain.org/v1/quote endpoint
 */
import { NextRequest, NextResponse } from 'next/server'

const THORNODE = 'https://thornode.ninerealms.com'

// Thornode amounts are in 1e8 base units
// We need to convert from the SDK's format (which varies by chain) to thornode's 1e8

function convertToThorAmount(amount: string, assetId: string): string {
  // SDK sends HUMAN-READABLE amounts (e.g. "0.1" for 0.1 ETH)
  // Thornode expects 1e8 base units for everything
  // So: multiply the human amount by 1e8
  
  const num = parseFloat(amount)
  if (isNaN(num) || num <= 0) return '0'
  return Math.floor(num * 1e8).toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const { sellAsset, buyAsset, sellAmount, slippage, providers, sourceAddress, destinationAddress } = body

    // Build thornode quote URL
    const params = new URLSearchParams({
      from_asset: sellAsset,
      to_asset: buyAsset,
      amount: convertToThorAmount(sellAmount, sellAsset),
    })

    if (destinationAddress) params.append('destination', destinationAddress)
    if (sourceAddress) params.append('from_address', sourceAddress)
    if (slippage) params.append('tolerance_bps', Math.round(slippage * 100).toString())
    params.append('streaming_interval', '1')

    const thornodeRes = await fetch(`${THORNODE}/thorchain/quote/swap?${params}`)
    const data = await thornodeRes.json()

    if (data.error || data.code) {
      return NextResponse.json({
        routes: [],
        error: data.message || data.error || 'Quote failed',
        providerErrors: [{
          provider: 'THORCHAIN',
          message: data.message || data.error,
        }]
      })
    }

    // Convert thornode response to SDK format
    const expectedOut = (parseInt(data.expected_amount_out) / 1e8).toString()
    const expectedOutMax = (parseInt(data.expected_amount_out_streaming || data.expected_amount_out) / 1e8).toString()

    const route = {
      buyAsset,
      sellAsset,
      sellAmount,
      expectedBuyAmount: expectedOut,
      expectedBuyAmountMaxSlippage: expectedOutMax,
      providers: ['THORCHAIN'] as any,
      fees: [
        {
          type: 'liquidity',
          asset: data.fees?.asset || buyAsset,
          amount: (parseInt(data.fees?.liquidity || '0') / 1e8).toString(),
          chain: buyAsset.split('.')[0],
          protocol: 'THORCHAIN',
        },
        {
          type: 'outbound',
          asset: data.fees?.asset || buyAsset,
          amount: (parseInt(data.fees?.outbound || '0') / 1e8).toString(),
          chain: buyAsset.split('.')[0],
          protocol: 'THORCHAIN',
        },
      ],
      memo: data.memo,
      inboundAddress: data.inbound_address,
      expiration: data.expiry?.toString(),
      estimatedTime: {
        total: (data.inbound_confirmation_seconds || 0) + (data.outbound_delay_seconds || 0),
        inbound: data.inbound_confirmation_seconds,
        outbound: data.outbound_delay_seconds,
      },
      warnings: [],
      meta: {
        priceImpact: data.fees?.slippage_bps ? data.fees.slippage_bps / 100 : undefined,
        streamingInterval: data.streaming_swap_seconds ? 1 : undefined,
      } as any,
    }

    // Also add a streaming variant if available
    const routes = [route]

    if (data.streaming_swap_seconds && data.expected_amount_out_streaming) {
      const streamingOut = (parseInt(data.expected_amount_out_streaming) / 1e8).toString()
      routes.unshift({
        ...route,
        expectedBuyAmount: streamingOut,
        expectedBuyAmountMaxSlippage: streamingOut,
        providers: ['THORCHAIN_STREAMING'] as any,
        estimatedTime: {
          total: (data.inbound_confirmation_seconds || 0) + (data.streaming_swap_seconds || 0),
          inbound: data.inbound_confirmation_seconds,
          outbound: data.streaming_swap_seconds,
        },
        meta: {
          ...route.meta,
          maxStreamingQuantity: data.streaming_swap_blocks,
          streamingInterval: 1,
        } as any,
      })
    }

    return NextResponse.json({ routes })
  } catch (err: any) {
    console.error('Quote error:', err.message)
    return NextResponse.json({
      routes: [],
      error: err.message,
      providerErrors: [{ provider: 'THORCHAIN', message: err.message }]
    }, { status: 500 })
  }
}
