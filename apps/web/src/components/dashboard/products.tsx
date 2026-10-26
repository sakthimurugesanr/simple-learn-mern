'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@aurel/shared';
import { formatMoney } from '@aurel/shared';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { usePermission } from '../permission';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { ProductEditor } from './product-editor';
import { toast } from 'sonner';
const DataTable = dynamic(() => import('./data-grid').then((m) => m.DataTable), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse bg-muted" />,
});
export function Products() {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, error } = useGetQuery(
    `/catalog/manage/products?page=${page}&limit=25`,
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product>();
  const [deleting, setDeleting] = useState<Product>();
  const [mutate] = useMutateMutation();
  const create = usePermission('product:create');
  const update = usePermission('product:update');
  const remove = usePermission('product:delete');
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">Your product collection</h1>
          <p className="text-sm text-muted-foreground">
            Create, refine and manage your everyday essentials.
          </p>
        </div>
        {create && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus />
            Add product
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="border p-7">
          Products could not be loaded. Check your permissions and API connection.
        </p>
      ) : (
        <DataTable
          rows={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          page={page}
          onPage={setPage}
          loading={isLoading}
          columns={[
            { field: 'name', headerName: 'Product', flex: 1.5, minWidth: 180 },
            { field: 'status', headerName: 'Status', width: 120 },
            {
              field: 'price',
              headerName: 'Price',
              width: 120,
              valueFormatter: (v: number) => formatMoney(v),
            },
            {
              field: 'stock',
              headerName: 'Stock',
              width: 100,
              valueGetter: (_v: any, r: any) =>
                r.variants.reduce((a: number, v: any) => a + v.stock, 0),
            },
            {
              field: 'actions',
              headerName: 'Actions',
              width: 120,
              sortable: false,
              renderCell: (params: any) => (
                <div className="flex gap-1">
                  {update && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit product"
                      onClick={() => {
                        setEditing(params.row);
                        setOpen(true);
                      }}
                    >
                      <Pencil />
                    </Button>
                  )}
                  {remove && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Archive product"
                      onClick={() => setDeleting(params.row)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="text-xl font-semibold">
            {editing ? 'Edit product' : 'A new considered piece'}
          </DialogTitle>
          <DialogDescription>
            Product details, category attributes, images and inventory.
          </DialogDescription>
          <ProductEditor
            key={editing?.id ?? 'new'}
            product={editing}
            onSaved={() => {
              setOpen(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(undefined);
        }}
      >
        <DialogContent>
          <DialogTitle>Archive this product?</DialogTitle>
          <DialogDescription>
            {deleting?.name} will be removed from the storefront. Existing orders keep their
            original item details.
          </DialogDescription>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleting(undefined)}>
              Keep product
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await mutate({
                    path: `/catalog/manage/products/${deleting!.id}`,
                    method: 'DELETE',
                  }).unwrap();
                  setDeleting(undefined);
                  refetch();
                  toast.success('Product archived');
                } catch (err: any) {
                  toast.error(err.data?.error?.message ?? 'Unable to archive product');
                }
              }}
            >
              Archive product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
