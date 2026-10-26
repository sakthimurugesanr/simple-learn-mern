'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  productSchema,
  buildAttributeSchema,
  type AttributeDefinition,
  type Product,
} from '@aurel/shared';
import { toast } from 'sonner';
import { UploadCloud, Plus, Trash2, ArrowUp, ArrowDown, LoaderCircle } from 'lucide-react';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SimpleSelect } from '../ui/select';
import { FormField } from '../auth-form';
export function DynamicAttributeFields({
  definitions,
  control,
  register,
  errors,
}: {
  definitions: AttributeDefinition[];
  control: any;
  register: any;
  errors: any;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {definitions.map((d) => (
        <FormField
          key={d.key}
          label={`${d.label}${d.required ? ' *' : ''}${d.unit ? ` (${d.unit})` : ''}`}
          error={errors?.[d.key]?.message}
        >
          {d.type === 'select' ? (
            <Controller
              name={`attributes.${d.key}`}
              control={control}
              render={({ field }) => (
                <SimpleSelect
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={d.options.map((o) => ({ label: o, value: o }))}
                />
              )}
            />
          ) : d.type === 'boolean' ? (
            <Controller
              name={`attributes.${d.key}`}
              control={control}
              render={({ field }) => (
                <Checkbox
                  aria-label={d.label}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          ) : d.type === 'multi-select' ? (
            <Controller
              name={`attributes.${d.key}`}
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {d.options.map((o) => (
                    <label key={o} className="flex min-h-10 items-center gap-2 text-xs">
                      <Checkbox
                        checked={(field.value ?? []).includes(o)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...(field.value ?? []), o]
                              : (field.value ?? []).filter((v: string) => v !== o),
                          )
                        }
                      />
                      {o}
                    </label>
                  ))}
                </div>
              )}
            />
          ) : (
            <Input
              type={
                d.type === 'number'
                  ? 'number'
                  : d.type === 'date'
                    ? 'date'
                    : d.type === 'color'
                      ? 'color'
                      : 'text'
              }
              {...register(
                `attributes.${d.key}`,
                d.type === 'number'
                  ? { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) }
                  : { setValueAs: (v: string) => (v === '' ? undefined : v) },
              )}
            />
          )}
        </FormField>
      ))}
    </div>
  );
}
export function ProductEditor({ product, onSaved }: { product?: Product; onSaved: () => void }) {
  const { data } = useGetQuery('/catalog/categories');
  const [mutate, { isLoading }] = useMutateMutation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          status: product.status,
          attributes: product.attributes,
          images: product.images.map(({ url, alt }) => ({ url, alt })),
          variants: product.variants.map(({ sku, attributes, price, stock }) => ({
            sku,
            attributes,
            price,
            stock,
          })),
        }
      : {
          name: '',
          slug: '',
          description: '',
          categoryId: '',
          price: 0,
          compareAtPrice: null,
          status: 'DRAFT',
          attributes: {},
          images: [],
          variants: [{ sku: '', attributes: {}, stock: 0, price: null }],
        },
  });
  const categoryId = watch('categoryId');
  const category = data?.data?.find((c: any) => c.id === categoryId);
  const images = watch('images') ?? [];
  const variants = watch('variants') ?? [];
  const upload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const added = [];
      for (const file of Array.from(files).slice(0, 12 - images.length)) {
        const body = new FormData();
        body.append('image', file);
        const r = await mutate({ path: '/uploads', body }).unwrap();
        added.push({ url: r.data.url, alt: watch('name') || file.name });
      }
      setValue('images', [...images, ...added], { shouldValidate: true });
      toast.success('Images uploaded');
    } catch (err: any) {
      toast.error(err.data?.error?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  return (
    <form
      className="space-y-7"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        const parsed = buildAttributeSchema(category?.definitions ?? []).safeParse(
          values.attributes,
        );
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
          return;
        }
        try {
          await mutate({
            path: product ? `/catalog/manage/products/${product.id}` : '/catalog/manage/products',
            method: product ? 'PUT' : 'POST',
            body: values,
          }).unwrap();
          toast.success(product ? 'Product updated' : 'Product created');
          onSaved();
        } catch (err: any) {
          setError(err.data?.error?.message ?? 'Unable to save product');
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Product name" error={errors.name?.message as string}>
          <Input
            {...register('name')}
            onBlur={(e) => {
              if (!product && !watch('slug'))
                setValue(
                  'slug',
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                );
            }}
          />
        </FormField>
        <FormField label="Slug" error={errors.slug?.message as string}>
          <Input {...register('slug')} />
        </FormField>
        <FormField label="Category" error={errors.categoryId?.message as string}>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <SimpleSelect
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue('attributes', {});
                }}
                options={(data?.data ?? []).map((c: any) => ({ value: c.id, label: c.name }))}
              />
            )}
          />
        </FormField>
        <FormField label="Status">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <SimpleSelect
                value={field.value}
                onValueChange={field.onChange}
                options={['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            )}
          />
        </FormField>
        <FormField label="Price (integer paise)" error={errors.price?.message as string}>
          <Input type="number" step="1" {...register('price', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Compare-at price (paise, optional)">
          <Input
            type="number"
            step="1"
            {...register('compareAtPrice', {
              setValueAs: (v: string) => (v === '' ? null : Number(v)),
            })}
          />
        </FormField>
      </div>
      <FormField label="Description">
        <Textarea {...register('description')} />
      </FormField>
      <section className="rounded border p-5">
        <h3 className="mb-4 text-sm font-semibold">Category attributes</h3>
        {category ? (
          <DynamicAttributeFields
            definitions={category.definitions}
            control={control}
            register={register}
            errors={(errors.attributes as any) ?? {}}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Choose a category to see its configurable fields.
          </p>
        )}
      </section>
      <section className="rounded border p-5">
        <div className="mb-5 flex justify-between">
          <h3 className="text-sm font-semibold">Images</h3>
          <span className="text-xs text-muted-foreground">{images.length}/12</span>
        </div>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed bg-muted/30 px-5 py-8 text-xs"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {uploading ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <UploadCloud className="size-6" />
          )}
          Drop product photos here, or click to upload
          <Input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={uploading}
            onChange={(e) => upload(e.target.files)}
          />
          <span className="text-muted-foreground">8 MB per image · JPEG, PNG, WebP or AVIF</span>
        </label>
        {errors.images && (
          <p className="mt-2 text-xs text-red-600">Upload at least one product image.</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {images.map((img: any, i: number) => (
            <div key={img.url} className="border p-2">
              <div
                className="aspect-square bg-cover bg-center"
                style={{ backgroundImage: `url(${img.url})` }}
              />
              <Input
                className="mt-2"
                aria-label="Image alt text"
                value={img.alt}
                onChange={(e) => setValue(`images.${i}.alt`, e.target.value)}
              />
              <div className="mt-1 flex justify-between">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move image earlier"
                  disabled={!i}
                  onClick={() => {
                    const next = [...images];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setValue('images', next);
                  }}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move image later"
                  disabled={i === images.length - 1}
                  onClick={() => {
                    const next = [...images];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    setValue('images', next);
                  }}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove image"
                  onClick={() =>
                    setValue(
                      'images',
                      images.filter((_: any, n: number) => i !== n),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded border p-5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-sm font-semibold">Variants & inventory</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setValue('variants', [
                ...variants,
                { sku: '', attributes: {}, stock: 0, price: null },
              ])
            }
          >
            <Plus />
            Add variant
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Variant attributes use key=value pairs, separated by commas. Example: size=M, color=Olive
        </p>
        {variants.map((v: any, i: number) => (
          <div key={i} className="mb-4 grid gap-3 border-b pb-5 sm:grid-cols-2">
            <FormField label="Unique SKU">
              <Input {...register(`variants.${i}.sku`)} />
            </FormField>
            <FormField label="Attributes">
              <Input
                defaultValue={Object.entries(v.attributes)
                  .map(([k, value]) => `${k}=${value}`)
                  .join(', ')}
                onBlur={(e) => {
                  const entries = e.target.value
                    .split(',')
                    .filter(Boolean)
                    .map((pair) => pair.split('=').map((s) => s.trim()));
                  if (entries.some(([k, value]) => !k || !value)) {
                    setError('Variant attributes must be key=value pairs');
                    return;
                  }
                  setValue(`variants.${i}.attributes`, Object.fromEntries(entries));
                }}
              />
            </FormField>
            <FormField label="Stock">
              <Input
                type="number"
                min={0}
                {...register(`variants.${i}.stock`, { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Price override (paise)">
              <Input
                type="number"
                {...register(`variants.${i}.price`, {
                  setValueAs: (value: string) => (value === '' ? null : Number(value)),
                })}
              />
            </FormField>
            {variants.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setValue(
                    'variants',
                    variants.filter((_: any, n: number) => i !== n),
                  )
                }
              >
                <Trash2 />
                Remove variant
              </Button>
            )}
          </div>
        ))}
      </section>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm text-red-600">
          Please check the form fields, images and variant values.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isLoading || uploading}>
        {isLoading ? <LoaderCircle className="animate-spin" /> : null}Save product
      </Button>
    </form>
  );
}
