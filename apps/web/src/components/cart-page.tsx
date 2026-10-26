'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatMoney } from '@aurel/shared';
import { actions, useAppDispatch, useAppSelector } from '@/lib/store';
import { Button } from './ui/button';
export function CartPage() {
  const items = useAppSelector((s) => s.commerce.items);
  const dispatch = useAppDispatch();
  const total = items.reduce(
    (a, i) =>
      a +
      (i.product.variants.find((v) => v.id === i.variantId)?.price ?? i.product.price) * i.quantity,
    0,
  );
  return (
    <div className="shell py-16">
      <p className="eyebrow mb-5 text-muted-foreground">GOOD CHOICES, ALL YOURS</p>
      <h1 className="section-heading mb-10">Your bag.</h1>
      {!items.length ? (
        <div className="border py-20 text-center">
          <ShoppingBag className="mx-auto mb-6 size-10 text-muted-foreground" />
          <h2 className="font-editorial text-3xl">A little room for something lovely.</h2>
          <Button asChild>
            <Link href="/shop">
              Explore the collection <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
          <div>
            {items.map((i) => (
              <div key={i.variantId} className="mb-6 flex gap-6 border-b pb-6">
                <Link
                  href={`/product/${i.product.slug}`}
                  className="relative block h-36 w-28 shrink-0 bg-muted"
                >
                  <Image
                    src={i.product.images[0].url}
                    alt={i.product.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </Link>
                <div className="flex-1">
                  <Link href={`/product/${i.product.slug}`} className="text-sm">
                    {i.product.name}
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {Object.values(
                      i.product.variants.find((v) => v.id === i.variantId)?.attributes ?? {},
                    ).join(' / ')}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center border">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          dispatch(
                            actions.quantity({ variantId: i.variantId, quantity: i.quantity - 1 }),
                          )
                        }
                      >
                        <Minus />
                      </Button>
                      <span className="px-3 text-xs">{i.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Increase quantity"
                        onClick={() =>
                          dispatch(
                            actions.quantity({ variantId: i.variantId, quantity: i.quantity + 1 }),
                          )
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                    <span className="text-sm">
                      {formatMoney(
                        (i.product.variants.find((v) => v.id === i.variantId)?.price ??
                          i.product.price) * i.quantity,
                      )}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${i.product.name}`}
                      onClick={() =>
                        dispatch(actions.quantity({ variantId: i.variantId, quantity: 0 }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit border bg-secondary/20 p-7">
            <h2 className="font-editorial mb-6 text-2xl">The good details.</h2>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatMoney(total)}</span>
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Shipping, discounts and applicable taxes are calculated at checkout. Prices and stock
              are confirmed when you place the order.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link href="/checkout">
                Continue to checkout <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/shop">Keep exploring</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
