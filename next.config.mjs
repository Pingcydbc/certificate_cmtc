/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config) => {
    config.externals.push({
      '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
    });
    return config;
  },
};

export default nextConfig;
