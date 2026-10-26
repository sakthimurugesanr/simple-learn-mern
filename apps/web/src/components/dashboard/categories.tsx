'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { attributeDefinitionSchema, type AttributeDefinition } from '@aurel/shared';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SimpleSelect } from '../ui/select';
import { FormField } from '../auth-form';
import { DynamicAttributeFields } from './product-editor';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
export function Categories() {
  const { data, refetch } = useGetQuery('/catalog/categories');
  const [mutate, { isLoading }] = useMutateMutation();
  const [id, setId] = useState('');
  const [fields, setFields] = useState<AttributeDefinition[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parent, setParent] = useState('none');
  const preview = useForm();
  const select = (value: string) => {
    setId(value);
    setFields(data.data.find((c: any) => c.id === value).definitions);
  };
  const update = (index: number, values: Partial<AttributeDefinition>) =>
    setFields(fields.map((f, i) => (i === index ? { ...f, ...values } : f)));
  return (
    <>
      <div className="mb-8 flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories & dynamic fields</h1>
          <p className="text-sm text-muted-foreground">
            Change the domain through data. The product form adapts automatically.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>A new category</DialogTitle>
            <DialogDescription>Create a category and then define its fields.</DialogDescription>
            <FormField label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Parent category">
              <SimpleSelect
                value={parent}
                onValueChange={setParent}
                options={[
                  { value: 'none', label: 'Top-level category' },
                  ...(data?.data ?? []).map((c: any) => ({ value: c.id, label: c.name })),
                ]}
              />
            </FormField>
            <Button
              onClick={async () => {
                try {
                  await mutate({
                    path: '/catalog/manage/categories',
                    body: {
                      name,
                      slug: name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                      parentId: parent === 'none' ? null : parent,
                    },
                  }).unwrap();
                  setOpen(false);
                  setName('');
                  refetch();
                  toast.success('Category created');
                } catch (err: any) {
                  toast.error(err.data?.error?.message ?? 'Unable to create category');
                }
              }}
            >
              Create category
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-7 max-w-md">
        <SimpleSelect
          value={id}
          onValueChange={select}
          placeholder="Choose a category"
          options={(data?.data ?? []).map((c: any) => ({ value: c.id, label: c.name }))}
        />
      </div>
      {id && (
        <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <section className="space-y-4">
            {fields.map((f, i) => (
              <div key={i} className="rounded-lg border bg-background p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold">Field {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove field"
                    onClick={() => setFields(fields.filter((_, n) => i !== n))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Key">
                    <Input value={f.key} onChange={(e) => update(i, { key: e.target.value })} />
                  </FormField>
                  <FormField label="Label">
                    <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} />
                  </FormField>
                  <FormField label="Type">
                    <SimpleSelect
                      value={f.type}
                      onValueChange={(v) => update(i, { type: v as any })}
                      options={[
                        'text',
                        'number',
                        'select',
                        'multi-select',
                        'boolean',
                        'color',
                        'date',
                      ].map((value) => ({ value, label: value }))}
                    />
                  </FormField>
                  <FormField label="Unit (optional)">
                    <Input
                      value={f.unit ?? ''}
                      onChange={(e) => update(i, { unit: e.target.value || undefined })}
                    />
                  </FormField>
                  {['select', 'multi-select'].includes(f.type) && (
                    <FormField label="Options, separated by commas">
                      <Input
                        value={f.options.join(',')}
                        onChange={(e) =>
                          update(i, { options: e.target.value.split(',').map((v) => v.trim()) })
                        }
                      />
                    </FormField>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-5">
                  {['required', 'filterable', 'showOnCard'].map((key) => (
                    <label key={key} className="flex min-h-10 items-center gap-2 text-xs">
                      <Checkbox
                        checked={f[key as 'required']}
                        onCheckedChange={(v) => update(i, { [key]: !!v })}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setFields([
                    ...fields,
                    {
                      key: `field_${fields.length + 1}`,
                      label: 'New field',
                      type: 'text',
                      options: [],
                      required: false,
                      filterable: false,
                      showOnCard: false,
                      sortOrder: fields.length,
                    },
                  ])
                }
              >
                <Plus />
                Add field
              </Button>
              <Button
                disabled={isLoading}
                onClick={async () => {
                  try {
                    const values = fields.map((f, i) =>
                      attributeDefinitionSchema.parse({ ...f, sortOrder: i }),
                    );
                    await mutate({
                      path: `/catalog/manage/categories/${id}/attributes`,
                      method: 'PUT',
                      body: values,
                    }).unwrap();
                    toast.success('Attribute definitions saved');
                    refetch();
                  } catch (err: any) {
                    toast.error(err.data?.error?.message ?? err.message ?? 'Unable to save fields');
                  }
                }}
              >
                Save definitions
              </Button>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              Changes that invalidate existing product attributes are rejected. Start new required
              fields as optional, update products, then make the fields required.
            </p>
          </section>
          <aside className="h-fit rounded-lg border bg-background p-6">
            <h2 className="mb-2 text-sm font-semibold">Product form · live preview</h2>
            <p className="mb-6 text-xs text-muted-foreground">
              This uses the same renderer as the product editor.
            </p>
            <DynamicAttributeFields
              definitions={fields.filter((f) => attributeDefinitionSchema.safeParse(f).success)}
              register={preview.register}
              control={preview.control}
              errors={{}}
            />
          </aside>
        </div>
      )}
    </>
  );
}
