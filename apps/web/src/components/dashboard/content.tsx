'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const UtcDateTimePicker = dynamic(
  () => import('./date-time-picker').then((m) => m.UtcDateTimePicker),
  { ssr: false },
);
import { useForm } from 'react-hook-form';
import { Plus, Pencil } from 'lucide-react';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { FormField } from '../auth-form';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { toast } from 'sonner';
import { Testimonials } from './testimonials';
export function Content({ offers = false }: { offers?: boolean }) {
  const endpoint = offers ? 'offers' : 'banners';
  const { data, error, refetch } = useGetQuery(`/admin/${endpoint}`);
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [mutate, { isLoading }] = useMutateMutation();
  const { register, reset, watch, setValue, handleSubmit } = useForm<any>();
  const edit = (item?: any) => {
    setSelected(item);
    reset(
      item
        ? offers
          ? { ...item, startsAt: item.startsAt, endsAt: item.endsAt }
          : item
        : offers
          ? {
              code: '',
              title: '',
              percent: 10,
              minimum: 0,
              startsAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              active: true,
            }
          : { title: '', subtitle: '', image: '', href: '/shop', active: true, sortOrder: 0 },
    );
    setOpen(true);
  };
  return (
    <>
      <div className="mb-7 flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {offers ? 'A little extra, for your customers.' : 'The storefront edit.'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {offers
              ? 'Manage welcome codes and seasonal offers.'
              : 'Shape your landing page with banners and curated collections.'}
          </p>
        </div>
        <Button onClick={() => edit()}>
          <Plus />
          {offers ? 'New offer' : 'New banner'}
        </Button>
      </div>
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">{offers ? 'Offers' : 'Banners'}</TabsTrigger>
          {!offers && (
            <>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="items">
          {error ? (
            <p role="alert">Content could not be loaded.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data?.data?.map((item: any) => (
                <div key={item.id} className="rounded-lg border p-6">
                  {!offers && (
                    <div
                      className="mb-5 aspect-video bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.image})` }}
                    />
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold">{item.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        {offers ? `${item.code} · ${item.percent}% off` : item.subtitle}
                      </p>
                      <span className="rounded bg-secondary px-2 py-1 text-[10px]">
                        {item.active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit content"
                      onClick={() => edit(item)}
                    >
                      <Pencil />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        {!offers && (
          <>
            <TabsContent value="collections">
              <Collections />
            </TabsContent>
            <TabsContent value="testimonials">
              <Testimonials />
            </TabsContent>
          </>
        )}
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>
            {selected ? 'Edit' : 'Create'} {offers ? 'offer' : 'banner'}
          </DialogTitle>
          <DialogDescription>
            Updates appear on the storefront after its short cache expires.
          </DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={handleSubmit(async (values) => {
              const body = offers
                ? {
                    code: values.code,
                    title: values.title,
                    percent: values.percent,
                    minimum: values.minimum,
                    startsAt: new Date(values.startsAt).toISOString(),
                    endsAt: new Date(values.endsAt).toISOString(),
                    active: values.active,
                  }
                : {
                    title: values.title,
                    subtitle: values.subtitle,
                    image: values.image,
                    href: values.href,
                    active: values.active,
                    sortOrder: values.sortOrder,
                  };
              try {
                await mutate({
                  path: `/admin/${endpoint}${selected ? `/${selected.id}` : ''}`,
                  method: selected ? 'PUT' : 'POST',
                  body,
                }).unwrap();
                setOpen(false);
                refetch();
                toast.success('Content saved');
              } catch (err: any) {
                toast.error(err.data?.error?.message ?? 'Unable to save content');
              }
            })}
          >
            <FormField label="Title">
              <Input {...register('title')} required />
            </FormField>
            {offers ? (
              <>
                <FormField label="Code">
                  <Input {...register('code')} required pattern="[A-Z0-9_-]+" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Discount percent">
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      {...register('percent', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Minimum subtotal (paise)">
                    <Input
                      type="number"
                      min={0}
                      {...register('minimum', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
                <UtcDateTimePicker
                  label="Starts (UTC)"
                  value={watch('startsAt')}
                  onChange={(value) => setValue('startsAt', value)}
                />
                <UtcDateTimePicker
                  label="Ends (UTC)"
                  value={watch('endsAt')}
                  onChange={(value) => setValue('endsAt', value)}
                />
              </>
            ) : (
              <>
                <FormField label="Subtitle">
                  <Textarea {...register('subtitle')} />
                </FormField>
                <FormField label="Image URL">
                  <Input type="url" {...register('image')} required />
                </FormField>
                <FormField label="Link path">
                  <Input {...register('href')} required />
                </FormField>
                <FormField label="Sort order">
                  <Input
                    type="number"
                    min={0}
                    {...register('sortOrder', { valueAsNumber: true })}
                  />
                </FormField>
              </>
            )}
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={watch('active') ?? false}
                onCheckedChange={(v) => setValue('active', !!v)}
              />
              Active
            </label>
            <Button disabled={isLoading} type="submit">
              Save {offers ? 'offer' : 'banner'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Collections() {
  const { data, refetch } = useGetQuery('/admin/collections');
  const { data: products } = useGetQuery('/catalog/manage/products?limit=100');
  const [mutate] = useMutateMutation();
  const [selected, setSelected] = useState<any>(null);
  const [ids, setIds] = useState<string[]>([]);
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Choose the pieces for each landing page section.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {data?.data?.map((c: any) => (
          <div key={c.id} className="rounded-lg border p-6">
            <h3 className="text-sm font-semibold">{c.name}</h3>
            <p className="text-xs text-muted-foreground">{c.products.length} curated pieces</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(c);
                setIds(c.products.map((p: any) => p.productId));
              }}
            >
              Curate collection
            </Button>
          </div>
        ))}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>Select the products to feature.</DialogDescription>
          <div className="max-h-80 space-y-3 overflow-auto">
            {products?.data?.map((p: any) => (
              <label key={p.id} className="flex min-h-10 items-center gap-3 text-xs">
                <Checkbox
                  checked={ids.includes(p.id)}
                  onCheckedChange={(v) =>
                    setIds(v ? [...ids, p.id] : ids.filter((id) => id !== p.id))
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
          <Button
            onClick={async () => {
              try {
                await mutate({
                  path: `/admin/collections/${selected.slug}`,
                  method: 'PUT',
                  body: { name: selected.name, productIds: ids },
                }).unwrap();
                refetch();
                setSelected(null);
                toast.success('Collection saved');
              } catch {
                toast.error('Unable to save collection');
              }
            }}
          >
            Save collection
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
