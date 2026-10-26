'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, formatMoney, type AddressInput } from '@aurel/shared';
import { toast } from 'sonner';
import { ArrowUpRight, PackageCheck, LogOut, Plus, Trash2, ShieldCheck } from 'lucide-react';
import {
  useAppSelector,
  useAppDispatch,
  authActions,
  actions,
  api,
  useGetQuery,
  useMutateMutation,
} from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { FormField } from './auth-form';
export function Account() {
  const { user, ready } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: orders, error } = useGetQuery('/orders', { skip: !user });
  const { data: addresses, refetch: reloadAddresses } = useGetQuery('/account/addresses', {
    skip: !user,
  });
  const { data: sessions, refetch: reloadSessions } = useGetQuery('/auth/sessions', {
    skip: !user,
  });
  const [mutate] = useMutateMutation();
  const [addressOpen, setAddressOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({ resolver: zodResolver(addressSchema) as any });
  if (!ready) return <div className="shell py-20">Opening your account…</div>;
  if (!user)
    return (
      <div className="shell py-20 text-center">
        <h1 className="section-heading">Make yourself at home.</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to see your orders, saved addresses and account details.
        </p>
        <Button asChild>
          <Link href="/auth/login">
            Sign in <ArrowUpRight />
          </Link>
        </Button>
      </div>
    );
  const logout = async (all = false) => {
    try {
      await mutate({ path: all ? '/auth/logout-all' : '/auth/logout' }).unwrap();
      dispatch(authActions.setAuth({ user: null, accessToken: null }));
      dispatch(actions.resetPrivateState());
      dispatch(api.util.resetApiState());
      localStorage.removeItem('aurel-cart-owner');
      router.push('/');
    } catch {
      toast.error('Unable to sign out. Please try again.');
    }
  };
  return (
    <div className="shell py-12">
      <div className="mb-10 flex flex-wrap justify-between gap-5">
        <div>
          <p className="eyebrow mb-4 text-muted-foreground">YOUR LITTLE CORNER</p>
          <h1 className="section-heading">Hello, {user.name.split(' ')[0]}.</h1>
        </div>
        <div className="flex gap-2">
          {user.role !== 'USER' && (
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ShieldCheck />
                Open dashboard
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => logout()}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </div>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Your orders</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          {error ? (
            <p role="alert">Orders could not be loaded.</p>
          ) : orders?.data?.length ? (
            <div className="grid gap-4">
              {orders.data.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/account/orders/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 border p-6"
                >
                  <div>
                    <span className="eyebrow">#{o.id.slice(0, 8)}</span>
                    <p className="mb-0 mt-3 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.items.length} pieces
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-2 text-[10px]">
                    {o.status}
                  </span>
                  <span className="text-sm">{formatMoney(o.total)}</span>
                  <ArrowUpRight className="size-4" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="border py-20 text-center">
              <PackageCheck className="mx-auto mb-6 size-10 text-muted-foreground" />
              <h2 className="font-editorial text-3xl">Your story starts here.</h2>
              <p className="text-sm text-muted-foreground">
                Your orders will find a home on this page.
              </p>
              <Button asChild>
                <Link href="/shop">Explore the collection</Link>
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="profile">
          <ProfileForm user={user} />
        </TabsContent>
        <TabsContent value="addresses">
          <div className="mb-6 flex justify-between">
            <h2 className="font-editorial text-3xl">Your good places.</h2>
            <Dialog open={addressOpen} onOpenChange={setAddressOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus />
                  Add address
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Add an address</DialogTitle>
                <DialogDescription>A little place for your good things.</DialogDescription>
                <form
                  className="grid grid-cols-2 gap-4"
                  onSubmit={handleSubmit(async (values) => {
                    try {
                      await mutate({ path: '/account/addresses', body: values }).unwrap();
                      setAddressOpen(false);
                      reloadAddresses();
                      toast.success('Address saved');
                    } catch {
                      toast.error('Unable to save address');
                    }
                  })}
                >
                  {[
                    ['name', 'Name'],
                    ['phone', 'Phone'],
                    ['line1', 'Address'],
                    ['line2', 'Address line 2'],
                    ['city', 'City'],
                    ['state', 'State'],
                    ['pincode', 'Pincode'],
                  ].map(([name, label]) => (
                    <FormField
                      key={name}
                      label={label}
                      error={errors[name as keyof AddressInput]?.message}
                    >
                      <Input {...register(name as keyof AddressInput)} />
                    </FormField>
                  ))}
                  <Button type="submit">Save address</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {addresses?.data?.map((a: any) => (
              <div key={a.id} className="border p-6 text-sm leading-7">
                <strong>{a.name}</strong>
                <p>
                  {a.line1}, {a.line2}
                  <br />
                  {a.city}, {a.state} {a.pincode}
                  <br />
                  {a.phone}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await mutate({
                        path: `/account/addresses/${a.id}`,
                        method: 'DELETE',
                      }).unwrap();
                      reloadAddresses();
                    } catch {
                      toast.error('Unable to delete address');
                    }
                  }}
                >
                  <Trash2 />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="security">
          <h2 className="font-editorial text-3xl">Your active sessions.</h2>
          {sessions?.data?.map((s: any) => (
            <div key={s.id} className="border-b py-4 text-xs">
              <p>{s.userAgent}</p>
              <span className="text-muted-foreground">
                {new Date(s.createdAt).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          <Button variant="outline" className="mt-6" onClick={() => logout(true)}>
            Sign out all devices
          </Button>
          <Button variant="ghost" onClick={() => reloadSessions()}>
            Refresh sessions
          </Button>
          <div className="mt-10">
            <Link href="/auth/forgot-password" className="text-sm underline">
              Reset your password
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function ProfileForm({ user }: { user: any }) {
  const [mutate, { isLoading }] = useMutateMutation();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const { register, handleSubmit } = useForm({ defaultValues: { name: user.name, phone: '' } });
  return (
    <form
      className="grid max-w-md gap-5 border p-7"
      onSubmit={handleSubmit(async (values) => {
        try {
          await mutate({
            path: '/account/profile',
            method: 'PATCH',
            body: { name: values.name, ...(values.phone ? { phone: values.phone } : {}) },
          }).unwrap();
          dispatch(
            authActions.setAuth({ user: { ...user, name: values.name }, accessToken: token }),
          );
          toast.success('Profile updated');
        } catch (err: any) {
          toast.error(err.data?.error?.message ?? 'Unable to update profile');
        }
      })}
    >
      <FormField label="Your name">
        <Input {...register('name')} required minLength={2} />
      </FormField>
      <FormField label="Email address">
        <Input value={user.email} disabled />
      </FormField>
      <FormField label="Mobile number">
        <Input {...register('phone')} placeholder="10 digit mobile number" />
      </FormField>
      <Button disabled={isLoading} type="submit">
        Save profile
      </Button>
    </form>
  );
}
