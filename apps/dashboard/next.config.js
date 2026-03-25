/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drug-store/shared', '@drug-store/ui'],
};

module.exports = nextConfig;
