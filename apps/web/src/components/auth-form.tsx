'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema, loginSchema, emailSchema, passwordSchema } from '@aurel/shared';
import { ArrowRight, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, authActions, actions, api, useMutateMutation } from '@/lib/store';
import { mergeCart } from './providers';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Turnstile } from './turnstile';
export function AuthForm({ mode }: { mode: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const dispatch = useAppDispatch();
  const [mutate, { isLoading }] = useMutateMutation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [botToken, setBotToken] = useState('');
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isReset = mode === 'reset-password';
  const isVerify = mode === 'verify-email';
  const schema = isRegister
    ? registerSchema
    : isLogin
      ? loginSchema
      : isReset
        ? z.object({ password: passwordSchema })
        : isVerify
          ? z.object({})
          : z.object({ email: emailSchema });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({ resolver: zodResolver(schema) });
  const submit = async (values: any) => {
    setError('');
    try {
      const body = isVerify
        ? { token: search.get('token') }
        : isReset
          ? { ...values, token: search.get('token') }
          : { ...values, turnstileToken: botToken || undefined };
      const result = await mutate({ path: `/auth/${mode}`, body }).unwrap();
      if (isLogin) {
        const { user, accessToken } = result.data;
        dispatch(api.util.resetApiState());
        dispatch(actions.setAddress(null));
        dispatch(
          authActions.setAuth({ user: { ...user, overrides: user.permissions }, accessToken }),
        );
        await mergeCart(accessToken);
        const next = search.get('next');
        router.push(
          next?.startsWith('/') && !next.startsWith('//')
            ? next
            : user.role === 'USER'
              ? '/account'
              : '/dashboard',
        );
      } else
        setMessage(
          result.data.message ??
            (isReset
              ? 'Your password has been changed. Sign in with your new password.'
              : 'Your email is verified. You can now sign in.'),
        );
    } catch (err: any) {
      setError(
        err.data?.error?.message ??
          'Unable to reach the store. Please start the API or try again later.',
      );
    }
  };
  const title = isLogin
    ? 'Good to see you again.'
    : isRegister
      ? 'A little more you.'
      : isReset
        ? 'A fresh start.'
        : isVerify
          ? 'One last little step.'
          : 'Let’s get you back in.';
  return (
    <div className="shell grid min-h-[650px] items-center gap-12 py-16 md:grid-cols-2">
      <div className="hidden border-r pr-12 md:block">
        <p className="eyebrow mb-6 text-muted-foreground">WELCOME TO AUREL</p>
        <h1 className="font-editorial text-6xl leading-tight">
          Considered essentials.
          <br />A space of your own.
        </h1>
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">
          Keep your favourites close, follow your orders, and find pieces that feel like you.
        </p>
      </div>
      <div className="mx-auto w-full max-w-md">
        <h2 className="font-editorial mb-3 text-4xl">{title}</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          {isLogin
            ? 'Sign in to your Aurel account.'
            : isRegister
              ? 'Create your account. Make yourself at home.'
              : isReset
                ? 'Choose a strong new password.'
                : isVerify
                  ? 'Confirm your email to complete your account.'
                  : 'We’ll email a secure password reset link.'}
        </p>
        {message ? (
          <div role="status" className="border bg-secondary/40 p-6">
            <CheckCircle2 className="mb-3 size-6" />
            <p className="text-sm leading-6">{message}</p>
            <Button asChild>
              <Link href="/auth/login">
                Sign in <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <form className="grid gap-5" onSubmit={handleSubmit(submit)}>
            {isRegister && (
              <FormField label="Your name" error={errors.name?.message as string}>
                <Input autoComplete="name" {...register('name')} />
              </FormField>
            )}
            {!isReset && !isVerify && (
              <FormField label="Email address" error={errors.email?.message as string}>
                <Input type="email" autoComplete="email" {...register('email')} />
              </FormField>
            )}
            {(isLogin || isRegister || isReset) && (
              <FormField label="Password" error={errors.password?.message as string}>
                <Input
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  {...register('password')}
                />
                {!isLogin && (
                  <p className="mb-0 mt-2 text-[11px] leading-5 text-muted-foreground">
                    At least 12 characters, with uppercase, lowercase, a number and a symbol.
                  </p>
                )}
              </FormField>
            )}
            {isLogin && (
              <Link className="text-right text-xs underline" href="/auth/forgot-password">
                Forgot your password?
              </Link>
            )}
            {!isVerify && !isReset && <Turnstile onToken={setBotToken} />}
            {isRegister && (
              <div className="hidden" aria-hidden="true">
                <Input tabIndex={-1} autoComplete="off" {...register('website')} />
              </div>
            )}
            {error && (
              <p role="alert" className="mb-0 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <LoaderCircle className="animate-spin" /> : null}
              {isLogin
                ? 'Sign in'
                : isRegister
                  ? 'Create account'
                  : isReset
                    ? 'Save new password'
                    : isVerify
                      ? 'Verify my email'
                      : 'Send reset link'}
              <ArrowRight />
            </Button>
          </form>
        )}
        <p className="mt-7 text-center text-xs text-muted-foreground">
          {isLogin ? (
            <>
              New here?{' '}
              <Link className="text-foreground underline" href="/auth/register">
                Make yourself at home
              </Link>
            </>
          ) : (
            <Link href="/auth/login" className="underline">
              Back to sign in
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
