'use client';
import Script from 'next/script';
import { useRef, useEffect, useState } from 'react';
declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !key || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: key,
      callback: onToken,
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken(''),
    });
    return () => window.turnstile?.remove(id);
  }, [ready, key]);
  if (!key)
    return process.env.NODE_ENV === 'production' ? (
      <p role="alert" className="text-sm text-red-600">
        Security verification is unavailable. Please contact the store.
      </p>
    ) : null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={ref} />
    </>
  );
}
