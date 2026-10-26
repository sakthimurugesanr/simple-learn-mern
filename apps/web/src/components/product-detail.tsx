'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  ShoppingBag,
  Truck,
  PackageCheck,
  Share2,
  Check,
  MessageCircle,
  ZoomIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, type Product } from '@aurel/shared';
import { actions, useAppDispatch, useAppSelector, useGetQuery } from '@/lib/store';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
export function ProductDetail({ product: p, preview }: { product: Product; preview: boolean }) {
  const [variantId, setVariant] = useState(p.variants[0]?.id);
  const [image, setImage] = useState(0);
  const variant = p.variants.find((v) => v.id === variantId);
  const dispatch = useAppDispatch();
  const saved = useAppSelector((s) => s.commerce.wishlist.some((w) => w.id === p.id));
  const { data: settings } = useGetQuery('/catalog/settings', { skip: preview });
  const number = settings?.data?.whatsappNumber;
  const add = () => {
    if (!variant || !variant.stock) return;
    dispatch(actions.addItem({ variantId: variant.id, quantity: 1, product: p }));
    toast.success('A good choice. Added to your bag.');
  };
  return (
    <div className="shell py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 flex gap-3 text-[11px] text-muted-foreground">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Collection</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden bg-muted"
                aria-label="Zoom product image"
              >
                <Image
                  src={p.images[image].url}
                  alt={p.images[image].alt}
                  fill
                  priority
                  sizes="(max-width:1023px) 100vw, 50vw"
                  className="object-cover"
                />
                <ZoomIn className="absolute bottom-5 right-5 size-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogTitle className="sr-only">{p.name}</DialogTitle>
              <DialogDescription className="sr-only">Product image enlarged</DialogDescription>
              <div className="relative h-[75dvh]">
                <Image
                  src={p.images[image].url}
                  alt={p.images[image].alt}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {p.images.map((img, i) => (
                <Button
                  key={img.url}
                  variant={image === i ? 'default' : 'outline'}
                  onClick={() => setImage(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="lg:px-8 lg:py-5">
          <p className="eyebrow mb-5 text-muted-foreground">
            {p.category?.name} · THE AUREL COLLECTION
          </p>
          <h1 className="font-editorial mb-6 text-4xl leading-tight md:text-5xl">{p.name}</h1>
          <div className="mb-2 flex items-center gap-4">
            <span className="text-xl">{formatMoney(variant?.price ?? p.price)}</span>
            {p.compareAtPrice && (
              <s className="text-sm text-muted-foreground">{formatMoney(p.compareAtPrice)}</s>
            )}
          </div>
          <p className="mb-8 text-[11px] text-muted-foreground">Inclusive of all taxes</p>
          <p className="mb-8 text-sm leading-7 text-muted-foreground">
            {p.description.replace(/<[^>]*>/g, '')}
          </p>
          <div className="mb-6 border-y py-6">
            <p className="mb-3 text-xs font-medium">Choose your variant</p>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((v) => (
                <Button
                  key={v.id}
                  variant={variantId === v.id ? 'default' : 'outline'}
                  disabled={!v.stock}
                  aria-pressed={variantId === v.id}
                  onClick={() => setVariant(v.id)}
                >
                  {Object.values(v.attributes).join(' / ') || 'Standard'}
                </Button>
              ))}
            </div>
            <p className="mb-0 mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`size-1.5 rounded-full ${variant?.stock ? 'bg-green-700' : 'bg-red-600'}`}
              />
              {variant?.stock
                ? variant.stock < 6
                  ? `Only ${variant.stock} left. Make it yours.`
                  : 'In stock, ready for your everyday.'
                : 'This piece is currently out of stock.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button size="lg" className="flex-1" onClick={add} disabled={!variant?.stock}>
              <ShoppingBag />
              Add to bag
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-13 w-13"
              aria-label="Save to wishlist"
              onClick={() => dispatch(actions.toggleWishlist(p))}
            >
              <Heart className={saved ? 'fill-current' : ''} />
            </Button>
          </div>
          {number && (
            <Button asChild variant="outline" className="mt-3 w-full">
              <a
                href={`https://wa.me/${number}?text=${encodeURIComponent(`Hello! I'm interested in ${p.name}, ${Object.values(variant?.attributes ?? {}).join(' / ')}: ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                Ask about this piece on WhatsApp
              </a>
            </Button>
          )}
          <div className="my-8 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Truck className="size-4" />
              Free delivery ₹2,499+
            </span>
            <span className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Cash on delivery
            </span>
          </div>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">The details</TabsTrigger>
              <TabsTrigger value="care">Care & delivery</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                {Object.entries(p.attributes).map(([key, value]) => (
                  <div key={key}>
                    <dt className="mb-1 capitalize text-muted-foreground">
                      {p.category?.definitions?.find((d) => d.key === key)?.label ?? key}
                    </dt>
                    <dd className="m-0">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </TabsContent>
            <TabsContent value="care">
              <p className="text-xs leading-7 text-muted-foreground">
                {String(p.attributes.care ?? 'Follow manufacturer care instructions.')}
                <br />
                Standard delivery: 5–7 business days. Express: 2–4 business days. Delivery estimates
                depend on your location.
              </p>
              <Link href="/policies/shipping" className="text-xs underline">
                Shipping & returns details
              </Link>
            </TabsContent>
          </Tabs>
          <Button
            variant="ghost"
            className="mt-6 px-0 text-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied');
              } catch {
                toast.error('Could not copy link');
              }
            }}
          >
            <Share2 />
            Share this find
          </Button>
          <p className="mt-6 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Check className="size-3" />
            Thoughtfully chosen. Made to be worn.
          </p>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background p-3 md:hidden">
        <Button className="w-full" disabled={!variant?.stock} onClick={add}>
          Add to bag · {formatMoney(variant?.price ?? p.price)}
        </Button>
      </div>
    </div>
  );
}
