'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, Search, ArrowRight } from 'lucide-react';
import type { Product } from '@aurel/shared';
import type { Category } from '@/lib/server-api';
import { useGetQuery } from '@/lib/store';
import { ProductCard } from './product-card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { SimpleSelect } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
export function CatalogBrowser({
  initialProducts,
  categories,
  preview,
}: {
  initialProducts: Product[];
  categories: Category[];
  preview: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const category = params.get('category') ?? 'all';
  const sort = params.get('sort') ?? 'newest';
  const query = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(query);
  let attrs: Record<string, string | number | boolean> = {};
  try {
    attrs = JSON.parse(params.get('attributes') ?? '{}');
  } catch {
    attrs = {};
  }
  const selected = categories.find((c) => c.slug === category);
  const update = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    next.delete('page');
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === 'all') next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/shop?${next}`, { scroll: false });
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== query) update({ q: search });
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const apiQuery = new URLSearchParams(params.toString());
  apiQuery.set('limit', '12');
  const { data, isFetching, error } = useGetQuery(`/catalog/products?${apiQuery}`, {
    skip: preview,
  });
  const fallback = useMemo(() => {
    const values = initialProducts.filter(
      (p) =>
        (category === 'all' || p.category?.slug === category) &&
        (!query || p.name.toLowerCase().includes(query.toLowerCase())) &&
        Object.entries(attrs).every(([k, v]) => p.attributes[k] === v),
    );
    return values.sort((a, b) =>
      sort === 'price-asc'
        ? a.price - b.price
        : sort === 'price-desc'
          ? b.price - a.price
          : sort === 'name'
            ? a.name.localeCompare(b.name)
            : b.createdAt.localeCompare(a.createdAt),
    );
  }, [initialProducts, category, query, sort, params.toString()]);
  const products: Product[] = preview
    ? fallback.slice((page - 1) * 12, page * 12)
    : (data?.data ?? []);
  const total = preview ? fallback.length : (data?.meta?.total ?? 0);
  const filters = (
    <div className="space-y-8">
      <div>
        <p className="mb-4 text-sm font-medium">The collection</p>
        <div className="grid gap-2">
          {[{ slug: 'all', name: 'All pieces' }, ...categories].map((c) => (
            <Button
              key={c.slug}
              variant={category === c.slug ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => update({ category: c.slug, attributes: undefined })}
            >
              {c.name}
              <ArrowRight className="ml-auto size-3" />
            </Button>
          ))}
        </div>
      </div>
      {selected?.definitions
        .filter((d) => d.filterable)
        .map((d) => (
          <div key={d.key}>
            <p className="mb-4 text-sm font-medium">{d.label}</p>
            {d.type === 'select' ? (
              <div className="grid gap-3">
                {d.options.map((option) => (
                  <label key={option} className="flex min-h-8 items-center gap-3 text-xs">
                    <Checkbox
                      checked={attrs[d.key] === option}
                      onCheckedChange={(checked) =>
                        update({
                          attributes: JSON.stringify({
                            ...attrs,
                            [d.key]: checked ? option : undefined,
                          }),
                        })
                      }
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : d.type === 'boolean' ? (
              <label className="flex items-center gap-3 text-xs">
                <Checkbox
                  checked={attrs[d.key] === true}
                  onCheckedChange={(checked) =>
                    update({
                      attributes: JSON.stringify({ ...attrs, [d.key]: checked ? true : undefined }),
                    })
                  }
                />
                Yes
              </label>
            ) : (
              <Input
                aria-label={`Filter ${d.label}`}
                placeholder={d.type === 'color' ? '#304c3c' : d.label}
                defaultValue={String(attrs[d.key] ?? '')}
                onBlur={(e) =>
                  update({
                    attributes: JSON.stringify({
                      ...attrs,
                      [d.key]: e.target.value
                        ? d.type === 'number'
                          ? Number(e.target.value)
                          : e.target.value
                        : undefined,
                    }),
                  })
                }
              />
            )}
          </div>
        ))}
      <Button variant="outline" onClick={() => router.replace('/shop')}>
        Reset filters <X />
      </Button>
    </div>
  );
  return (
    <div className="shell py-12">
      <div className="mb-10 border-b pb-10">
        <p className="eyebrow mb-4 text-muted-foreground">THE CONSIDERED COLLECTION</p>
        <h1 className="section-heading mb-4">
          {selected?.name ?? (query ? `Results for “${query}”` : 'Good things, for every day.')}
        </h1>
        <p className="mb-0 max-w-xl text-sm leading-7 text-muted-foreground">
          Pieces to live in. Favourites to keep. Find something that feels a little more like you.
        </p>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{total} considered pieces</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Find your favourites</DialogTitle>
              <DialogDescription>Filter the collection.</DialogDescription>
              {filters}
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search collection"
              placeholder="Find your piece…"
              className="w-52 pl-9"
            />
          </div>
          <div className="w-44">
            <SimpleSelect
              label="Sort products"
              value={sort}
              onValueChange={(v) => update({ sort: v })}
              options={[
                { value: 'newest', label: 'Just arrived' },
                { value: 'price-asc', label: 'Price: low to high' },
                { value: 'price-desc', label: 'Price: high to low' },
                { value: 'name', label: 'Name: A to Z' },
              ]}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-[190px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <div aria-busy={isFetching}>
          {error && !preview ? (
            <div role="alert" className="border p-10">
              The collection could not be loaded. Please try again.
            </div>
          ) : products.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <Search className="mx-auto mb-5 size-10 text-muted-foreground" />
              <h2 className="font-editorial text-3xl">Nothing here just yet.</h2>
              <p className="text-sm text-muted-foreground">
                Try another filter or explore the whole collection.
              </p>
              <Button variant="outline" onClick={() => router.replace('/shop')}>
                See all pieces
              </Button>
            </div>
          )}
          <div className="mt-12 flex items-center justify-center gap-5">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                const q = new URLSearchParams(params);
                q.set('page', String(page - 1));
                router.push(`/shop?${q}`);
              }}
            >
              Previous
            </Button>
            <span className="text-xs">
              {page} / {Math.max(1, Math.ceil(total / 12))}
            </span>
            <Button
              variant="outline"
              disabled={page * 12 >= total}
              onClick={() => {
                const q = new URLSearchParams(params);
                q.set('page', String(page + 1));
                router.push(`/shop?${q}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
