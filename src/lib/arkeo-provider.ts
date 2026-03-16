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
 * - If Arkeo is unavailable or a chain isn't listed, falls back to direct endpoints
 *
 * Current Arkeo provider (Liquify) services:
 * - base-mainnet-fullnode (id: 89)
 * - bsc-mainnet-fullnode (id: 8)
 * - polygon-mainnet-fullnode (id: 29)
 * - arkeo-mainnet-fullnode (id: 1)
 *
 * Chains NOT yet on Arkeo (using fallback):
 * - THORChain, Ethereum, Bitcoin, Litecoin, Dogecoin, Avalanche, Cosmos
 * - These will be added as providers register them on the marketplace
 */

// Arkeo sentinel configuration — set by the frontend provider
const ARKEO_SENTINEL_URL = process.env.NEXT_PUBLIC_ARKEO_SENTINEL_URL || ''
const ARKEO_ENABLED = process.env.NEXT_PUBLIC_ARKEO_ENABLED === 'true'

// Service name mappings: chain name → Arkeo service identifier
// These MUST match the actual service names registered by Arkeo providers
// See provider metadata at: {SENTINEL_URL}:3636/metadata.json
const ARKEO_SERVICES: Record<string, string> = {
  // Currently available on Liquify sentinel
  base: 'base-mainnet-fullnode',
  bsc: 'bsc-mainnet-fullnode',
  polygon: 'polygon-mainnet-fullnode',
  // Future — will be added as providers register them
  // thorchain: 'thorchain-mainnet-fullnode',
  // ethereum: 'eth-mainnet-fullnode',
  // bitcoin: 'btc-mainnet-fullnode',
  // cosmos: 'gaia-mainnet-fullnode',
  // avalanche: 'avax-mainnet-fullnode',
  // litecoin: 'ltc-mainnet-fullnode',
  // dogecoin: 'doge-mainnet-fullnode',
}

// Fallback endpoints when Arkeo doesn't have the service
const FALLBACK_ENDPOINTS: Record<string, string[]> = {
  thorchain: ['https://thornode.ninerealms.com'],
  ethereum: ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com'],
  base: ['https://mainnet.base.org'],
  bsc: ['https://bsc-dataseed.binance.org'],
  polygon: ['https://polygon-rpc.com'],
  avalanche: ['https://api.avax.network/ext/bc/C/rpc'],
  cosmos: ['https://cosmos-rpc.publicnode.com:443'],
  bitcoin: [],
  litecoin: [],
  dogecoin: [],
}

export type ChainStatus = {
  chain: string
  arkeoRouted: boolean
  serviceId: string | null
  url: string
}

/**
 * Get the RPC URL for a given chain.
 * Routes through Arkeo sentinel if the service exists, otherwise uses fallback.
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
 * Check if Arkeo routing is active (at least one chain routed through Arkeo).
 */
export function isArkeoEnabled(): boolean {
  return ARKEO_ENABLED && !!ARKEO_SENTINEL_URL
}

/**
 * Check if a specific chain is routed through Arkeo.
 */
export function isChainArkeoRouted(chain: string): boolean {
  return ARKEO_ENABLED && !!ARKEO_SENTINEL_URL && !!ARKEO_SERVICES[chain]
}

/**
 * Get status of all chains — which are Arkeo-routed vs fallback.
 */
export function getChainStatuses(): ChainStatus[] {
  const allChains = new Set([
    ...Object.keys(ARKEO_SERVICES),
    ...Object.keys(FALLBACK_ENDPOINTS),
  ])

  return Array.from(allChains).map(chain => ({
    chain,
    arkeoRouted: isChainArkeoRouted(chain),
    serviceId: ARKEO_SERVICES[chain] || null,
    url: getArkeoRpcUrl(chain),
  }))
}

/**
 * Get Arkeo provider info for display in the UI.
 */
export function getArkeoProviderInfo() {
  const statuses = getChainStatuses()
  const arkeoCount = statuses.filter(s => s.arkeoRouted).length
  const totalCount = statuses.length

  return {
    enabled: isArkeoEnabled(),
    sentinelUrl: ARKEO_SENTINEL_URL,
    marketplace: 'https://rbechtold69.github.io/arkeo-data-engine-v2/',
    arkeoChains: arkeoCount,
    totalChains: totalCount,
    chains: statuses,
  }
}
