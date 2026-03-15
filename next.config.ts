import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle Node.js built-in modules that aren't available in the browser
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

      // Handle node: protocol imports by stripping the prefix
      config.plugins.push(
        // @ts-ignore - webpack types not exposed by Next.js
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
