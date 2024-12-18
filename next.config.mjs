/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io'
      }
    ]
  },
  experimental: {
    taint: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: '*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://www.jpalindrome.com https://jpalindrome.com '
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
          }
        ]
      }
    ]
  }
}

export default nextConfig
