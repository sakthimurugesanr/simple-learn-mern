'use client';
import { useState, useEffect } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowUpRight,
  GripVertical,
  RotateCcw,
  Download,
  TrendingUp,
  ShoppingBag,
  Users,
  Wallet,
  AlertTriangle,
  X,
} from 'lucide-react';
import { formatMoney } from '@aurel/shared';
import { useGetQuery, useMutateMutation, useAppSelector } from '@/lib/store';
import { Button } from '../ui/button';
import { SimpleSelect } from '../ui/select';
import { toast } from 'sonner';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
const Grid = WidthProvider(Responsive);
const defaultLayout: Layout[] = [
  { i: 'revenue', x: 0, y: 0, w: 8, h: 4 },
  { i: 'payment', x: 8, y: 0, w: 4, h: 4 },
  { i: 'products', x: 0, y: 4, w: 8, h: 4 },
  { i: 'stock', x: 8, y: 4, w: 4, h: 4 },
  { i: 'category', x: 0, y: 8, w: 6, h: 4 },
  { i: 'cities', x: 6, y: 8, w: 6, h: 4 },
];
export function Overview() {
  const user = useAppSelector((s) => s.auth.user);
  const [days, setDays] = useState('30');
  const [range, setRange] = useState(() => ({
    from: new Date(Date.now() - 30 * 86400000).toISOString(),
    to: new Date().toISOString(),
  }));
  useEffect(() => {
    setRange({
      from: new Date(Date.now() - Number(days) * 86400000).toISOString(),
      to: new Date().toISOString(),
    });
  }, [days]);
  const { data, isLoading, error, refetch } = useGetQuery(
    `/admin/analytics?from=${range.from}&to=${range.to}`,
    { skip: user?.role !== 'ADMIN' },
  );
  const { data: saved } = useGetQuery('/admin/layout', { skip: user?.role !== 'ADMIN' });
  const { data: uploads } = useGetQuery('/catalog/manage/products?limit=5', {
    skip: user?.role !== 'SUPERVISOR',
  });
  const [layout, setLayout] = useState(defaultLayout);
  const [mutate] = useMutateMutation();
  useEffect(() => {
    if (Array.isArray(saved?.data?.layout)) setLayout(saved.data.layout);
  }, [saved]);
  if (user?.role === 'SUPERVISOR')
    return (
      <div>
        <h1 className="text-2xl font-semibold">Your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Your permitted modules appear in the sidebar. Ask your administrator to grant product
          creation or editing access.
        </p>
        <div className="mt-7 rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">My uploads</p>
          <strong className="text-4xl">{uploads?.meta?.total ?? 0}</strong>
        </div>
      </div>
    );
  const a = data?.data;
  const titles: Record<string, string> = {
    revenue: 'Revenue over time',
    payment: 'Payment methods',
    products: 'Top selling pieces',
    stock: 'Stock to keep an eye on',
    category: 'Sales by category',
    cities: 'Where your customers are',
  };
  const exportPdf = async () => {
    if (!a) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.text('AUREL · Store report', 20, 25);
    pdf.setFontSize(11);
    pdf.text(`Period: ${range.from.slice(0, 10)} to ${range.to.slice(0, 10)}`, 20, 40);
    pdf.text(
      [
        `Revenue: INR ${(a.revenue / 100).toFixed(2)}`,
        `Orders: ${a.orders}`,
        `Average order: INR ${(a.aov / 100).toFixed(2)}`,
        `New customers: ${a.newUsers}`,
        `Returns: ${a.returns}`,
      ],
      20,
      55,
    );
    pdf.save('aurel-report.pdf');
  };
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">YOUR STORE, AT A GLANCE</p>
          <h1 className="mb-2 text-2xl font-semibold">A good day to grow.</h1>
          <p className="text-sm text-muted-foreground">Here’s what’s happening at Aurel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-40">
            <SimpleSelect
              value={days}
              onValueChange={setDays}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ]}
            />
          </div>
          <Button variant="outline" onClick={exportPdf} disabled={!a}>
            <Download />
            Report
          </Button>
        </div>
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border p-8">
          <h2 className="text-lg">Analytics is unavailable</h2>
          <p className="text-sm text-muted-foreground">
            The API, PostgreSQL and Redis must be running.
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Total revenue',
                value: a ? formatMoney(a.revenue) : '—',
                icon: TrendingUp,
                prev: a?.previous.revenue,
                current: a?.revenue,
              },
              {
                label: 'Orders placed',
                value: a?.orders ?? '—',
                icon: ShoppingBag,
                prev: a?.previous.orders,
                current: a?.orders,
              },
              { label: 'Average order value', value: a ? formatMoney(a.aov) : '—', icon: Wallet },
              { label: 'New customers', value: a?.newUsers ?? '—', icon: Users },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border bg-background p-6">
                <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{k.label}</span>
                  <k.icon className="size-4 text-primary" />
                </div>
                <strong className="text-3xl font-semibold tracking-tight">{k.value}</strong>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                  {k.prev > 0 ? (
                    <>
                      <ArrowUpRight className="size-3" />
                      {Math.round((((k.current ?? 0) - k.prev) / k.prev) * 100)}% vs previous period
                    </>
                  ) : (
                    <>From completed order activity</>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="mb-0 text-xs text-muted-foreground">
              Drag the handle to rearrange your workspace.
            </p>
            <div className="flex gap-2">
              <div className="w-44">
                <SimpleSelect
                  value=""
                  placeholder="Add a widget"
                  onValueChange={(id) => {
                    if (!layout.some((l) => l.i === id))
                      setLayout([...layout, { i: id, x: 0, y: Infinity, w: 6, h: 4 }]);
                  }}
                  options={Object.entries(titles)
                    .filter(([id]) => !layout.some((l) => l.i === id))
                    .map(([value, label]) => ({ value, label }))}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLayout(defaultLayout)}>
                <RotateCcw />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await mutate({
                      path: '/admin/layout',
                      method: 'PUT',
                      body: layout.map(({ i, x, y, w, h }) => ({
                        i,
                        x,
                        y: Number.isFinite(y) ? y : 100,
                        w,
                        h,
                      })),
                    }).unwrap();
                    toast.success('Workspace saved');
                  } catch {
                    toast.error('Could not save workspace');
                  }
                }}
              >
                Save layout
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="h-80 animate-pulse rounded-lg bg-muted" />
          ) : (
            <Grid
              layouts={{ lg: layout }}
              breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
              cols={{ lg: 12, md: 12, sm: 6, xs: 1 }}
              rowHeight={75}
              margin={[20, 20]}
              containerPadding={[0, 0]}
              draggableHandle=".drag-handle"
              onLayoutChange={(value) => setLayout(value)}
            >
              {layout.map((w) => (
                <div key={w.i} className="widget">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="mb-0 text-sm font-semibold">{titles[w.i]}</h2>
                    <div className="flex items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Remove ${titles[w.i]}`}
                        onClick={() => setLayout(layout.filter((l) => l.i !== w.i))}
                      >
                        <X className="size-3" />
                      </Button>
                      <GripVertical className="drag-handle size-4 cursor-grab text-muted-foreground" />
                    </div>
                  </div>
                  {w.i === 'revenue' ? (
                    a?.series?.length ? (
                      <ResponsiveContainer width="100%" height="75%">
                        <AreaChart data={a.series}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tickFormatter={(v) => `₹${Math.round(v / 100000)}k`}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip formatter={(v) => formatMoney(Number(v))} />
                          <Area dataKey="revenue" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )
                  ) : w.i === 'payment' ? (
                    <div className="space-y-5">
                      {a?.paymentSplit?.length ? (
                        a.paymentSplit.map((p: any) => (
                          <div key={p.paymentMethod}>
                            <div className="mb-2 flex justify-between text-xs">
                              <span>
                                {p.paymentMethod === 'COD' ? 'Cash on delivery' : 'WhatsApp'}
                              </span>
                              <strong>{p._count} orders</strong>
                            </div>
                            <div className="h-2 rounded bg-muted">
                              <div
                                className="h-2 rounded bg-primary"
                                style={{ width: `${(p._count / Math.max(a.orders, 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyChart />
                      )}
                    </div>
                  ) : w.i === 'products' ? (
                    a?.topProducts?.length ? (
                      <div className="space-y-4">
                        {a.topProducts.slice(0, 5).map((p: any, i: number) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between border-b pb-3 text-xs"
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-muted-foreground">0{i + 1}</span>
                              {p.name}
                            </span>
                            <span>
                              {p.quantity} sold · {formatMoney(p.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyChart />
                    )
                  ) : w.i === 'stock' ? (
                    <div className="space-y-4">
                      {a?.lowStock?.length ? (
                        a.lowStock.slice(0, 4).map((v: any) => (
                          <div key={v.id} className="flex justify-between gap-3 text-xs">
                            <span>
                              {v.product.name}
                              <span className="mt-1 block text-[10px] text-muted-foreground">
                                {v.sku}
                              </span>
                            </span>
                            <span className={v.stock ? 'text-amber-700' : 'text-red-600'}>
                              {v.stock} left
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                          <PackageStatus />
                          Stock is looking healthy.
                        </div>
                      )}
                    </div>
                  ) : w.i === 'category' ? (
                    a?.categorySales?.length ? (
                      <ResponsiveContainer width="100%" height="75%">
                        <BarChart data={a.categorySales}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v) => formatMoney(Number(v))} />
                          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )
                  ) : a?.topCities?.length ? (
                    <div className="space-y-5">
                      {a.topCities.slice(0, 5).map((c: any) => (
                        <div key={c.name} className="flex justify-between text-xs">
                          <span>{c.name}</span>
                          <span>{c.orders} orders</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              ))}
            </Grid>
          )}
        </>
      )}
      <p className="mt-5 text-[10px] text-muted-foreground">
        Revenue excludes cancelled and returned orders. COD and WhatsApp figures are order value,
        not payment settlement.
      </p>
    </>
  );
}
function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
      Your first orders will bring this chart to life.
    </div>
  );
}
function PackageStatus() {
  return <AlertTriangle className="mx-auto mb-4 size-5 text-green-600" />;
}
