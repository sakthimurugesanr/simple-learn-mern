'use client';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { store, actions, authActions } from '@/lib/store';
import type { CartLine } from '@/lib/store';
import type { Product } from '@aurel/shared';
let restoreRequest: Promise<any> | null = null;
let merging = false;
function Bootstrap() {
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('aurel-commerce') ?? '{"items":[],"wishlist":[]}',
      );
      store.dispatch(
        actions.hydrate({
          items: Array.isArray(saved.items) ? saved.items : [],
          wishlist: Array.isArray(saved.wishlist) ? saved.wishlist : [],
        }),
      );
    } catch {
      store.dispatch(actions.hydrate({ items: [], wishlist: [] }));
    }
    let active = true;
    // One refresh request across React strict-mode effect remounts prevents accidental token reuse.
    restoreRequest ??= fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    restoreRequest.then(async (result) => {
      if (!active) return;
      if (result?.data) {
        const { user, accessToken } = result.data;
        store.dispatch(
          authActions.setAuth({ accessToken, user: { ...user, overrides: user.permissions } }),
        );
        await mergeCart(accessToken);
      } else store.dispatch(authActions.setAuth({ user: null, accessToken: null }));
    });
    let previousItems = store.getState().commerce.items;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { items, wishlist } = state.commerce;
      try {
        localStorage.setItem('aurel-commerce', JSON.stringify({ items, wishlist }));
      } catch {
        /* Storage can be full or unavailable in privacy mode. */
      }
      if (items !== previousItems && !merging && state.auth.user) {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const current = store.getState();
          if (!current.auth.accessToken) return;
          const result = await fetch('/api/v1/account/cart', {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${current.auth.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              current.commerce.items.map(({ variantId, quantity }) => ({ variantId, quantity })),
            ),
          }).catch(() => null);
          if (result?.ok) localStorage.setItem('aurel-cart-owner', current.auth.user!.id);
        }, 500);
      }
      previousItems = items;
    });
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
  return null;
}
export async function mergeCart(token: string) {
  merging = true;
  try {
    const user = store.getState().auth.user;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const response = await fetch('/api/v1/account/cart', { headers });
    if (!response.ok) return;
    const { data } = await response.json();
    const merged = new Map<string, CartLine>();
    for (const item of data) {
      merged.set(item.variantId, {
        variantId: item.variantId,
        quantity: item.quantity,
        product: item.variant.product as Product,
      });
    }
    const previousOwner = localStorage.getItem('aurel-cart-owner');
    if (!previousOwner)
      for (const local of store.getState().commerce.items) {
        const remote = merged.get(local.variantId);
        merged.set(local.variantId, {
          ...local,
          quantity: Math.min(20, (remote?.quantity ?? 0) + local.quantity),
        });
      }
    const items = [...merged.values()];
    const saved = await fetch('/api/v1/account/cart', {
      method: 'PUT',
      headers,
      body: JSON.stringify(items.map(({ variantId, quantity }) => ({ variantId, quantity }))),
    });
    if (saved.ok) {
      store.dispatch(actions.replaceCart(items));
      if (user) localStorage.setItem('aurel-cart-owner', user.id);
    }
    const wishlistResponse = await fetch('/api/v1/account/wishlist', { headers });
    if (wishlistResponse.ok) {
      const remote = await wishlistResponse.json();
      const local =
        previousOwner && previousOwner !== user?.id ? [] : store.getState().commerce.wishlist;
      const combined = new Map(local.map((p) => [p.id, p]));
      for (const item of remote.data) combined.set(item.product.id, item.product);
      if (!previousOwner)
        await Promise.all(
          local.map((p) => fetch(`/api/v1/account/wishlist/${p.id}`, { method: 'PUT', headers })),
        );
      store.dispatch(
        actions.hydrate({
          items: store.getState().commerce.items,
          wishlist: [...combined.values()],
        }),
      );
    }
  } catch {
    toast.error(
      'Your account is signed in, but saved items could not be synced. Please try again later.',
    );
  } finally {
    merging = false;
  }
}
export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem nonce={nonce}>
        <Bootstrap />
        {children}
        <Toaster richColors position="bottom-right" />
      </ThemeProvider>
    </Provider>
  );
}
