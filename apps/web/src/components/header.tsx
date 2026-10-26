'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  ArrowUpRight,
  Sun,
  Moon,
  Menu,
  ArrowRight,
  Minus,
  Plus,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from './ui/dialog';
import { actions, useAppDispatch, useAppSelector, useGetQuery } from '@/lib/store';
import { formatMoney, type Product } from '@aurel/shared';
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
export function Header() {
  const items = useAppSelector((s) => s.commerce.items);
  const wish = useAppSelector((s) => s.commerce.wishlist.length);
  const user = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const dispatch = useAppDispatch();
  const { data: categories } = useGetQuery('/catalog/categories');
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const { data: results } = useGetQuery(
    `/catalog/products?q=${encodeURIComponent(query)}&limit=5`,
    { skip: query.length < 2 },
  );
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <>
      <div className="bg-primary text-primary-foreground">
        <div className="shell flex h-8 items-center justify-center gap-3 text-[10px] tracking-[.08em]">
          <span>GOOD THINGS COME WITH FREE SHIPPING</span>
          <span className="opacity-70">On orders ₹2,499+</span>
          <ArrowUpRight className="size-3" />
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md">
        <div className="shell flex h-[88px] items-center justify-between gap-2 md:gap-6">
          <Link
            href="/"
            aria-label="Aurel home"
            className="text-[26px] font-medium tracking-[.18em] sm:text-[32px] sm:tracking-[.23em]"
          >
            AUREL<span className="relative -top-3 text-[9px] tracking-normal">®</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-[12px] font-medium lg:flex"
          >
            <Link className="hover:underline underline-offset-8" href="/shop?sort=newest">
              New arrivals <span className="ml-1 inline-block size-1 rounded-full bg-primary" />
            </Link>
            <Link href="/shop">Shop all</Link>
            {(categories?.data ?? [{ slug: 'dresses', name: 'Dresses' }]).map((c: any) => (
              <Link key={c.slug} href={`/shop?category=${c.slug}`}>
                {c.name}
              </Link>
            ))}
            <Link href="/about">Our story</Link>
          </nav>
          <div className="flex items-center gap-0 md:gap-1">
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Search">
                  <Search />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle className="font-editorial text-3xl">
                  Find your next favourite.
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Search our considered collection.
                </DialogDescription>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.href = `/shop?q=${encodeURIComponent(search)}`;
                  }}
                >
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search dresses, fabric, essentials…"
                    aria-label="Search products"
                  />
                </form>
                <div className="grid gap-2">
                  {results?.data?.map((p: Product) => (
                    <Link
                      onClick={() => setSearchOpen(false)}
                      key={p.id}
                      href={`/product/${p.slug}`}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      {p.name}
                      <span>{formatMoney(p.price)}</span>
                    </Link>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label={`Wishlist, ${wish} items`}
            >
              <Link href="/wishlist">
                <Heart />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label="My account"
            >
              <Link href={user ? '/account' : '/auth/login'}>
                <UserRound />
              </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label={`Shopping bag, ${items.length} items`}
                >
                  <ShoppingBag />
                  <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                    {items.reduce((a, i) => a + i.quantity, 0)}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh max-w-md translate-x-0 translate-y-0 border-y-0">
                <DialogTitle className="font-editorial text-3xl">
                  Your bag <span className="text-base">({items.length})</span>
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  A few good things for your everyday.
                </DialogDescription>
                <div className="flex flex-col gap-5">
                  {items.length === 0 ? (
                    <div className="py-16 text-center">
                      <ShoppingBag className="mx-auto mb-5 size-10 text-muted-foreground" />
                      <p>Your bag is waiting for something lovely.</p>
                      <DialogClose asChild>
                        <Button asChild>
                          <Link href="/shop">
                            Explore the collection <ArrowRight />
                          </Link>
                        </Button>
                      </DialogClose>
                    </div>
                  ) : (
                    <>
                      {items.map((i) => (
                        <div className="flex gap-4 border-b pb-5" key={i.variantId}>
                          <div
                            className="h-24 w-20 shrink-0 bg-muted"
                            style={{
                              backgroundImage: `url(${i.product.images[0]?.url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <div className="flex-1">
                            <p className="mb-1 text-sm">{i.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Object.values(
                                i.product.variants.find((v) => v.id === i.variantId)?.attributes ??
                                  {},
                              ).join(' / ')}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Decrease quantity"
                                  onClick={() =>
                                    dispatch(
                                      actions.quantity({
                                        variantId: i.variantId,
                                        quantity: i.quantity - 1,
                                      }),
                                    )
                                  }
                                >
                                  <Minus />
                                </Button>
                                <span className="text-xs">{i.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Increase quantity"
                                  onClick={() =>
                                    dispatch(
                                      actions.quantity({
                                        variantId: i.variantId,
                                        quantity: i.quantity + 1,
                                      }),
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
                            </div>
                          </div>
                        </div>
                      ))}
                      <DialogClose asChild>
                        <Button asChild className="w-full">
                          <Link href="/checkout">
                            Continue to checkout <ArrowRight />
                          </Link>
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button asChild variant="outline">
                          <Link href="/cart">View bag</Link>
                        </Button>
                      </DialogClose>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <div className="hidden xl:block">
              <ThemeToggle />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>AUREL</DialogTitle>
                <DialogDescription>Considered essentials</DialogDescription>
                <nav className="grid gap-6 py-5">
                  {[
                    ['Shop all', '/shop'],
                    ['New arrivals', '/shop?sort=newest'],
                    ['Dresses', '/shop?category=dresses'],
                    ['Electronics', '/shop?category=electronics'],
                    ['Our story', '/about'],
                    ['Account', '/account'],
                  ].map(([label, href]) => (
                    <DialogClose asChild key={href}>
                      <Link href={href}>{label}</Link>
                    </DialogClose>
                  ))}
                  <ThemeToggle />
                </nav>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-background md:hidden"
      >
        {[
          ['Shop', '/shop', Search],
          ['Saved', '/wishlist', Heart],
          ['Bag', '/cart', ShoppingBag],
          ['Account', '/account', UserRound],
        ].map(([label, href, Icon]: any) => (
          <Link
            className="flex min-h-11 min-w-14 flex-col items-center justify-center gap-1 text-[10px]"
            key={href}
            href={href}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
