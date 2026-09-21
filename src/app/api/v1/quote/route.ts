/**
 * Proxy for /v1/quote — forwards to public THORNode quote endpoint
 * Replaces the gated api.thorchain.org/v1/quote endpoint
 */
import { NextRequest, NextResponse } from 'next/server'
import { toThorBaseUnits, fromThorBaseUnits, fetchThorQuote, QuoteInputError, QuoteUnavailableError } from '@/lib/thornode-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const { sellAsset, buyAsset, sellAmount, slippage, providers, sourceAddress, destinationAddress } = body

    if (typeof sellAsset !== 'string' || typeof buyAsset !== 'string' || !sellAsset || !buyAsset) {
      throw new QuoteInputError('Sell and buy assets are required')
    }
    if (slippage !== undefined && (typeof slippage !== 'number' || !Number.isFinite(slippage) || slippage < 0 || slippage > 100)) {
      throw new QuoteInputError('Slippage must be between 0 and 100')
    }
    // Build thornode quote URL
    const params = new URLSearchParams({
      from_asset: sellAsset,
      to_asset: buyAsset,
      amount: toThorBaseUnits(sellAmount),
    })

    if (destinationAddress) params.append('destination', destinationAddress)
    if (sourceAddress) params.append('from_address', sourceAddress)
    if (slippage !== undefined) params.append('tolerance_bps', Math.round(slippage * 100).toString())
    params.append('streaming_interval', '1')

    const data = await fetchThorQuote(params)

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
    const expectedOut = fromThorBaseUnits(data.expected_amount_out)
    const expectedOutMax = fromThorBaseUnits(data.expected_amount_out_streaming || data.expected_amount_out)

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
          amount: fromThorBaseUnits(data.fees.liquidity),
          chain: buyAsset.split('.')[0],
          protocol: 'THORCHAIN',
        },
        {
          type: 'outbound',
          asset: data.fees?.asset || buyAsset,
          amount: fromThorBaseUnits(data.fees.outbound),
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
      const streamingOut = fromThorBaseUnits(data.expected_amount_out_streaming)
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
    const status = err instanceof QuoteInputError || err instanceof SyntaxError ? 400 : 503
    const message = err instanceof QuoteInputError || err instanceof QuoteUnavailableError ? err.message : 'Unable to obtain quote'
    return NextResponse.json({
      routes: [],
      error: message,
      providerErrors: [{ provider: 'THORCHAIN', message }]
    }, { status })
  }
}
