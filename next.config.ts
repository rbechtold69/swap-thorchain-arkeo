import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Server mode for arkeomarketplace.com
  // output: 'export',
  // basePath: '/swap-thorchain-arkeo',
  // trailingSlash: true,

  turbopack: {
    resolveAlias: {
      // 0.7.16's ESM wrapper references a file missing from its package.
      'libsodium-wrappers-sumo': './node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js',
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'libsodium-wrappers-sumo': require.resolve('libsodium-wrappers-sumo'),
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        os: false,
        url: false,
        assert: false,
        http: false,
        https: false,
        zlib: false,
      }

      config.plugins.push(
        // @ts-ignore
        new (require('next/dist/compiled/webpack/webpack-lib.js').NormalModuleReplacementPlugin)(
          /^node:/,
          (resource: any) => {
            resource.request = resource.request.replace(/^node:/, '')
          }
        )
      )
    }
    return config
  },
}

export default nextConfig
