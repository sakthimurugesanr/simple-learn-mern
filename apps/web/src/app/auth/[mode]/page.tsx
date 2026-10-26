import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!['login', 'register', 'forgot-password', 'reset-password', 'verify-email'].includes(mode))
    notFound();
  return (
    <Suspense fallback={<div className="shell py-20">Loading…</div>}>
      <AuthForm mode={mode} />
    </Suspense>
  );
}
