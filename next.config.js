/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour le déploiement statique
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig