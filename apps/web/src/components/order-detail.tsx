'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MessageCircle, Printer, ArrowRight } from 'lucide-react';
import { formatMoney } from '@aurel/shared';
import { useGetQuery, useMutateMutation, useAppSelector } from '@/lib/store';
import { Button } from './ui/button';
import { toast } from 'sonner';
export function OrderDetail({ id }: { id: string }) {
  const { user, ready } = useAppSelector((s) => s.auth);
  const { data, isLoading, error } = useGetQuery(`/orders/${id}`, { skip: !user });
  const [mutate] = useMutateMutation();
  const params = useSearchParams();
  if (ready && !user)
    return (
      <div className="shell py-20">
        <h1 className="section-heading">Your order, safely kept.</h1>
        <Button asChild>
          <Link href={`/auth/login?next=/account/orders/${id}`}>Sign in to view this order</Link>
        </Button>
      </div>
    );
  if (isLoading || (!data && !error)) return <div className="shell py-20">Finding your order…</div>;
  if (error)
    return (
      <div className="shell py-20">
        <h1 className="section-heading">We couldn’t find that order.</h1>
        <Link href="/account">Back to your account</Link>
      </div>
    );
  const o = data.data;
  return (
    <div className="shell max-w-4xl py-16">
      {params.get('success') && (
        <div className="mb-10 bg-secondary p-8 text-center">
          <CheckCircle2 className="mx-auto mb-5 size-10" />
          <h1 className="section-heading">Something good is on its way.</h1>
          <p className="text-sm">Your order is placed. We’ll take it from here.</p>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">YOUR ORDER</p>
          <h2 className="font-editorial text-3xl">#{o.id.slice(0, 8)}</h2>
          <span className="text-xs text-muted-foreground">
            {new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </span>
        </div>
        <Button variant="outline" className="no-print" onClick={() => window.print()}>
          <Printer />
          Print order
        </Button>
      </div>
      <div className="mb-8 border p-7">
        <div className="flex justify-between text-xs">
          <span>STATUS</span>
          <strong>{o.status}</strong>
        </div>
        {o.history.map((h: any) => (
          <div key={h.id} className="mt-6 flex gap-4 text-xs">
            <CheckCircle2 className="size-4" />
            <div>
              <p className="mb-1">{h.status}</p>
              <p className="mb-0 text-muted-foreground">
                {new Date(h.createdAt).toLocaleString('en-IN')} {h.note && `· ${h.note}`}
              </p>
            </div>
          </div>
        ))}
      </div>
      {o.items.map((i: any) => (
        <div key={i.id} className="flex justify-between gap-4 border-b py-5 text-sm">
          <span>
            {i.name} × {i.quantity}
            <span className="mt-2 block text-xs text-muted-foreground">
              {Object.values(i.attributes).join(' / ')}
            </span>
          </span>
          <span>{formatMoney(i.price * i.quantity)}</span>
        </div>
      ))}
      <dl className="ml-auto mt-6 max-w-xs space-y-3 text-xs">
        {[
          ['Subtotal', o.subtotal],
          ['Discount', -o.discount],
          ['Delivery', o.shipping],
          ['Tax', o.tax],
          ['Total', o.total],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt>{label}</dt>
            <dd>{formatMoney(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-10 grid gap-8 border-t pt-8 sm:grid-cols-2">
        <div>
          <h3 className="eyebrow">DELIVER TO</h3>
          <p className="text-sm leading-7">
            {o.address.name}
            <br />
            {o.address.line1}, {o.address.line2}
            <br />
            {o.address.city}, {o.address.state} {o.address.pincode}
          </p>
        </div>
        <div>
          <h3 className="eyebrow">PAYMENT</h3>
          <p className="text-sm">
            {o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Order via WhatsApp'}
          </p>
          {o.paymentMethod === 'WHATSAPP' && (
            <Button
              onClick={async () => {
                try {
                  const result = await mutate({ path: `/orders/${id}/whatsapp` }).unwrap();
                  window.location.href = result.data.redirectUrl;
                } catch {
                  toast.error('WhatsApp ordering is unavailable');
                }
              }}
            >
              <MessageCircle />
              Open your order in WhatsApp
            </Button>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {o.paymentMethod === 'WHATSAPP'
              ? 'Please send the prepared message. Opening WhatsApp does not confirm that a message was sent.'
              : 'Please keep the payable amount ready on delivery.'}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/account">
          Your account <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
