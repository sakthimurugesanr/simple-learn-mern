'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { FormField } from '../auth-form';
import { toast } from 'sonner';
export function Testimonials() {
  const { data, refetch } = useGetQuery('/admin/testimonials');
  const [mutate] = useMutateMutation();
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const { register, reset, watch, setValue, handleSubmit } = useForm<any>();
  const edit = (item?: any) => {
    setSelected(item);
    reset(item ?? { name: '', quote: '', location: '', rating: 5, active: false });
    setOpen(true);
  };
  return (
    <>
      <div className="mb-6 flex justify-between">
        <p className="max-w-lg text-xs leading-6 text-muted-foreground">
          Publish only real customer feedback with permission. The development seed deliberately
          contains no invented testimonials.
        </p>
        <Button onClick={() => edit()}>Add testimonial</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data?.data?.map((t: any) => (
          <div key={t.id} className="rounded-lg border p-6">
            <p className="text-sm leading-7">“{t.quote}”</p>
            <p className="text-xs text-muted-foreground">
              {t.name} · {t.location} · {t.rating}/5
            </p>
            <Button variant="outline" size="sm" onClick={() => edit(t)}>
              Edit · {t.active ? 'Published' : 'Draft'}
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Customer feedback</DialogTitle>
          <DialogDescription>
            Only publish authentic feedback that the customer has agreed to share.
          </DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                const body = {
                  name: values.name,
                  quote: values.quote,
                  location: values.location,
                  rating: values.rating,
                  active: values.active,
                };
                await mutate({
                  path: `/admin/testimonials${selected ? `/${selected.id}` : ''}`,
                  method: selected ? 'PUT' : 'POST',
                  body,
                }).unwrap();
                setOpen(false);
                refetch();
                toast.success('Testimonial saved');
              } catch (err: any) {
                toast.error(err.data?.error?.message ?? 'Unable to save testimonial');
              }
            })}
          >
            <FormField label="Customer display name">
              <Input {...register('name')} required minLength={2} />
            </FormField>
            <FormField label="Feedback">
              <Textarea {...register('quote')} required minLength={10} />
            </FormField>
            <FormField label="Location">
              <Input {...register('location')} />
            </FormField>
            <FormField label="Rating (1–5)">
              <Input
                type="number"
                min={1}
                max={5}
                {...register('rating', { valueAsNumber: true })}
              />
            </FormField>
            <label className="flex items-center gap-3 text-xs">
              <Checkbox
                checked={watch('active') ?? false}
                onCheckedChange={(v) => setValue('active', !!v)}
              />
              Publish on storefront
            </label>
            <Button type="submit">Save testimonial</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
