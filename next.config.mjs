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
      // Recipe pages moved from /my-recipes/<id>, since they show anyone's recipe. Redirects run
      // before pages are matched, so the pages still under /my-recipes are left out: new (create)
      // and import (bulk import)
      {
        source: '/my-recipes/:id((?!(?:new|import)$)[^/]+)/:rest*',
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
