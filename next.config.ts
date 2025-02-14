import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  // If you have a base path (for GitHub Pages)
  basePath: process.env.GITHUB_PAGES ? '/othello-web' : '',
  // Ensure your assetPrefix matches
  assetPrefix: process.env.GITHUB_PAGES ? '/othello-web/' : '',
  
  webpack: (config, { isServer }) => {
    // Allow importing wasm files
    config.experiments = { 
      ...config.experiments, 
      asyncWebAssembly: true,
      layers: true
    };
    
    // Fallback configurations
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async'
    });

    return config;
  },
};

export default nextConfig;
