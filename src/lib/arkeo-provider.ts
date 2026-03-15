/**
 * Arkeo Provider Configuration
 * 
 * Routes RPC calls through Arkeo sentinel nodes instead of hardcoded endpoints.
 * This is the core of Phase 2: frontends powered by Arkeo's decentralized marketplace.
 * 
 * How it works:
 * - Frontend provider configures their Arkeo sentinel URL
 * - All RPC calls route through the sentinel
 * - Sentinel handles provider selection, payment (PAYG), and failover
 * - If Arkeo is unavailable, falls back to direct endpoints
 */

// Arkeo sentinel configuration — set by the frontend provider
const ARKEO_SENTINEL_URL = process.env.NEXT_PUBLIC_ARKEO_SENTINEL_URL || ''
const ARKEO_ENABLED = process.env.NEXT_PUBLIC_ARKEO_ENABLED === 'true'

// Service name mappings: chain name → Arkeo service identifier
// These match the service names registered by Arkeo providers
const ARKEO_SERVICES: Record<string, string> = {
  thorchain: 'thorchain-mainnet-fullnode',
  ethereum: 'eth-mainnet-fullnode',
  'bsc': 'bsc-mainnet-fullnode',
  'base': 'base-mainnet-fullnode',
  'avalanche': 'avax-mainnet-fullnode',
  'cosmos': 'gaia-mainnet-fullnode',
  'bitcoin': 'btc-mainnet-fullnode',
  'litecoin': 'ltc-mainnet-fullnode',
  'dogecoin': 'doge-mainnet-fullnode',
}

// Fallback endpoints when Arkeo is not configured or unavailable
const FALLBACK_ENDPOINTS: Record<string, string[]> = {
  thorchain: ['https://thornode.ninerealms.com'],
  ethereum: ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com'],
}

/**
 * Get the RPC URL for a given chain.
 * Routes through Arkeo sentinel if configured, otherwise uses fallback.
 */
export function getArkeoRpcUrl(chain: string): string {
  if (ARKEO_ENABLED && ARKEO_SENTINEL_URL) {
    const service = ARKEO_SERVICES[chain]
    if (service) {
      return `${ARKEO_SENTINEL_URL}/${service}`
    }
  }
  
  // Fallback to direct endpoints
  const fallbacks = FALLBACK_ENDPOINTS[chain]
  return fallbacks?.[0] || ''
}

/**
 * Get all RPC URLs for a chain (primary Arkeo + fallbacks).
 * Used by wallet config which accepts an array of URLs.
 */
export function getArkeoRpcUrls(chain: string): string[] {
  const urls: string[] = []
  
  if (ARKEO_ENABLED && ARKEO_SENTINEL_URL) {
    const service = ARKEO_SERVICES[chain]
    if (service) {
      urls.push(`${ARKEO_SENTINEL_URL}/${service}`)
    }
  }
  
  // Add fallbacks
  const fallbacks = FALLBACK_ENDPOINTS[chain] || []
  urls.push(...fallbacks)
  
  return urls
}

/**
 * Check if Arkeo routing is active.
 */
export function isArkeoEnabled(): boolean {
  return ARKEO_ENABLED && !!ARKEO_SENTINEL_URL
}

/**
 * Get Arkeo provider info for display in the UI.
 */
export function getArkeoProviderInfo() {
  return {
    enabled: isArkeoEnabled(),
    sentinelUrl: ARKEO_SENTINEL_URL,
    marketplace: 'https://arkeomarketplace.com',
  }
}
