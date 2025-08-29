/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour le déploiement statique
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Configuration pour le déploiement statique
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  
  // Optimisations pour mobile
  experimental: {
    // Optimiser le rendu sur mobile
    optimizeCss: true,
    // Améliorer les performances de chargement
    optimizePackageImports: ['lucide-react'],
  },
  
  // Configuration des en-têtes pour mobile
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Optimisations pour mobile
          {
            key: 'Viewport-Width',
            value: 'device-width',
          },
          {
            key: 'Mobile-Optimized',
            value: 'true',
          },
        ],
      },
    ]
  },
  
  // Configuration webpack pour optimiser les bundles
  webpack: (config, { dev, isServer }) => {
    // Optimisations pour mobile
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig
