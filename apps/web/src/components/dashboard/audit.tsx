'use client';
import { useState } from 'react';
import { useGetQuery } from '@/lib/store';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
export function Audit() {
  const [page, setPage] = useState(1);
  const { data, error } = useGetQuery(`/admin/audit?page=${page}`);
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <h1 className="text-2xl font-semibold">The audit trail.</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Who changed what, and when. Records cannot be edited through the application.
      </p>
      {error ? (
        <p role="alert">Audit trail could not be loaded.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{new Date(l.createdAt).toLocaleString('en-IN')}</TableCell>
                <TableCell>{l.actor.name}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell>{l.resource}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(l)}>
                    View change
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="mt-5 flex gap-4">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!data?.data || data.data.length < 50}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogTitle>Recorded change</DialogTitle>
          <DialogDescription>
            {selected?.resourceId} · IP {selected?.ip ?? 'unknown'}
          </DialogDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold">Before</h3>
              <pre className="max-h-96 overflow-auto bg-muted p-4 text-[11px]">
                {JSON.stringify(selected?.before, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-xs font-semibold">After</h3>
              <pre className="max-h-96 overflow-auto bg-muted p-4 text-[11px]">
                {JSON.stringify(selected?.after, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
