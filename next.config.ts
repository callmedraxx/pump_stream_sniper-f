import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for better optimization
  output: 'standalone',
  
  // Experimental features for bundle optimization
  experimental: {
    // Better tree shaking for large packages
    optimizePackageImports: [
      '@solana/wallet-adapter-react',
      '@solana/web3.js',
      '@solana/spl-token'
    ],
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Reduce server bundle size by externalizing heavy dependencies
      config.externals = config.externals || []
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      })
    }
    
    // Better tree shaking for Solana packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/web3.js': '@solana/web3.js/lib/index.browser.esm.js',
    }
    
    // Optimize bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization?.splitChunks?.cacheGroups,
          solana: {
            name: 'solana',
            test: /[\\/]node_modules[\\/]@solana[\\/]/,
            chunks: 'all',
            priority: 10,
          },
        },
      },
    }
    
    return config
  },
  
  // Compress responses
  compress: true,
  
  // Your existing images configuration with optimization enhancements
  images: {
  // Allowlist domains for next/image (keeps backwards compatibility with domain-based checks)
  domains: ['pbs.twimg.com', 'ipfs.nftstorage.link', 'mypinata.cloud'],
    formats: ['image/webp', 'image/avif'], // Modern formats for better performance
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/ipfs/**',
      },
      // Allow nftstorage IPFS gateway subdomains (e.g. <cid>.ipfs.nftstorage.link)
      {
        protocol: 'https',
        hostname: '*.ipfs.nftstorage.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cf-ipfs.com',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'arweave.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.arweave.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's2.coinmarketcap.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thumbnails.padre.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'metadata.pumplify.eu',
        port: '',
        pathname: '/**',
      },
      // Allow direct image URLs served from IP:79.252.215.111:4141
      {
        protocol: 'http',
        hostname: '79.252.215.111',
        port: '4141',
        pathname: '/static/images/**',
      },
      // Allow Twitter image host used by some token images
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        port: '',
        pathname: '/**',
      },
      // Allow Pinata-hosted subdomains (e.g. letsbonk.mypinata.cloud)
      {
        protocol: 'https',
        hostname: '*.mypinata.cloud',
        port: '',
        pathname: '/ipfs/**',
      },
    ],
  },
};

export default nextConfig;