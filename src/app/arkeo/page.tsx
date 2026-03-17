import { getArkeoProviderInfo } from '@/lib/arkeo-provider'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arkeo RPC Status | Decentralized Infrastructure',
  description:
    'See which blockchain RPCs are powered by Arkeo decentralized infrastructure and which use fallback endpoints.',
}

export default function ArkeoStatusPage() {
  const info = getArkeoProviderInfo()

  return (
    <main className="min-h-screen bg-tyler px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-leah mb-2 text-3xl font-bold">⚡ Arkeo RPC Status</h1>
          <p className="text-thor-gray text-sm">
            This frontend routes blockchain RPC calls through{' '}
            <a
              href="https://arkeomarketplace.com"
              className="text-emerald-400 underline hover:text-emerald-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Arkeo&apos;s decentralized marketplace
            </a>
            . Multiple providers compete on quality and price — no single point of failure.
          </p>
        </div>

        {/* Overall Status */}
        <div className="bg-lawrence mb-6 rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-leah font-semibold">Arkeo Routing</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                info.enabled
                  ? 'bg-emerald-400/20 text-emerald-400'
                  : 'bg-red-400/20 text-red-400'
              }`}
            >
              {info.enabled ? '● Active' : '○ Disabled'}
            </span>
          </div>
          {info.enabled && (
            <div className="text-thor-gray space-y-1 text-sm">
              <p>
                Active Providers: <span className="text-emerald-400 font-semibold">{info.providers.length}</span>
              </p>
              <p>
                Chains via Arkeo: <span className="text-emerald-400 font-semibold">{info.arkeoChains}</span>{' '}
                / {info.totalChains}
              </p>
              <p>
                Total provider slots: <span className="text-emerald-400 font-semibold">{info.totalProviderSlots}</span>{' '}
                (providers × chains)
              </p>
            </div>
          )}
        </div>

        {/* Providers */}
        <div className="bg-lawrence mb-6 rounded-2xl border">
          <div className="border-b p-4">
            <h2 className="text-leah font-semibold">Active Providers</h2>
          </div>
          <div className="divide-y">
            {info.providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-leah text-sm font-medium">{provider.name}</div>
                  <div className="text-thor-gray text-xs font-mono">{provider.url}</div>
                </div>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  ● Online
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chain List */}
        <div className="bg-lawrence rounded-2xl border">
          <div className="border-b p-4">
            <h2 className="text-leah font-semibold">Chain Routing</h2>
          </div>
          <div className="divide-y">
            {info.chains
              .sort((a, b) => (a.arkeoRouted === b.arkeoRouted ? 0 : a.arkeoRouted ? -1 : 1))
              .map((chain) => (
                <div key={chain.chain} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {chainEmoji(chain.chain)}
                      </span>
                      <div>
                        <div className="text-leah text-sm font-medium capitalize">
                          {chainDisplayName(chain.chain)}
                        </div>
                        {chain.providers.length > 0 && (
                          <div className="text-thor-gray text-xs">
                            {chain.providers.map(p => p.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {chain.providerCount > 1 && (
                        <span className="rounded-full bg-blue-400/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                          {chain.providerCount}x
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          chain.arkeoRouted
                            ? 'bg-emerald-400/20 text-emerald-400'
                            : 'bg-amber-400/20 text-amber-400'
                        }`}
                      >
                        {chain.arkeoRouted ? '⚡ Arkeo' : '↩ Fallback'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-lawrence mt-6 rounded-2xl border p-6">
          <h2 className="text-leah mb-3 font-semibold">How It Works</h2>
          <div className="text-thor-gray space-y-3 text-sm">
            <p>
              <span className="text-emerald-400 font-medium">⚡ Arkeo-routed</span> chains send
              RPC calls through Arkeo sentinel nodes. When multiple providers serve the same chain,
              the frontend automatically fails over between them for maximum reliability.
            </p>
            <p>
              <span className="text-amber-400 font-medium">↩ Fallback</span> chains use direct
              public endpoints. As providers add more chains to Arkeo, these will automatically
              upgrade to decentralized routing.
            </p>
            <p>
              Payment is handled via{' '}
              <span className="text-leah font-medium">Pay-As-You-Go (PAYG)</span> contracts using
              ARKEO tokens. No subscriptions, no KYC — just open infrastructure.
            </p>
          </div>
        </div>

        {/* Want to be a provider? */}
        <div className="bg-lawrence mt-6 rounded-2xl border p-6">
          <h2 className="text-leah mb-3 font-semibold">Want to Be a Provider?</h2>
          <div className="text-thor-gray space-y-3 text-sm">
            <p>
              Anyone can run an Arkeo provider and earn ARKEO tokens by serving RPC data. Host this
              frontend, register your sentinel, and start earning.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://arkeomarketplace.com"
                className="rounded-full bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-400/30"
                target="_blank"
                rel="noopener noreferrer"
              >
                Browse Marketplace →
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-thor-gray mt-8 text-center text-xs">
          <p>
            Powered by{' '}
            <a
              href="https://arkeo.network"
              className="text-emerald-400 underline hover:text-emerald-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Arkeo Network
            </a>{' '}
            — Decentralized marketplace for blockchain data and interaction
          </p>
        </div>
      </div>
    </main>
  )
}

function chainDisplayName(chain: string): string {
  const names: Record<string, string> = {
    thorchain: 'THORChain',
    ethereum: 'Ethereum',
    base: 'Base',
    bsc: 'BNB Smart Chain',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    avalanche: 'Avalanche',
    cosmos: 'Cosmos Hub',
    bitcoin: 'Bitcoin',
    litecoin: 'Litecoin',
    dogecoin: 'Dogecoin',
  }
  return names[chain] || chain
}

function chainEmoji(chain: string): string {
  const emojis: Record<string, string> = {
    thorchain: '⚡',
    ethereum: '💎',
    base: '🔵',
    bsc: '🟡',
    polygon: '🟣',
    arbitrum: '🔷',
    avalanche: '🔺',
    cosmos: '⚛️',
    bitcoin: '₿',
    litecoin: '🪙',
    dogecoin: '🐕',
  }
  return emojis[chain] || '🔗'
}
