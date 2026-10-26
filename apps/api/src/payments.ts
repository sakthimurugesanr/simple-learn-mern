import { formatMoney, type AddressInput } from '@aurel/shared';
import { AppError } from './lib.js';
export interface PaymentOrder {
  id: string;
  total: number;
  address: unknown;
  items: { name: string; attributes: unknown; quantity: number; price: number }[];
}
export interface PaymentProvider {
  createPayment(
    order: PaymentOrder,
    number?: string,
  ): Promise<{ redirectUrl?: string; instructions: string }>;
  verifyPayment(reference: string): Promise<boolean>;
  refund(reference: string, amount: number): Promise<void>;
}
export class CodProvider implements PaymentProvider {
  async createPayment() {
    return { instructions: 'Pay the courier on delivery.' };
  }
  async verifyPayment() {
    return false;
  }
  async refund() {
    throw new AppError(
      409,
      'MANUAL_REFUND',
      'COD refunds require a recorded manual bank transfer.',
    );
  }
}
export class WhatsAppProvider implements PaymentProvider {
  async createPayment(order: PaymentOrder, number = '') {
    if (!/^\d{10,15}$/.test(number))
      throw new AppError(
        503,
        'WHATSAPP_UNCONFIGURED',
        'WhatsApp ordering is not configured. Please choose COD.',
      );
    const a = order.address as AddressInput;
    const text = [
      `Hello! My AUREL order: ${order.id}`,
      ...order.items.map(
        (i) =>
          `${i.name} (${Object.entries(i.attributes as object)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}) × ${i.quantity} — ${formatMoney(i.price * i.quantity)}`,
      ),
      `Total: ${formatMoney(order.total)}`,
      `${a.name} · ${a.phone}`,
      `${a.line1}, ${a.line2}, ${a.city}, ${a.state} ${a.pincode}`,
    ].join('\n');
    return {
      redirectUrl: `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
      instructions: 'Open WhatsApp and send the prepared order message.',
    };
  }
  async verifyPayment() {
    return false;
  }
  async refund() {
    throw new AppError(409, 'MANUAL_REFUND', 'Arrange a manual refund with the customer.');
  }
}
export class FutureGatewayProvider implements PaymentProvider {
  async createPayment(): Promise<never> {
    throw new AppError(501, 'NOT_CONFIGURED', 'Online payments are not enabled');
  }
  async verifyPayment(): Promise<never> {
    throw new AppError(501, 'NOT_CONFIGURED', 'Online payments are not enabled');
  }
  async refund(): Promise<never> {
    throw new AppError(501, 'NOT_CONFIGURED', 'Online payments are not enabled');
  }
}
export const paymentProviders = { COD: new CodProvider(), WHATSAPP: new WhatsAppProvider() };
