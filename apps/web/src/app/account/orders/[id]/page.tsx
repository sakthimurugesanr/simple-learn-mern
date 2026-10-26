import { Suspense } from 'react';
import { OrderDetail } from '@/components/order-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="shell py-20">Loading your order…</div>}>
      <OrderDetail id={id} />
    </Suspense>
  );
}
