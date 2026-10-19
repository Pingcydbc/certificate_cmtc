/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  webpack: (config) => {
    config.externals.push({
      '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
    });
    return config;
  },
};

export default nextConfig;
