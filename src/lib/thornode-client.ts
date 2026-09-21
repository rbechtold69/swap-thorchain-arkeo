/** Server-side, read-only THORNode quote transport. URLs come only from operator config. */
export class QuoteInputError extends Error {}
export class QuoteUnavailableError extends Error {}

export function toThorBaseUnits(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.\d{1,8})?$/.test(value)) {
    throw new QuoteInputError('Amount must be a positive decimal string with at most 8 decimal places')
  }
  const [whole, fraction = ''] = value.split('.')
  const amount = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'))
  if (amount <= 0n || amount > 18446744073709551615n) throw new QuoteInputError('Amount outside supported range')
  return amount.toString()
}

export function fromThorBaseUnits(value: string): string {
  if (!/^\d+$/.test(value)) throw new QuoteUnavailableError('Invalid amount in quote')
  const amount = BigInt(value)
  const fraction = (amount % 100000000n).toString().padStart(8, '0').replace(/0+$/, '')
  return `${amount / 100000000n}${fraction ? '.' + fraction : ''}`
}

export function quoteEndpoints(raw = process.env.THORNODE_URLS): string[] {
  const entries = (raw || 'https://thornode.ninerealms.com').split(',').map(s => s.trim()).filter(Boolean)
  if (!entries.length || entries.length > 3) throw new QuoteUnavailableError('Configure one to three THORNode endpoints')
  return [...new Set(entries.map(entry => {
    const url = new URL(entry)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new QuoteUnavailableError('THORNode endpoints must be HTTPS URLs without credentials or query strings')
    }
    return url.href.replace(/\/$/, '')
  }))]
}

type Fetcher = typeof fetch
export async function fetchThorQuote(params: URLSearchParams, endpoints = quoteEndpoints(), send: Fetcher = fetch) {
  for (const endpoint of endpoints) {
    try {
      const response = await send(`${endpoint}/thorchain/quote/swap?${params}`, {
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(2500),
      })
      if ([408, 429, 500, 502, 503, 504].includes(response.status)) { await response.body?.cancel(); continue }
      const data = await response.json()
      // A protocol rejection is useful information, not a provider outage.
      if (data && typeof data.error === 'string' && data.error) return data
      if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data)) continue
      if (typeof data.memo !== 'string' || !data.memo || typeof data.inbound_address !== 'string' || !data.inbound_address) continue
      if (typeof data.expected_amount_out !== 'string' || !/^\d+$/.test(data.expected_amount_out)) continue
      if (!Number.isSafeInteger(Number(data.expiry)) || Number(data.expiry) <= Math.floor(Date.now() / 1000)) continue
      if (!data.fees || typeof data.fees !== 'object') continue
      for (const name of ['liquidity', 'outbound']) {
        if (typeof data.fees[name] !== 'string' || !/^\d+$/.test(data.fees[name])) throw new QuoteUnavailableError('Malformed fee')
      }
      return data
    } catch {
      // Only quote reads are retried. This helper must never submit a transaction.
    }
  }
  throw new QuoteUnavailableError('Quote providers unavailable')
}
