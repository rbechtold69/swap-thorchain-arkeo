/**
 * Arkeo Provider Configuration — Multi-Provider Routing
 * 
 * Routes RPC calls through multiple Arkeo sentinel nodes with failover.
 * This is Phase 2: frontends powered by Arkeo's decentralized provider marketplace.
 * 
 * How it works:
 * - Multiple Arkeo providers are configured per chain
 * - Primary provider is tried first, with automatic failover to secondary/tertiary
 * - If all Arkeo providers fail, falls back to direct endpoints
 * - Provider selection can be customized (round-robin, fastest, etc.)
 *
 * Active Arkeo Providers:
 * - Liquify (arkeo-provider.liquify.com): Base, BSC, Polygon, Arkeo
 * - 0xFury (arkeo.dc01.0xfury.io:3636): ETH, Base
 * - InnovationTheory (provider-core-1.innovationtheory.com:3636): ETH, Base
 * - Everstake (135.181.18.66:3636): Arbitrum, Aptos, Cosmos, Injective, NEAR
 */

const ARKEO_ENABLED = process.env.NEXT_PUBLIC_ARKEO_ENABLED === 'true'

// All active Arkeo provider sentinels (verified online)
// Direct URLs for server-side / development, proxy paths for HTTPS production
const ARKEO_PROVIDERS_DIRECT = {
  liquify: { name: 'Liquify', url: 'https://arkeo-provider.liquify.com' },
  oxfury: { name: '0xFury', url: 'http://arkeo.dc01.0xfury.io:3636' },
  innovationtheory: { name: 'InnovationTheory', url: 'http://provider-core-1.innovationtheory.com:3636' },
  everstake: { name: 'Everstake', url: 'http://135.181.18.66:3636' },
  stakevillage: { name: 'StakeVillage', url: 'http://arkeo-provider.stakevillage.net:3636' },
  red5: { name: 'Red_5', url: 'http://red5-arkeo.duckdns.org:3636' },
} as const

// Absolute HTTPS proxy paths (Caddy routes /rpc/* to the HTTP sentinels)
// Must be absolute URLs because the SDK uses new URL(path) which requires a base
const SWAP_ORIGIN = 'https://swap.arkeomarketplace.com'
const ARKEO_PROVIDERS_PROXY = {
  liquify: { name: 'Liquify', url: 'https://arkeo-provider.liquify.com' }, // already HTTPS
  oxfury: { name: '0xFury', url: `${SWAP_ORIGIN}/rpc/oxfury` },
  innovationtheory: { name: 'InnovationTheory', url: `${SWAP_ORIGIN}/rpc/innovationtheory` },
  everstake: { name: 'Everstake', url: `${SWAP_ORIGIN}/rpc/everstake` },
  stakevillage: { name: 'StakeVillage', url: `${SWAP_ORIGIN}/rpc/stakevillage` },
  red5: { name: 'Red_5', url: `${SWAP_ORIGIN}/rpc/red5` },
} as const

// Always use proxy URLs in production (works for both SSR and client)
// This avoids the caching bug where SSR picks DIRECT and client inherits HTTP URLs
function providers(): Record<string, { name: string; url: string }> {
  return ARKEO_PROVIDERS_PROXY as unknown as Record<string, { name: string; url: string }>
}

// For type definitions only
const ARKEO_PROVIDERS = ARKEO_PROVIDERS_DIRECT

type ProviderId = keyof typeof ARKEO_PROVIDERS

// Chain → ordered list of Arkeo providers (primary first, then failovers)
// Service names MUST match what's registered on the Arkeo chain
// Only includes providers verified responding as of 2026-03-17
const ARKEO_CHAIN_PROVIDERS: Record<string, { provider: ProviderId; service: string }[]> = {
  ethereum: [
    { provider: 'oxfury', service: 'eth-mainnet-fullnode' },
    { provider: 'innovationtheory', service: 'eth-mainnet-fullnode' },
    { provider: 'stakevillage', service: 'eth-mainnet-fullnode' },
  ],
  base: [
    { provider: 'liquify', service: 'base-mainnet-fullnode' },
    { provider: 'oxfury', service: 'base-mainnet-fullnode' },
  ],
  bsc: [
    { provider: 'liquify', service: 'bsc-mainnet-fullnode' },
  ],
  polygon: [
    { provider: 'liquify', service: 'polygon-mainnet-fullnode' },
  ],
  arbitrum: [
    { provider: 'everstake', service: 'arbitrum-mainnet-fullnode' },
  ],
  cosmos: [
    { provider: 'everstake', service: 'gaia-mainnet-fullnode' },
  ],
  arkeo: [
    { provider: 'liquify', service: 'arkeo-mainnet-fullnode' },
    { provider: 'red5', service: 'arkeo-mainnet-fullnode' },
    { provider: 'innovationtheory', service: 'arkeo-mainnet-fullnode' },
  ],
}

// Fallback endpoints when all Arkeo providers fail
const FALLBACK_ENDPOINTS: Record<string, string[]> = {
  thorchain: ['https://thornode.ninerealms.com'],
  ethereum: ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com'],
  base: ['https://mainnet.base.org'],
  bsc: ['https://bsc-dataseed.binance.org'],
  polygon: ['https://polygon-rpc.com'],
  arbitrum: ['https://arb1.arbitrum.io/rpc'],
  avalanche: ['https://api.avax.network/ext/bc/C/rpc'],
  cosmos: ['https://cosmos-rpc.publicnode.com:443'],
  bitcoin: [],
  litecoin: [],
  dogecoin: [],
}

export type ProviderInfo = {
  name: string
  url: string
  service: string
}

export type ChainStatus = {
  chain: string
  arkeoRouted: boolean
  providers: ProviderInfo[]
  activeUrl: string
  providerCount: number
}

/**
 * Get all Arkeo provider URLs for a chain (for failover).
 */
function getArkeoProviderUrls(chain: string): { url: string; provider: string; service: string }[] {
  if (!ARKEO_ENABLED) return []
  
  const chainProviders = ARKEO_CHAIN_PROVIDERS[chain]
  if (!chainProviders) return []
  
  return chainProviders.map(cp => ({
    url: `${providers()[cp.provider].url}/${cp.service}`,
    provider: providers()[cp.provider].name,
    service: cp.service,
  }))
}

/**
 * Get the primary RPC URL for a given chain.
 * Uses first available Arkeo provider, then falls back to direct endpoints.
 */
export function getArkeoRpcUrl(chain: string): string {
  const arkeoUrls = getArkeoProviderUrls(chain)
  if (arkeoUrls.length > 0) {
    return arkeoUrls[0].url
  }
  
  const fallbacks = FALLBACK_ENDPOINTS[chain]
  return fallbacks?.[0] || ''
}

/**
 * Get all RPC URLs for a chain (all Arkeo providers + fallbacks).
 * Used by wallet config which accepts an array of URLs for failover.
 */
export function getArkeoRpcUrls(chain: string): string[] {
  const urls: string[] = []
  
  // Add all Arkeo provider URLs first
  const arkeoUrls = getArkeoProviderUrls(chain)
  urls.push(...arkeoUrls.map(u => u.url))
  
  // Add fallbacks
  const fallbacks = FALLBACK_ENDPOINTS[chain] || []
  urls.push(...fallbacks)
  
  return urls
}

/**
 * Check if Arkeo routing is active.
 */
export function isArkeoEnabled(): boolean {
  return ARKEO_ENABLED
}

/**
 * Check if a specific chain is routed through Arkeo.
 */
export function isChainArkeoRouted(chain: string): boolean {
  return ARKEO_ENABLED && (ARKEO_CHAIN_PROVIDERS[chain]?.length ?? 0) > 0
}

/**
 * Get status of all chains — which are Arkeo-routed vs fallback.
 */
export function getChainStatuses(): ChainStatus[] {
  const allChains = new Set([
    ...Object.keys(ARKEO_CHAIN_PROVIDERS),
    ...Object.keys(FALLBACK_ENDPOINTS),
  ])

  return Array.from(allChains).map(chain => {
    const arkeoUrls = getArkeoProviderUrls(chain)
    return {
      chain,
      arkeoRouted: arkeoUrls.length > 0,
      providers: arkeoUrls.map(u => ({ name: u.provider, url: u.url, service: u.service })),
      activeUrl: getArkeoRpcUrl(chain),
      providerCount: arkeoUrls.length,
    }
  })
}

/**
 * Get Arkeo provider info for display in the UI.
 */
export function getArkeoProviderInfo() {
  const statuses = getChainStatuses()
  const arkeoChains = statuses.filter(s => s.arkeoRouted)
  const totalProviderSlots = arkeoChains.reduce((sum, s) => sum + s.providerCount, 0)

  return {
    enabled: isArkeoEnabled(),
    providers: Object.entries(providers()).map(([id, p]) => ({
      id,
      name: p.name,
      url: p.url,
    })),
    marketplace: 'https://arkeomarketplace.com',
    arkeoChains: arkeoChains.length,
    totalChains: statuses.length,
    totalProviderSlots,
    chains: statuses,
  }
}
