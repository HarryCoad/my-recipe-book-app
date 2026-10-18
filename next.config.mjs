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
  async redirects() {
    return [
      // Recipe pages moved from /my-recipes/<id>, since they show anyone's recipe.
      // /my-recipes/new is still the create page
      {
        source: '/my-recipes/:id((?!new$)[^/]+)/:rest*',
        destination: '/recipes/:id/:rest*',
        permanent: true,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  sassOptions: {
    implementation: 'sass-embedded',
    additionalData: `@use "${path.join(process.cwd(), '_mantine').replace(/\\/g, '/')}" as mantine;`,
  },
});
