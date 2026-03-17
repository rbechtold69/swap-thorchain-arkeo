import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Server mode for arkeomarketplace.com
  // output: 'export',
  // basePath: '/swap-thorchain-arkeo',
  // trailingSlash: true,

  turbopack: {},
  webpack: (config, { isServer }) => {
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
