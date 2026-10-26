'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { FormField } from '../auth-form';
import { toast } from 'sonner';
export function Settings() {
  const { data, error } = useGetQuery('/catalog/settings');
  const [mutate, { isLoading }] = useMutateMutation();
  const { register, reset, watch, setValue, handleSubmit } = useForm<any>();
  useEffect(() => {
    if (data?.data) reset(data.data);
  }, [data, reset]);
  return (
    <>
      <h1 className="text-2xl font-semibold">The store details.</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        A few essentials that keep everything running.
      </p>
      {error ? (
        <p role="alert">Settings could not be loaded.</p>
      ) : (
        <form
          className="grid max-w-3xl gap-6 rounded-lg border bg-background p-7"
          onSubmit={handleSubmit(async (values) => {
            const {
              brandName,
              whatsappNumber,
              shipping,
              expressShipping,
              freeShippingThreshold,
              taxBps,
              seoDescription,
              maintenance,
            } = values;
            try {
              await mutate({
                path: '/admin/settings',
                method: 'PUT',
                body: {
                  brandName,
                  whatsappNumber,
                  shipping,
                  expressShipping,
                  freeShippingThreshold,
                  taxBps,
                  seoDescription,
                  maintenance,
                },
              }).unwrap();
              toast.success('Store settings saved');
            } catch (err: any) {
              toast.error(err.data?.error?.message ?? 'Unable to save settings');
            }
          })}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Brand name">
              <Input {...register('brandName')} required maxLength={60} />
            </FormField>
            <FormField label="WhatsApp number (country code, digits only)">
              <Input {...register('whatsappNumber')} placeholder="919876543210" />
            </FormField>
            {[
              ['shipping', 'Standard shipping (paise)'],
              ['expressShipping', 'Express shipping (paise)'],
              ['freeShippingThreshold', 'Free shipping threshold (paise)'],
              ['taxBps', 'Tax (basis points; 1800 = 18%)'],
            ].map(([name, label]) => (
              <FormField key={name} label={label}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  {...register(name, { valueAsNumber: true })}
                />
              </FormField>
            ))}
          </div>
          <FormField label="Store SEO description">
            <Textarea {...register('seoDescription')} maxLength={160} />
          </FormField>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={watch('maintenance') ?? false}
              onCheckedChange={(v) => setValue('maintenance', !!v)}
            />
            Pause order placement for maintenance
          </label>
          <Button className="w-fit" type="submit" disabled={isLoading}>
            Save store settings
          </Button>
          <p className="text-xs leading-6 text-muted-foreground">
            Money is stored in integer paise. Configure the legal policies and production services
            before accepting real orders.
          </p>
        </form>
      )}
    </>
  );
}
