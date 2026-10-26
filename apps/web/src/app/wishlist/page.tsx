'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useAppSelector } from '@/lib/store';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
export default function Wishlist() {
  const items = useAppSelector((s) => s.commerce.wishlist);
  return (
    <div className="shell py-16">
      <p className="eyebrow mb-5 text-muted-foreground">A FEW THINGS YOU LOVE</p>
      <h1 className="section-heading mb-10">Saved for a good day.</h1>
      {items.length ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="border py-20 text-center">
          <Heart className="mx-auto mb-6 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tap the heart on a piece to keep it here.</p>
          <Button asChild>
            <Link href="/shop">Find your favourites</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
