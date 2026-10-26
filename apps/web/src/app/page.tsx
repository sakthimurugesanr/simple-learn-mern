import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  PackageCheck,
  Truck,
  MessageCircle,
  Star,
} from 'lucide-react';
import { getProducts, getHome } from '@/lib/server-api';
import { ProductCard } from '@/components/product-card';
import { Hero } from '@/components/hero';
import { Newsletter } from '@/components/newsletter';
import { Button } from '@/components/ui/button';
import { imageUrl } from '../../../../packages/shared/src/demo';
export default async function Home() {
  const [products, home] = await Promise.all([getProducts(), getHome()]);
  const arrivals =
    home.data.collections
      ?.find((c: any) => c.slug === 'new-arrivals')
      ?.products?.map((p: any) => p.product) ?? products.data.slice(0, 4);
  const best =
    home.data.collections
      ?.find((c: any) => c.slug === 'best-sellers')
      ?.products?.map((p: any) => p.product) ?? products.data.slice(4, 8);
  return (
    <>
      {products.preview && (
        <div className="bg-secondary px-4 py-2 text-center text-[11px]">
          Collection preview · Start the API and database to enable accounts and orders.
        </div>
      )}
      <Hero banners={home.data.banners} />
      <div className="border-b">
        <div className="shell grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
          {[
            [Leaf, 'Thoughtfully chosen'],
            [Truck, 'Free shipping ₹2,499+'],
            [PackageCheck, 'Cash on delivery'],
            [MessageCircle, 'A little help, on WhatsApp'],
          ].map(([Icon, text]: any) => (
            <div
              key={text}
              className="flex items-center justify-center gap-3 text-[10px] tracking-wide"
            >
              <Icon className="size-4 stroke-[1.3]" />
              {text}
            </div>
          ))}
        </div>
      </div>
      <section className="shell py-16 md:py-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-4 text-muted-foreground">A FRESH PERSPECTIVE</p>
            <h2 className="section-heading mb-0">Meet your new favourites.</h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="hidden items-center gap-7 border-b pb-2 text-xs sm:flex"
          >
            Shop new arrivals <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-4 md:gap-6">
          {arrivals.slice(0, 4).map((p: any, i: number) => (
            <ProductCard key={p.id} product={p} index={i + 3} />
          ))}
        </div>
        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Good design doesn’t shout. It just feels right.
        </p>
      </section>
      <section className="shell mb-20">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="section-heading mb-0">Find your kind of everyday.</h2>
          <span className="eyebrow hidden text-muted-foreground md:block">THE AUREL EDITS</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              'Dresses, with ease.',
              'For wherever the day takes you.',
              'photo-1539008835657-9e8e9680c956',
              '/shop?category=dresses',
            ],
            [
              'Everyday essentials.',
              'The pieces you reach for. Again.',
              'photo-1515886657613-9f3515b0c78f',
              '/shop',
            ],
            [
              'A considered little upgrade.',
              'Discover the studio tech edit.',
              'photo-1505740420928-5e560c06d30e',
              '/shop?category=electronics',
            ],
          ].map(([title, sub, img, href]) => (
            <Link
              href={href}
              key={title}
              className="group relative block aspect-[4/4.5] overflow-hidden bg-muted"
            >
              <Image
                src={imageUrl(img)}
                alt={title}
                fill
                sizes="(max-width:767px) 100vw, 33vw"
                className="product-image object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between bg-background/95 p-5">
                <div>
                  <h3 className="font-editorial mb-2 text-2xl">{title}</h3>
                  <p className="mb-0 text-[10px] text-muted-foreground">{sub}</p>
                </div>
                <ArrowUpRight className="size-5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="grid bg-[#e7eadd] text-[#304334] md:grid-cols-2">
        <div className="relative min-h-[420px]">
          <Image
            src={imageUrl('photo-1483985988355-763728e1935b', 1400)}
            alt="Personal style, lived in naturally"
            fill
            sizes="(max-width:767px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-start justify-center px-8 py-16 md:px-20">
          <p className="eyebrow mb-6">THE NEW SEASON EDIT</p>
          <h2 className="font-editorial mb-6 text-5xl leading-[1.05] md:text-6xl">
            A little slower.
            <br />A little more you.
          </h2>
          <p className="mb-8 max-w-sm text-sm leading-7 text-[#5a6759]">
            Easy silhouettes. Earthy tones. Pieces that move with you, from your first coffee to
            your last plan.
          </p>
          <Button asChild className="bg-[#304c3c] text-white">
            <Link href="/shop?collection=new-launches">
              Explore the edit <ArrowUpRight className="ml-6" />
            </Link>
          </Button>
        </div>
      </section>
      <section className="shell py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-4 text-muted-foreground">LOVED, FOR A REASON</p>
            <h2 className="section-heading mb-0">On repeat. For good.</h2>
          </div>
          <Link className="flex items-center gap-3 text-xs" href="/shop?collection=best-sellers">
            Shop best sellers <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {best.slice(0, 4).map((p: any, i: number) => (
            <ProductCard product={p} key={p.id} index={i + 4} />
          ))}
        </div>
      </section>
      <section className="shell mb-20 flex flex-wrap items-center justify-between gap-8 bg-secondary p-9 md:p-12">
        <div>
          <p className="eyebrow mb-4">YOUR FIRST HELLO</p>
          <h2 className="font-editorial mb-3 text-4xl">A little welcome, on us.</h2>
          <p className="mb-0 text-xs text-muted-foreground">
            Enjoy {home.data.offers?.[0]?.percent ?? 10}% off your first order. Use{' '}
            <strong className="tracking-widest text-foreground">
              {home.data.offers?.[0]?.code ?? 'HELLO10'}
            </strong>{' '}
            at checkout.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/shop">
            Find something you love <ArrowRight />
          </Link>
        </Button>
      </section>
      <section className="shell border-t py-16 text-center">
        <p className="eyebrow mb-6 text-muted-foreground">LESS, BUT BETTER</p>
        <h2 className="font-editorial mx-auto max-w-3xl text-4xl leading-snug md:text-5xl">
          “We believe the best things in your wardrobe are the ones that feel like you.”
        </h2>
        <Link href="/about" className="mt-5 inline-flex items-center gap-3 border-b pb-2 text-xs">
          A little about Aurel <ArrowUpRight className="size-4" />
        </Link>
        <div className="mt-10 flex justify-center gap-1" aria-label="Made with care">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-3 fill-primary stroke-primary" />
          ))}
        </div>
      </section>
      {home.data.testimonials?.length > 0 && (
        <section className="shell py-16">
          <h2 className="section-heading mb-10">Good words, from good company.</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {home.data.testimonials.map((t: any) => (
              <figure key={t.id} className="m-0 border p-7">
                <div className="mb-5 flex gap-1" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }, (_, i) => (
                    <Star key={i} className="size-3 fill-primary stroke-primary" />
                  ))}
                </div>
                <blockquote className="m-0 font-editorial text-xl leading-8">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 text-xs text-muted-foreground">
                  {t.name} · {t.location}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <Newsletter />
    </>
  );
}
