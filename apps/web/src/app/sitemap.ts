import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/server-api';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { data } = await getProducts();
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    ...data.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
