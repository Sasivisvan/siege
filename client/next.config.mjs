/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Allow importing from ../shared/ which is outside the client/ directory
  transpilePackages: ['shared'],
};

export default nextConfig;
