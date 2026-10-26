'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { orderStatuses, validStatusTransition, formatMoney } from '@aurel/shared';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { usePermission } from '../permission';
import { Button } from '../ui/button';
import { SimpleSelect } from '../ui/select';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { Printer, ExternalLink } from 'lucide-react';
const DataTable = dynamic(() => import('./data-grid').then((m) => m.DataTable), { ssr: false });
export function ManageOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const { data, error, refetch } = useGetQuery(
    `/orders/manage?page=${page}${status === 'all' ? '' : `&status=${status}`}`,
  );
  const [selected, setSelected] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [mutate] = useMutateMutation();
  const allowed = usePermission('order:update');
  return (
    <>
      <div className="mb-8 flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders, thoughtfully handled.</h1>
          <p className="text-sm text-muted-foreground">From a good choice to a happy delivery.</p>
        </div>
      </div>
      <div className="mb-6 w-52">
        <SimpleSelect
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All order statuses' },
            ...orderStatuses.map((value) => ({ value, label: value })),
          ]}
        />
      </div>
      {error ? (
        <p role="alert">Orders could not be loaded. Check your access.</p>
      ) : (
        <DataTable
          rows={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          page={page}
          onPage={setPage}
          columns={[
            {
              field: 'id',
              headerName: 'Order',
              width: 130,
              valueFormatter: (v: string) => `#${v.slice(0, 8)}`,
            },
            {
              field: 'customer',
              headerName: 'Customer',
              flex: 1,
              minWidth: 140,
              valueGetter: (_v: any, r: any) => r.user.name,
            },
            { field: 'status', headerName: 'Status', width: 130 },
            { field: 'paymentMethod', headerName: 'Payment', width: 120 },
            {
              field: 'total',
              headerName: 'Total',
              width: 130,
              valueFormatter: (v: number) => formatMoney(v),
            },
            {
              field: 'actions',
              headerName: 'Manage',
              width: 100,
              renderCell: (p: any) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(p.row);
                    setNextStatus('');
                  }}
                >
                  View
                </Button>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogTitle>Order #{selected?.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            {selected?.status} · {selected?.paymentMethod}
          </DialogDescription>
          {selected && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="text-xs leading-6">
                  <strong>{selected.address.name}</strong>
                  <br />
                  {selected.address.line1}, {selected.address.line2}
                  <br />
                  {selected.address.city}, {selected.address.state} {selected.address.pincode}
                  <br />
                  {selected.address.phone}
                </div>
                <div className="flex flex-col items-start gap-3">
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer />
                    Print order / packing slip
                  </Button>
                  <Button asChild variant="outline">
                    <a
                      href={`https://wa.me/91${selected.address.phone}?text=${encodeURIComponent(`Hello ${selected.address.name}, about your AUREL order #${selected.id.slice(0, 8)}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contact customer <ExternalLink />
                    </a>
                  </Button>
                </div>
              </div>
              {selected.items.map((i: any) => (
                <div key={i.id} className="flex justify-between border-b py-3 text-xs">
                  <span>
                    {i.name} · {i.sku} × {i.quantity}
                  </span>
                  <span>{formatMoney(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between py-4 text-sm font-semibold">
                <span>Order total</span>
                <span>{formatMoney(selected.total)}</span>
              </div>
              <h3 className="text-sm">Order timeline</h3>
              {selected.history.map((h: any) => (
                <div key={h.id} className="border-l-2 pl-4 text-xs">
                  <p>
                    {h.status} · {new Date(h.createdAt).toLocaleString('en-IN')}
                  </p>
                  {h.note && <p className="text-muted-foreground">{h.note}</p>}
                </div>
              ))}
              {allowed && orderStatuses.some((s) => validStatusTransition(selected.status, s)) && (
                <div className="grid gap-3 border-t pt-5">
                  <SimpleSelect
                    value={nextStatus}
                    onValueChange={setNextStatus}
                    placeholder="Choose next status"
                    options={orderStatuses
                      .filter((s) => validStatusTransition(selected.status, s))
                      .map((value) => ({ value, label: value }))}
                  />
                  <Input
                    placeholder="Note for status history (optional)"
                    aria-label="Status change note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button disabled={!nextStatus} onClick={() => setConfirm(true)}>
                    Update order status
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Move order to {nextStatus}?</DialogTitle>
          <DialogDescription>
            {['CANCELLED', 'RETURNED'].includes(nextStatus)
              ? 'The order inventory will be returned to stock once. Any refund must be arranged manually.'
              : 'This change is recorded in the order history and audit trail.'}
          </DialogDescription>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const result = await mutate({
                    path: `/orders/${selected.id}/status`,
                    method: 'PATCH',
                    body: { status: nextStatus, note },
                  }).unwrap();
                  setSelected(result.data);
                  setConfirm(false);
                  setNextStatus('');
                  refetch();
                  toast.success('Order updated');
                } catch (err: any) {
                  toast.error(err.data?.error?.message ?? 'Unable to update order');
                }
              }}
            >
              Confirm status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
