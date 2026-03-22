/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.platform === 'win32' ? undefined : 'standalone',
};
export default nextConfig;
