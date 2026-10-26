import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, getProducts } from '@/lib/server-api';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: p } = await getProduct(slug);
  if (!p) return { title: 'Piece not found' };
  return {
    title: p.name,
    description: p.description.replace(/<[^>]*>/g, '').slice(0, 160),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { images: p.images.map((i) => ({ url: i.url, alt: i.alt })) },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ data: p, preview }, related] = await Promise.all([getProduct(slug), getProducts()]);
  if (!p) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description.replace(/<[^>]*>/g, ''),
    image: p.images.map((i) => i.url),
    sku: p.variants[0]?.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: (p.price / 100).toFixed(2),
      availability: p.variants.some((v) => v.stock > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/product/${p.slug}`,
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }}
      />
      <ProductDetail product={p} preview={preview} />
      <section className="shell py-16">
        <h2 className="section-heading mb-10">Good company for your find.</h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {related.data
            .filter((r) => r.id !== p.id && r.categoryId === p.categoryId)
            .slice(0, 4)
            .map((r, i) => (
              <ProductCard key={r.id} product={r} index={i + 4} />
            ))}
        </div>
      </section>
    </>
  );
}
