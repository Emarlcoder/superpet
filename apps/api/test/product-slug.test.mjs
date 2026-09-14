import { describe, expect, it } from 'vitest';
import { productSlug } from '../dist/domain/product-slug.js';

describe('Automatic product URLs', () => {
  it('normalizes accents, whitespace and punctuation', () => {
    expect(productSlug('  Aliménto para GATOS / 5 kg 🐾 ')).toBe(
      'alimento-para-gatos-5-kg',
    );
    expect(productSlug('🐾')).toBe('producto');
  });
  it('reserves room for a collision suffix within the URL length limit', () => {
    const slug = productSlug('á'.repeat(160), 12);
    expect(slug).toHaveLength(160);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-12$/);
  });
});
