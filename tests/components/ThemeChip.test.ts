import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ThemeChip from '../../src/components/ThemeChip.astro';

describe('ThemeChip', () => {
  it('renders button with theme id and name', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ThemeChip, { props: { id: 'oneness', name: 'Oneness' } });
    expect(html).toContain('data-theme="oneness"');
    expect(html).toContain('Oneness');
  });
});
