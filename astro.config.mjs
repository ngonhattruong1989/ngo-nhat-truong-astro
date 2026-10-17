import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://ngonhattruong.com',
  output: 'server',
  session: false,
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile',
  }),
  compressHTML: true,
});
