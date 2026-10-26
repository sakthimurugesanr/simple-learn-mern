import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getProducts, getCategories } from '@/lib/server-api';
import { CatalogBrowser } from '@/components/catalog-browser';
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: params.q ? `Search: ${params.q}` : 'The collection',
    alternates: { canonical: '/shop' },
    robots:
      params.q || params.attributes || params.sort ? { index: false, follow: true } : undefined,
  };
}
export default async function Shop() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return (
    <Suspense fallback={<div className="shell py-20">Loading the collection…</div>}>
      <CatalogBrowser
        initialProducts={products.data}
        categories={categories.data}
        preview={products.preview}
      />
    </Suspense>
  );
}
