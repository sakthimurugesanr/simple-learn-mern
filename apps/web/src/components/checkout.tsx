'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, formatMoney, calculateTotals, type AddressInput } from '@aurel/shared';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  Truck,
  MessageCircle,
  Wallet,
} from 'lucide-react';
import {
  actions,
  useAppSelector,
  useAppDispatch,
  useGetQuery,
  useMutateMutation,
} from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FormField } from './auth-form';
import { Turnstile } from './turnstile';
import { SimpleSelect } from './ui/select';
export function Checkout() {
  const router = useRouter();
  const commerce = useAppSelector((s) => s.commerce);
  const { user, ready } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [token, setToken] = useState('');
  const idempotency = useRef<string | null>(null);
  const { data: settings } = useGetQuery('/catalog/settings');
  const { data: addresses } = useGetQuery('/account/addresses', { skip: !user });
  const [mutate, { isLoading }] = useMutateMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: commerce.address ?? { name: user?.name ?? '', line2: '' },
  });
  if (ready && !user)
    return (
      <div className="shell py-20 text-center">
        <LockKeyhole className="mx-auto mb-6 size-10" />
        <h1 className="section-heading">A space for your order.</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to securely place and track your order.
        </p>
        <Button asChild>
          <Link href="/auth/login?next=/checkout">
            Sign in to continue <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  if (!commerce.items.length)
    return (
      <div className="shell py-20 text-center">
        <h1 className="section-heading">Your bag is a little quiet.</h1>
        <Button asChild>
          <Link href="/shop">Explore the collection</Link>
        </Button>
      </div>
    );
  const s = settings?.data;
  const subtotal = commerce.items.reduce(
    (a, i) =>
      a +
      (i.product.variants.find((v) => v.id === i.variantId)?.price ?? i.product.price) * i.quantity,
    0,
  );
  const shipping = s
    ? commerce.delivery === 'express'
      ? s.expressShipping
      : subtotal >= s.freeShippingThreshold
        ? 0
        : s.shipping
    : 0;
  const totals = calculateTotals(
    commerce.items.map((i) => ({
      price: i.product.variants.find((v) => v.id === i.variantId)?.price ?? i.product.price,
      quantity: i.quantity,
    })),
    shipping,
    s?.taxBps ?? 0,
  );
  const submit = async () => {
    setError('');
    if (!commerce.address || !s) return;
    idempotency.current ??= crypto.randomUUID();
    try {
      const result = await mutate({
        path: '/orders',
        body: {
          address: commerce.address,
          delivery: commerce.delivery,
          paymentMethod: commerce.paymentMethod,
          items: commerce.items.map(({ variantId, quantity }) => ({ variantId, quantity })),
          coupon: coupon || undefined,
          idempotencyKey: idempotency.current,
          turnstileToken: token || undefined,
        },
      }).unwrap();
      dispatch(actions.clearCart());
      router.push(`/account/orders/${result.data.id}?success=1`);
    } catch (err: any) {
      setError(err.data?.error?.message ?? 'Your order could not be placed. Please try again.');
    }
  };
  return (
    <div className="shell py-12">
      <p className="eyebrow mb-4 text-muted-foreground">A FEW GOOD DETAILS</p>
      <h1 className="section-heading mb-10">Make it yours.</h1>
      <ol aria-label="Checkout progress" className="mb-12 grid grid-cols-4 gap-3 border-b pb-7">
        {['Your details', 'Delivery', 'Payment', 'Review'].map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? 'step' : undefined}
            className={`flex items-center gap-3 text-xs ${step < i ? 'text-muted-foreground' : ''}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${step >= i ? 'border-primary bg-primary text-primary-foreground' : ''}`}
            >
              {step > i ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="hidden sm:block">{label}</span>
          </li>
        ))}
      </ol>
      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <div>
          {step === 0 ? (
            <form
              onSubmit={handleSubmit((address) => {
                dispatch(actions.setAddress(address));
                setStep(1);
              })}
            >
              <h2 className="font-editorial mb-7 text-3xl">Where should your good things go?</h2>
              {addresses?.data?.length > 0 && (
                <div className="mb-6">
                  <SimpleSelect
                    value=""
                    placeholder="Use a saved address"
                    onValueChange={(id) => reset(addresses.data.find((a: any) => a.id === id))}
                    options={addresses.data.map((a: any) => ({
                      value: a.id,
                      label: `${a.name} · ${a.line1}, ${a.city}`,
                    }))}
                  />
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  ['name', 'Full name'],
                  ['phone', 'Mobile number'],
                  ['line1', 'Address line 1'],
                  ['line2', 'Address line 2 (optional)'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['pincode', 'Pincode'],
                ].map(([name, label]) => (
                  <FormField
                    key={name}
                    label={label}
                    error={errors[name as keyof AddressInput]?.message}
                  >
                    <Input
                      autoComplete={
                        name === 'name'
                          ? 'name'
                          : name === 'phone'
                            ? 'tel'
                            : name === 'pincode'
                              ? 'postal-code'
                              : undefined
                      }
                      inputMode={name === 'pincode' || name === 'phone' ? 'numeric' : undefined}
                      {...register(name as keyof AddressInput)}
                    />
                  </FormField>
                ))}
              </div>
              <Button type="submit" className="mt-8">
                Continue to delivery <ArrowRight />
              </Button>
            </form>
          ) : step === 1 ? (
            <div>
              <h2 className="font-editorial mb-7 text-3xl">At your pace.</h2>
              <div className="grid gap-4">
                {[
                  {
                    id: 'standard',
                    name: 'Standard delivery',
                    sub: '5–7 business days',
                    cost:
                      subtotal >= (s?.freeShippingThreshold ?? Infinity) ? 0 : (s?.shipping ?? 0),
                  },
                  {
                    id: 'express',
                    name: 'Express delivery',
                    sub: '2–4 business days',
                    cost: s?.expressShipping ?? 0,
                  },
                ].map((d) => (
                  <Button
                    key={d.id}
                    variant="outline"
                    className={`h-auto justify-between p-6 ${commerce.delivery === d.id ? 'border-primary bg-secondary/30' : ''}`}
                    aria-pressed={commerce.delivery === d.id}
                    onClick={() => dispatch(actions.setDelivery(d.id as any))}
                  >
                    <span className="flex items-center gap-4">
                      <Truck />
                      <span className="text-left">
                        {d.name}
                        <span className="mt-2 block text-xs font-normal text-muted-foreground">
                          {d.sub}
                        </span>
                      </span>
                    </span>
                    <span>{d.cost ? formatMoney(d.cost) : 'On us'}</span>
                  </Button>
                ))}
              </div>
              <Button onClick={() => setStep(2)} className="mt-8">
                Continue to payment <ArrowRight />
              </Button>
            </div>
          ) : step === 2 ? (
            <div>
              <h2 className="font-editorial mb-7 text-3xl">Simple, your way.</h2>
              <div className="grid gap-4">
                {[
                  {
                    id: 'COD',
                    name: 'Cash on delivery',
                    sub: 'Pay when your order arrives.',
                    Icon: Wallet,
                  },
                  {
                    id: 'WHATSAPP',
                    name: 'Order via WhatsApp',
                    sub: 'Create your order, then send the details on WhatsApp.',
                    Icon: MessageCircle,
                  },
                ].map((d) => (
                  <Button
                    key={d.id}
                    variant="outline"
                    className={`h-auto justify-start whitespace-normal p-6 ${commerce.paymentMethod === d.id ? 'border-primary bg-secondary/30' : ''}`}
                    disabled={d.id === 'WHATSAPP' && !s?.whatsappNumber}
                    aria-pressed={commerce.paymentMethod === d.id}
                    onClick={() => dispatch(actions.setPayment(d.id as any))}
                  >
                    <d.Icon className="mr-3 shrink-0" />
                    <span className="text-left">
                      {d.name}
                      <span className="mt-2 block text-xs font-normal text-muted-foreground">
                        {d.sub}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              <Button onClick={() => setStep(3)} className="mt-8">
                Review your order <ArrowRight />
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="font-editorial mb-7 text-3xl">One last look.</h2>
              <div className="border p-6 text-sm leading-7">
                <strong>{commerce.address?.name}</strong>
                <br />
                {commerce.address?.line1}, {commerce.address?.line2}
                <br />
                {commerce.address?.city}, {commerce.address?.state} {commerce.address?.pincode}
                <br />
                {commerce.address?.phone}
                <hr className="my-4" />
                {commerce.delivery === 'express' ? 'Express' : 'Standard'} delivery ·{' '}
                {commerce.paymentMethod === 'COD' ? 'Cash on delivery' : 'Order via WhatsApp'}
              </div>
              <label className="mt-6 block text-xs">
                Have a little welcome code?
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Offer code (optional)"
                  className="mt-2"
                />
              </label>
              <p className="mt-3 text-xs text-muted-foreground">
                Offers are validated and applied by the server when you confirm.
              </p>
              <Turnstile onToken={setToken} />
              <p className="mt-6 text-xs leading-6 text-muted-foreground">
                By placing your order, you agree to our{' '}
                <Link className="underline" href="/policies/terms">
                  terms
                </Link>{' '}
                and{' '}
                <Link className="underline" href="/policies/privacy">
                  privacy policy
                </Link>
                .
              </p>
              {error && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              )}
              <Button disabled={isLoading || !s} onClick={submit} className="mt-4 w-full">
                {isLoading ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}
                {isLoading ? 'Placing your order…' : 'Place your order'}
              </Button>
              {!s && (
                <p role="alert" className="mt-3 text-xs text-red-700">
                  Checkout is unavailable while the store API is offline.
                </p>
              )}
            </div>
          )}
          {step > 0 && (
            <Button variant="ghost" className="mt-6 px-0" onClick={() => setStep(step - 1)}>
              <ArrowLeft />
              Back
            </Button>
          )}
        </div>
        <aside className="h-fit border bg-secondary/20 p-7">
          <h2 className="font-editorial text-2xl">Your good choices.</h2>
          {commerce.items.map((i) => (
            <div
              key={i.variantId}
              className="mb-4 flex justify-between gap-4 border-b pb-4 text-xs"
            >
              <span>
                {i.product.name} × {i.quantity}
                <span className="mt-2 block text-muted-foreground">
                  {Object.values(
                    i.product.variants.find((v) => v.id === i.variantId)?.attributes ?? {},
                  ).join(' / ')}
                </span>
              </span>
              <span>
                {formatMoney(
                  (i.product.variants.find((v) => v.id === i.variantId)?.price ?? i.product.price) *
                    i.quantity,
                )}
              </span>
            </div>
          ))}
          <dl className="space-y-4 text-xs">
            {[
              ['Subtotal', totals.subtotal],
              ['Delivery', totals.shipping],
              ['Tax', totals.tax],
            ].map(([label, value]) => (
              <div className="flex justify-between" key={label}>
                <dt>{label}</dt>
                <dd>{s ? formatMoney(Number(value)) : 'Calculated when online'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex justify-between border-t pt-5 text-base font-medium">
            <span>Estimated total</span>
            <span>{s ? formatMoney(totals.total) : '—'}</span>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-muted-foreground">
            Final total, including any offer, is shown on your order confirmation. Stock and prices
            are verified securely when you place the order.
          </p>
        </aside>
      </div>
    </div>
  );
}
