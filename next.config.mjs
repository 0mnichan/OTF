/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node:sqlite'],
  experimental: {
    // Room content is read from disk at request time in dev so authors get
    // live reload without re-running the sync script.
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
