'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  resources,
  actions as permissionActions,
  can,
  type Role,
  type PermissionOverride,
} from '@aurel/shared';
import { useGetQuery, useMutateMutation } from '@/lib/store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { SimpleSelect } from '../ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { toast } from 'sonner';
import { ShieldCheck, UserRound } from 'lucide-react';
const DataTable = dynamic(() => import('./data-grid').then((m) => m.DataTable), { ssr: false });
export function PermissionMatrix({
  role,
  overrides,
  onChange,
}: {
  role: Role;
  overrides: PermissionOverride[];
  onChange: (v: PermissionOverride[]) => void;
}) {
  const set = (permission: string, granted: boolean) =>
    onChange([...overrides.filter((o) => o.permission !== permission), { permission, granted }]);
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            {permissionActions.map((a) => (
              <TableHead key={a}>{a}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => (
            <TableRow key={resource}>
              <TableCell className="capitalize">{resource}</TableCell>
              {permissionActions.map((action) => (
                <TableCell key={action}>
                  <Checkbox
                    aria-label={`${resource}:${action}`}
                    checked={can(role, overrides, `${resource}:${action}`)}
                    disabled={role === 'ADMIN'}
                    onCheckedChange={(v) => set(`${resource}:${action}`, !!v)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-5 grid gap-4">
        {['product:update:any', 'product:delete:any'].map((p) => (
          <label key={p} className="flex items-center gap-3 text-xs">
            <Checkbox
              checked={can(role, overrides, p)}
              disabled={role === 'ADMIN'}
              onCheckedChange={(v) => set(p, !!v)}
            />
            {p} · Permit access to other uploaders’ products
          </label>
        ))}
      </div>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Checked permissions allow access. Unchecked permissions explicitly deny access, including
        defaults. Analytics, people, settings, categories and audit remain administrator-only.
      </p>
    </div>
  );
}
export function People() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, refetch, error } = useGetQuery(
    `/admin/users?page=${page}&q=${encodeURIComponent(search)}`,
  );
  const [selected, setSelected] = useState<any>(null);
  const { data: detail } = useGetQuery(`/admin/users/${selected?.id}`, { skip: !selected });
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [confirm, setConfirm] = useState<any>(null);
  const [mutate] = useMutateMutation();
  return (
    <>
      <h1 className="text-2xl font-semibold">People & permissions</h1>
      <p className="mb-7 text-sm text-muted-foreground">The right access, for the right people.</p>
      <form
        className="mb-6 flex max-w-md gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
          setPage(1);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search people"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {error ? (
        <p role="alert">People could not be loaded.</p>
      ) : (
        <DataTable
          rows={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          page={page}
          onPage={setPage}
          columns={[
            { field: 'name', headerName: 'Name', flex: 1, minWidth: 140 },
            { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 180 },
            { field: 'role', headerName: 'Role', width: 140 },
            { field: 'active', headerName: 'Active', width: 90 },
            {
              field: 'actions',
              headerName: 'Manage',
              width: 160,
              renderCell: (p: any) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(p.row);
                    setOverrides(p.row.permissions);
                  }}
                >
                  <UserRound />
                  Profile & access
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
        <DialogContent className="max-w-4xl">
          <DialogTitle className="text-xl">{selected?.name}</DialogTitle>
          <DialogDescription>
            {selected?.email} · {selected?.role}
          </DialogDescription>
          {selected && (
            <Tabs defaultValue="permissions">
              <TabsList>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="uploads">Upload history</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>
              <TabsContent value="permissions">
                <PermissionMatrix
                  role={selected.role}
                  overrides={overrides}
                  onChange={setOverrides}
                />
                <Button
                  className="mt-5"
                  onClick={async () => {
                    try {
                      await mutate({
                        path: `/admin/users/${selected.id}/permissions`,
                        method: 'PUT',
                        body: overrides,
                      }).unwrap();
                      toast.success('Permissions saved');
                      refetch();
                    } catch (err: any) {
                      toast.error(err.data?.error?.message ?? 'Unable to save permissions');
                    }
                  }}
                >
                  <ShieldCheck />
                  Save permissions
                </Button>
              </TabsContent>
              <TabsContent value="profile">
                <div className="grid gap-5">
                  <div className="grid gap-2 text-sm">
                    <span>{selected.name}</span>
                    <span>{selected.email}</span>
                    <span>Joined {new Date(selected.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="max-w-xs">
                    <SimpleSelect
                      value={selected.role}
                      onValueChange={(role) => setConfirm({ id: selected.id, role })}
                      options={['ADMIN', 'SUPERVISOR', 'USER'].map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setConfirm({ id: selected.id, active: !selected.active })}
                  >
                    {selected.active ? 'Suspend account' : 'Activate account'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Role and suspension changes end existing sessions.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="uploads">
                <h3 className="text-sm">Recent uploads</h3>
                {detail?.data?.products?.map((p: any) => (
                  <div key={p.id} className="flex justify-between border-b py-3 text-xs">
                    <span>{p.name}</span>
                    <span>{p.status}</span>
                  </div>
                ))}
                <h3 className="mt-7 text-sm">Activity trail</h3>
                {detail?.data?.auditLogs?.map((l: any) => (
                  <div key={l.id} className="border-b py-3 text-xs">
                    <span>
                      {l.action} · {l.resource} · {l.resourceId.slice(0, 8)}
                    </span>
                    <span className="ml-4 text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="orders">
                {detail?.data?.orders?.map((o: any) => (
                  <div key={o.id} className="flex justify-between border-b py-3 text-xs">
                    <span>#{o.id.slice(0, 8)}</span>
                    <span>{o.status}</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Change this account’s access?</DialogTitle>
          <DialogDescription>
            This change takes effect immediately and signs the account out of all devices.
          </DialogDescription>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const { id, ...body } = confirm;
                  await mutate({ path: `/admin/users/${id}`, method: 'PATCH', body }).unwrap();
                  setConfirm(null);
                  setSelected(null);
                  refetch();
                  toast.success('Account updated');
                } catch (err: any) {
                  toast.error(err.data?.error?.message ?? 'Unable to update account');
                }
              }}
            >
              Confirm change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
