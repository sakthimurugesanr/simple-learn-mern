import { z } from 'zod';

export const roles = ['ADMIN', 'SUPERVISOR', 'USER'] as const;
export type Role = (typeof roles)[number];
export const resources = [
  'product',
  'category',
  'attribute',
  'banner',
  'offer',
  'collection',
  'order',
  'user',
  'supervisor',
  'analytics',
  'audit',
  'settings',
] as const;
export const actions = ['create', 'read', 'update', 'delete'] as const;
export const permissions = [
  ...resources.flatMap((r) => actions.map((a) => `${r}:${a}`)),
  'product:update:any',
  'product:delete:any',
] as const;
export type Permission = string;
export const roleDefaults: Record<Role, string[]> = {
  ADMIN: [...permissions],
  SUPERVISOR: ['product:read'],
  USER: [],
};
export type PermissionOverride = { permission: string; granted: boolean };
export function can(role: Role, overrides: PermissionOverride[], permission: string) {
  if (role === 'ADMIN') return true;
  return (
    overrides.find((o) => o.permission === permission)?.granted ??
    roleDefaults[role].includes(permission)
  );
}
export const attributeDefinitionSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(50),
  label: z.string().min(1).max(80),
  type: z.enum(['text', 'number', 'select', 'multi-select', 'boolean', 'color', 'date']),
  options: z.array(z.string().max(100)).default([]),
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
  showOnCard: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  unit: z.string().max(30).nullish(),
});
export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>;
export function buildAttributeSchema(definitions: AttributeDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = Object.create(null);
  for (const d of definitions) {
    if (['__proto__', 'constructor', 'prototype'].includes(d.key))
      throw new Error('Reserved attribute key');
    let field: z.ZodTypeAny;
    switch (d.type) {
      case 'number':
        field = z.number().finite();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'select':
        field = z.string().refine((v) => d.options.includes(v), 'Select an available option');
        break;
      case 'multi-select':
        field = z
          .array(z.string())
          .max(50)
          .refine((v) => v.every((x) => d.options.includes(x)), 'Invalid option');
        break;
      case 'color':
        field = z.string().regex(/^#[0-9a-fA-F]{6}$/);
        break;
      case 'date':
        field = z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine(
            (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
            'Invalid date',
          );
        break;
      default:
        field = z.string().min(1).max(2000);
    }
    shape[d.key] = d.required ? field : field.optional();
  }
  return z.object(shape).strict();
}
export const emailSchema = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase().trim());
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^a-zA-Z0-9]/);
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string().trim().min(2).max(100),
    website: z.string().max(0).optional(),
    turnstileToken: z.string().optional(),
  })
  .strict();
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().max(128),
    turnstileToken: z.string().optional(),
  })
  .strict();
export const addressSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10 digit Indian mobile number'),
    line1: z.string().trim().min(5).max(200),
    line2: z.string().max(200).default(''),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid pincode'),
  })
  .strict();
export type AddressInput = z.infer<typeof addressSchema>;
export const variantSchema = z
  .object({
    sku: z.string().min(1).max(100),
    attributes: z.record(z.string(), z.string().max(100)),
    price: z.number().int().min(0).max(100000000).nullable().optional(),
    stock: z.number().int().min(0).max(1000000),
  })
  .strict();
export const productSchema = z
  .object({
    name: z.string().min(3).max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(220),
    description: z.string().max(20000),
    categoryId: z.string().uuid(),
    price: z.number().int().min(1).max(100000000),
    compareAtPrice: z.number().int().positive().nullable().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
    attributes: z.record(z.string(), z.unknown()),
    variants: z.array(variantSchema).min(1).max(100),
    images: z
      .array(z.object({ url: z.string().url(), alt: z.string().max(200) }))
      .min(1)
      .max(12),
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
  })
  .strict();
export const checkoutSchema = z
  .object({
    address: addressSchema,
    delivery: z.enum(['standard', 'express']),
    paymentMethod: z.enum(['COD', 'WHATSAPP']),
    items: z
      .array(
        z
          .object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })
          .strict(),
      )
      .min(1)
      .max(50),
    coupon: z.string().max(40).optional(),
    idempotencyKey: z.string().uuid(),
    turnstileToken: z.string().optional(),
    website: z.string().max(0).optional(),
  })
  .strict();
export const orderStatuses = [
  'PLACED',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export function validStatusTransition(from: string, to: string) {
  const graph: Record<string, string[]> = {
    PLACED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: ['RETURNED'],
    CANCELLED: [],
    RETURNED: [],
  };
  return graph[from]?.includes(to) ?? false;
}
export function calculateTotals(
  items: { price: number; quantity: number }[],
  shipping: number,
  taxBps = 0,
  discount = 0,
) {
  if (
    ![shipping, taxBps, discount].every((value) => Number.isSafeInteger(value) && value >= 0) ||
    taxBps > 10000
  )
    throw new Error('Invalid shipping, tax or discount');
  if (
    !items.length ||
    items.some(
      (i) =>
        !Number.isSafeInteger(i.price) ||
        i.price < 0 ||
        !Number.isSafeInteger(i.quantity) ||
        i.quantity < 1,
    )
  )
    throw new Error('Invalid line items');
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const appliedDiscount = Math.min(Math.max(0, discount), subtotal);
  const tax = Math.round(((subtotal - appliedDiscount) * taxBps) / 10000);
  const total = subtotal - appliedDiscount + shipping + tax;
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Invalid total');
  return { subtotal, discount: appliedDiscount, shipping, tax, total };
}
export const formatMoney = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  status: string;
  attributes: Record<string, unknown>;
  categoryId: string;
  category?: { name: string; slug: string; definitions?: AttributeDefinition[] };
  images: { id?: string; url: string; alt: string }[];
  variants: {
    id: string;
    sku: string;
    stock: number;
    price: number | null;
    attributes: Record<string, string>;
  }[];
  createdAt: string;
}
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  overrides: PermissionOverride[];
}
export interface ApiResponse<T> {
  data: T;
  meta?: { total: number; page: number; limit: number };
}
