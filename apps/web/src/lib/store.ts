'use client';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AuthUser, Product, AddressInput } from '@aurel/shared';
export interface CartLine {
  variantId: string;
  quantity: number;
  product: Product;
}
const commerce = createSlice({
  name: 'commerce',
  initialState: {
    items: [] as CartLine[],
    wishlist: [] as Product[],
    address: null as AddressInput | null,
    delivery: 'standard' as 'standard' | 'express',
    paymentMethod: 'COD' as 'COD' | 'WHATSAPP',
    hydrated: false,
  },
  reducers: {
    hydrate: (s, a: PayloadAction<{ items: CartLine[]; wishlist: Product[] }>) => {
      s.items = a.payload.items;
      s.wishlist = a.payload.wishlist;
      s.hydrated = true;
    },
    addItem: (s, a: PayloadAction<CartLine>) => {
      const existing = s.items.find((i) => i.variantId === a.payload.variantId);
      if (existing) existing.quantity = Math.min(20, existing.quantity + a.payload.quantity);
      else s.items.push(a.payload);
    },
    quantity: (s, a: PayloadAction<{ variantId: string; quantity: number }>) => {
      s.items = s.items
        .map((i) =>
          i.variantId === a.payload.variantId
            ? { ...i, quantity: Math.min(20, a.payload.quantity) }
            : i,
        )
        .filter((i) => i.quantity > 0);
    },
    replaceCart: (s, a: PayloadAction<CartLine[]>) => {
      s.items = a.payload;
    },
    toggleWishlist: (s, a: PayloadAction<Product>) => {
      const index = s.wishlist.findIndex((p) => p.id === a.payload.id);
      if (index >= 0) s.wishlist.splice(index, 1);
      else s.wishlist.push(a.payload);
    },
    clearCart: (s) => {
      s.items = [];
    },
    resetPrivateState: (s) => {
      s.items = [];
      s.wishlist = [];
      s.address = null;
      s.delivery = 'standard';
      s.paymentMethod = 'COD';
    },
    setAddress: (s, a: PayloadAction<AddressInput | null>) => {
      s.address = a.payload;
    },
    setDelivery: (s, a: PayloadAction<'standard' | 'express'>) => {
      s.delivery = a.payload;
    },
    setPayment: (s, a: PayloadAction<'COD' | 'WHATSAPP'>) => {
      s.paymentMethod = a.payload;
    },
  },
});
const auth = createSlice({
  name: 'auth',
  initialState: { user: null as AuthUser | null, accessToken: null as string | null, ready: false },
  reducers: {
    setAuth: (s, a: PayloadAction<{ user: AuthUser | null; accessToken: string | null }>) => {
      s.user = a.payload.user;
      s.accessToken = a.payload.accessToken;
      s.ready = true;
    },
  },
});
const rawBase = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});
let refreshPromise: Promise<any> | null = null;
export const api = createApi({
  reducerPath: 'api',
  baseQuery: async (args, context, extra) => {
    let result = await rawBase(args, context, extra);
    if (
      result.error?.status === 401 &&
      !String(typeof args === 'string' ? args : args.url).includes('/auth/')
    ) {
      refreshPromise ??= Promise.resolve(
        rawBase({ url: '/auth/refresh', method: 'POST' }, context, extra),
      ).finally(() => {
        refreshPromise = null;
      });
      const refresh = await refreshPromise;
      if (refresh.data) {
        const d = refresh.data.data;
        context.dispatch(
          auth.actions.setAuth({
            accessToken: d.accessToken,
            user: { ...d.user, overrides: d.user.permissions },
          }),
        );
        result = await rawBase(args, context, extra);
      } else context.dispatch(auth.actions.setAuth({ user: null, accessToken: null }));
    }
    return result;
  },
  tagTypes: [
    'Products',
    'Orders',
    'Users',
    'Catalog',
    'Cart',
    'Wishlist',
    'Settings',
    'Layout',
    'Audit',
  ],
  endpoints: (builder) => ({
    get: builder.query<any, string>({
      query: (path) => path,
      providesTags: ['Products', 'Orders', 'Users', 'Catalog', 'Settings', 'Layout', 'Audit'],
    }),
    mutate: builder.mutation<any, { path: string; method?: string; body?: unknown }>({
      query: ({ path, method = 'POST', body }) => ({ url: path, method, body }),
      invalidatesTags: ['Products', 'Orders', 'Users', 'Catalog', 'Settings', 'Layout', 'Audit'],
    }),
  }),
});
export const store = configureStore({
  reducer: { commerce: commerce.reducer, auth: auth.reducer, [api.reducerPath]: api.reducer },
  middleware: (get) => get().concat(api.middleware),
});
export const actions = commerce.actions;
export const authActions = auth.actions;
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const { useGetQuery, useMutateMutation } = api;
