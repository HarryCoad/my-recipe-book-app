import path from 'node:path';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  sassOptions: {
    implementation: 'sass-embedded',
    additionalData: `@use "${path.join(process.cwd(), '_mantine').replace(/\\/g, '/')}" as mantine;`,
  },
});
