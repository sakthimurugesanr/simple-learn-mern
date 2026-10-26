import { describe, it, expect } from 'vitest';
import {
  buildAttributeSchema,
  attributeDefinitionSchema,
  can,
  calculateTotals,
  validStatusTransition,
  checkoutSchema,
  passwordSchema,
  formatMoney,
} from './index';
describe('authorization', () => {
  it('keeps supervisors minimal', () => {
    expect(can('SUPERVISOR', [], 'product:create')).toBe(false);
    expect(can('SUPERVISOR', [], 'product:read')).toBe(true);
  });
  it('applies explicit denials over defaults', () => {
    expect(
      can('SUPERVISOR', [{ permission: 'product:read', granted: false }], 'product:read'),
    ).toBe(false);
  });
  it('requires an explicit cross-owner grant', () => {
    expect(
      can('SUPERVISOR', [{ permission: 'product:update', granted: true }], 'product:update:any'),
    ).toBe(false);
  });
  it('allows administrators', () => expect(can('ADMIN', [], 'analytics:read')).toBe(true));
});
describe('dynamic attributes', () => {
  const definition = (values: Record<string, unknown>) =>
    attributeDefinitionSchema.parse({
      key: 'fabric',
      label: 'Fabric',
      type: 'select',
      options: ['Linen', 'Cotton'],
      required: true,
      ...values,
    });
  it('enforces required options', () => {
    const s = buildAttributeSchema([definition({})]);
    expect(s.safeParse({ fabric: 'Linen' }).success).toBe(true);
    expect(s.safeParse({ fabric: 'Plastic' }).success).toBe(false);
    expect(s.safeParse({}).success).toBe(false);
  });
  it('rejects undeclared attributes and prototype keys', () => {
    const s = buildAttributeSchema([definition({})]);
    expect(s.safeParse({ fabric: 'Linen', admin: true }).success).toBe(false);
    expect(() => buildAttributeSchema([definition({ key: '__proto__' })])).toThrow();
  });
  it('supports another domain without code changes', () => {
    const s = buildAttributeSchema([
      definition({ key: 'warranty', label: 'Warranty', type: 'number', unit: 'months' }),
    ]);
    expect(s.parse({ warranty: 12 })).toEqual({ warranty: 12 });
    expect(s.safeParse({ warranty: '12' }).success).toBe(false);
  });
  it('validates multiple selections', () => {
    const s = buildAttributeSchema([definition({ type: 'multi-select' })]);
    expect(s.safeParse({ fabric: ['Linen', 'Cotton'] }).success).toBe(true);
    expect(s.safeParse({ fabric: ['Other'] }).success).toBe(false);
  });
});
describe('integer money and state transitions', () => {
  it('calculates paise with discount before tax', () => {
    expect(calculateTotals([{ price: 199900, quantity: 2 }], 9900, 1800, 39980)).toEqual({
      subtotal: 399800,
      discount: 39980,
      shipping: 9900,
      tax: 64768,
      total: 434488,
    });
  });
  it('clamps discounts and rejects invalid quantities', () => {
    expect(calculateTotals([{ price: 100, quantity: 1 }], 0, 0, 999).total).toBe(0);
    expect(() => calculateTotals([{ price: 1.5, quantity: 1 }], 0)).toThrow();
    expect(() => calculateTotals([{ price: 100, quantity: 0 }], 0)).toThrow();
  });
  it('prevents terminal status re-entry and double restock', () => {
    expect(validStatusTransition('PLACED', 'CANCELLED')).toBe(true);
    expect(validStatusTransition('CANCELLED', 'PLACED')).toBe(false);
    expect(validStatusTransition('RETURNED', 'RETURNED')).toBe(false);
    expect(validStatusTransition('DELIVERED', 'RETURNED')).toBe(true);
  });
  it('rejects weak passwords and client-supplied totals', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('GoodPassword42!').success).toBe(true);
    expect(checkoutSchema.safeParse({ total: 1 }).success).toBe(false);
  });
});
describe('definition edge cases', () => {
  it('preserves fractional rupees in displayed totals', () => {
    expect(formatMoney(1050)).toContain('10.50');
    expect(() => calculateTotals([{ price: 1000, quantity: 1 }], -1)).toThrow();
  });
  it('accepts nullable units read back from PostgreSQL', () => {
    expect(
      attributeDefinitionSchema.parse({ key: 'name', label: 'Name', type: 'text', unit: null })
        .unit,
    ).toBeNull();
  });
  it('rejects normalized but nonexistent calendar dates', () => {
    const schema = buildAttributeSchema([
      attributeDefinitionSchema.parse({
        key: 'release',
        label: 'Release date',
        type: 'date',
        required: true,
      }),
    ]);
    expect(schema.safeParse({ release: '2026-02-31' }).success).toBe(false);
    expect(schema.safeParse({ release: '2026-02-28' }).success).toBe(true);
  });
});
