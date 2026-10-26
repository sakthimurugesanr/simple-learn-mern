import type { Product, AttributeDefinition } from '@aurel/shared';
import {
  demoProducts,
  dressCategoryId,
  electronicsCategoryId,
  dressDefinitions,
  electronicsDefinitions,
  imageUrl,
} from '../../../../packages/shared/src/demo';
const base = process.env.API_URL ?? 'http://localhost:4000';
export async function serverApi<T>(
  path: string,
  fallback: T,
): Promise<{ data: T; preview: boolean }> {
  try {
    const r = await fetch(`${base}/api/v1/catalog${path}`, {
      next: { revalidate: 30, tags: ['catalog'] },
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) throw new Error('API unavailable');
    const result = await r.json();
    return { data: result.data, preview: false };
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    return { data: fallback, preview: true };
  }
}
export const getProducts = () => serverApi<Product[]>('/products?limit=32', demoProducts);
export const getProduct = (slug: string) =>
  serverApi<Product | null>(
    `/products/${encodeURIComponent(slug)}`,
    demoProducts.find((p) => p.slug === slug) ?? null,
  );
export interface Category {
  id: string;
  name: string;
  slug: string;
  definitions: AttributeDefinition[];
  image?: string;
  parentId?: string | null;
}
export const getCategories = () =>
  serverApi<Category[]>('/categories', [
    { id: dressCategoryId, name: 'Dresses', slug: 'dresses', definitions: dressDefinitions },
    {
      id: electronicsCategoryId,
      name: 'Electronics',
      slug: 'electronics',
      definitions: electronicsDefinitions,
    },
  ]);
export const getHome = () =>
  serverApi<any>('/home', {
    banners: [
      {
        id: 'preview',
        title: 'Less ordinary.\nMore you.',
        subtitle:
          'Thoughtful pieces for whatever your day becomes. Discover a new kind of everyday.',
        image: imageUrl('photo-1496747611176-843222e1e57c', 1800),
        href: '/shop',
      },
    ],
    offers: [{ code: 'HELLO10', percent: 10, title: 'A little welcome, on us.' }],
    collections: [],
    settings: { brandName: 'AUREL' },
  });
