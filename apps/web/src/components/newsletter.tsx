'use client';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useMutateMutation } from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Turnstile } from './turnstile';
export function Newsletter() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mutate, { isLoading }] = useMutateMutation();
  return (
    <section className="bg-secondary/50 py-16">
      <div className="shell grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-4">LET’S KEEP IN TOUCH</p>
          <h2 className="section-heading mb-3">A little good in your inbox.</h2>
          <p className="mb-0 text-xs leading-6 text-muted-foreground">
            New pieces, thoughtful stories, and the occasional little something.
          </p>
        </div>
        {message ? (
          <p role="status" className="flex items-center gap-3 text-sm">
            <Check className="size-5" />
            {message}
          </p>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try {
                const result = await mutate({
                  path: '/community/newsletter',
                  body: { email, consent, turnstileToken: token || undefined },
                }).unwrap();
                setMessage(result.data.message);
              } catch (err: any) {
                setError(
                  err.data?.error?.message ??
                    'Newsletter signup is unavailable. Please try again later.',
                );
              }
            }}
          >
            <div className="flex gap-2">
              <Input
                type="email"
                aria-label="Newsletter email address"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
              />
              <Button
                type="submit"
                aria-label="Subscribe to newsletter"
                disabled={!consent || isLoading}
              >
                <ArrowRight />
              </Button>
            </div>
            <label className="flex items-start gap-3 text-[10px] leading-5 text-muted-foreground">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(!!v)}
                aria-label="Consent to newsletter"
              />
              <span>
                I’d like to receive the Aurel newsletter. I can unsubscribe at any time.{' '}
                <Link className="underline" href="/policies/privacy">
                  Privacy policy
                </Link>
                .
              </span>
            </label>
            <Turnstile onToken={setToken} />
            {error && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
