'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, type Product } from '@aurel/shared';
import { Button } from './ui/button';
import { actions, useAppDispatch, useAppSelector, useMutateMutation } from '@/lib/store';
export function ProductCard({ product: p, index = 0 }: { product: Product; index?: number }) {
  const saved = useAppSelector((s) => s.commerce.wishlist.some((w) => w.id === p.id));
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [mutate] = useMutateMutation();
  return (
    <article className="group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Link
          href={`/product/${p.slug}`}
          className="absolute inset-0"
          aria-label={`View ${p.name}`}
        >
          <Image
            src={p.images[0]?.url}
            alt={p.images[0]?.alt ?? p.name}
            fill
            sizes="(max-width: 600px) 47vw, (max-width: 1024px) 31vw, 24vw"
            className="product-image object-cover"
            priority={index < 2}
          />
        </Link>
        <span className="absolute left-3 top-3 bg-background/95 px-2 py-1 text-[9px] tracking-wide">
          {p.compareAtPrice
            ? 'THE GOOD FINDS'
            : index % 3 === 0
              ? 'JUST ARRIVED'
              : 'CONSIDERED ESSENTIAL'}
        </span>
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 rounded-full bg-background/85"
          aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name}`}
          onClick={async () => {
            dispatch(actions.toggleWishlist(p));
            if (user) {
              try {
                await mutate({
                  path: `/account/wishlist/${p.id}`,
                  method: saved ? 'DELETE' : 'PUT',
                }).unwrap();
              } catch {
                dispatch(actions.toggleWishlist(p));
                toast.error('Could not update wishlist');
                return;
              }
            }
            toast(saved ? 'Removed from saved pieces' : 'Saved for later');
          }}
        >
          <Heart className={saved ? 'fill-current' : ''} />
        </Button>
        <Link
          href={`/product/${p.slug}`}
          className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-background/95 p-4 text-xs transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0"
        >
          A closer look <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="pt-4">
        <div className="mb-2 flex justify-between gap-2">
          <p className="eyebrow text-[8px] text-muted-foreground">
            {p.category?.definitions
              ?.filter((d) => d.showOnCard && p.attributes[d.key] != null)
              .map(
                (d) =>
                  `${Array.isArray(p.attributes[d.key]) ? (p.attributes[d.key] as string[]).join(' / ') : String(p.attributes[d.key])}${d.unit ? ` ${d.unit}` : ''}`,
              )
              .join(' · ') ||
              p.category?.name ||
              'Aurel studio'}
          </p>
          {typeof p.attributes.color === 'string' &&
            /^#[0-9a-fA-F]{6}$/.test(p.attributes.color) && (
              <span
                className="size-3 rounded-full border"
                aria-label={`Color ${p.attributes.color}`}
                style={{ backgroundColor: p.attributes.color }}
              />
            )}
        </div>
        <Link href={`/product/${p.slug}`} className="text-[13px] font-medium">
          {p.name}
        </Link>
        <p className="mt-1.5 flex items-center gap-2 text-[12px]">
          {formatMoney(p.price)}
          {p.compareAtPrice && (
            <>
              <s className="text-[11px] text-muted-foreground">{formatMoney(p.compareAtPrice)}</s>
              <span className="text-[10px] text-primary">
                {Math.round((1 - p.price / p.compareAtPrice) * 100)}% off
              </span>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
