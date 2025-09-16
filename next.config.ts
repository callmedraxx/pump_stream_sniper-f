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
    formats: ['image/webp', 'image/avif'], // Modern formats for better performance
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/ipfs/**',
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
    ],
  },
};

export default nextConfig;