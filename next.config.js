/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour le déploiement statique
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Configuration pour le déploiement statique
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  
  // Optimisations pour mobile
  experimental: {
    // Améliorer les performances de chargement
    optimizePackageImports: ['lucide-react'],
  },
  
  // Note: Les headers personnalisés ne sont pas supportés avec output: 'export'
  // Les headers de sécurité seront gérés par le serveur web (Render)
  
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
