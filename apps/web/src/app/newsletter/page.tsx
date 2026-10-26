'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutateMutation } from '@/lib/store';
import { Button } from '@/components/ui/button';
function Confirm() {
  const params = useSearchParams();
  const [mutate, { isLoading }] = useMutateMutation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="shell max-w-xl py-24">
      <p className="eyebrow">LET’S KEEP IN TOUCH</p>
      <h1 className="section-heading">A little hello.</h1>
      {message ? (
        <p role="status" className="text-sm leading-7">
          {message}
        </p>
      ) : (
        <>
          <p className="mb-7 text-sm leading-7 text-muted-foreground">
            Confirm your email address to join our newsletter.
          </p>
          <Button
            disabled={isLoading || !params.get('token')}
            onClick={async () => {
              try {
                const result = await mutate({
                  path: '/community/newsletter/confirm',
                  body: { token: params.get('token') },
                }).unwrap();
                setMessage(result.data.message);
              } catch (err: any) {
                setError(err.data?.error?.message ?? 'Confirmation could not be completed.');
              }
            }}
          >
            Confirm subscription
          </Button>
          {error && (
            <p role="alert" className="mt-5 text-sm text-red-700">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
export default function Page() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
