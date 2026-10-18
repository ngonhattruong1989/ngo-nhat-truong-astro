import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://ngonhattruong.com',
  output: 'server',
  session: false,
  integrations: [react()],
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile',
  }),
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    },
  },
  compressHTML: true,
});
