/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default getViteConfig(
  {
    test: {
      environment: 'happy-dom',
      include: ['tests/**/*.test.ts'],
      globals: true
    }
  },
  {
    site: 'https://hologramthoughts.com',
    integrations: [svelte()]
  }
);
