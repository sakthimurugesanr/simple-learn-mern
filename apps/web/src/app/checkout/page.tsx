'use client';
import dynamic from 'next/dynamic';
const Checkout = dynamic(() => import('@/components/checkout').then((m) => m.Checkout), {
  ssr: false,
  loading: () => <div className="shell py-20">Preparing your checkout…</div>,
});
export default function Page() {
  return <Checkout />;
}
