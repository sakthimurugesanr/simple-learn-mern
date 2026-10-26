'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Package,
  Layers,
  Image as ImageIcon,
  Tags,
  ShoppingBag,
  Users,
  ScrollText,
  Settings,
  ArrowUpRight,
  Search,
  Menu,
  ChevronRight,
  PanelLeftClose,
} from 'lucide-react';
import { can } from '@aurel/shared';
import { useAppSelector } from '@/lib/store';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
import { ThemeToggle } from '../header';
const modules = [
  { name: 'Overview', path: '', icon: LayoutDashboard, admin: true, permission: 'analytics:read' },
  { name: 'Products', path: '/products', icon: Package, permission: 'product:read' },
  {
    name: 'Categories & fields',
    path: '/categories',
    icon: Layers,
    admin: true,
    permission: 'category:read',
  },
  {
    name: 'Banners & collections',
    path: '/content',
    icon: ImageIcon,
    admin: true,
    permission: 'banner:read',
  },
  { name: 'Offers', path: '/offers', icon: Tags, admin: true, permission: 'offer:read' },
  { name: 'Orders', path: '/orders', icon: ShoppingBag, permission: 'order:read' },
  {
    name: 'People & permissions',
    path: '/users',
    icon: Users,
    admin: true,
    permission: 'user:read',
  },
  { name: 'Audit trail', path: '/audit', icon: ScrollText, admin: true, permission: 'audit:read' },
  {
    name: 'Store settings',
    path: '/settings',
    icon: Settings,
    admin: true,
    permission: 'settings:read',
  },
];
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAppSelector((s) => s.auth);
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  if (!ready) return <div className="shell py-20">Opening your workspace…</div>;
  if (!user)
    return (
      <div className="shell py-20 text-center">
        <h1 className="section-heading">Your workspace awaits.</h1>
        <Button asChild>
          <Link href="/auth/login?next=/dashboard">Sign in</Link>
        </Button>
      </div>
    );
  if (user.role === 'USER')
    return (
      <div className="shell py-20">
        <h1 className="section-heading">Store team access required.</h1>
        <Link href="/account">Back to your account</Link>
      </div>
    );
  const allowed = modules.filter(
    (m) => (!m.admin || user.role === 'ADMIN') && can(user.role, user.overrides, m.permission),
  );
  const current = modules.find((m) => `/dashboard${m.path}` === path);
  const nav = (
    <nav className="space-y-2">
      {allowed.map((m) => (
        <Link
          key={m.path}
          href={`/dashboard${m.path}`}
          className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-[13px] ${path === `/dashboard${m.path}` ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          title={m.name}
        >
          <m.icon className="size-4 shrink-0" />
          {!collapsed && m.name}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="dashboard flex min-h-screen bg-background text-foreground">
      <aside
        className={`no-print sticky top-[88px] hidden h-[calc(100vh-88px)] shrink-0 border-r bg-background p-5 lg:block ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="mb-9 flex items-center justify-between">
          <span className={`text-xs font-semibold ${collapsed ? 'sr-only' : ''}`}>
            AUREL{' '}
            <span className="ml-2 rounded bg-secondary px-2 py-1 text-[9px] text-primary">
              STUDIO
            </span>
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            <PanelLeftClose />
          </Button>
        </div>
        {nav}
        <div className="absolute inset-x-5 bottom-6 border-t pt-5">
          <Link href="/" className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpRight className="size-4" />
            {!collapsed && 'View storefront'}
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="no-print flex h-20 items-center justify-between gap-4 border-b px-6 md:px-9">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Dashboard menu"
                >
                  <Menu />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Workspace</DialogTitle>
                <DialogDescription>Store management</DialogDescription>
                {nav}
              </DialogContent>
            </Dialog>
            <span>Workspace</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{current?.name ?? 'Overview'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden w-56 justify-start text-muted-foreground sm:flex"
                >
                  <Search />
                  Go to… <kbd className="ml-auto text-[10px]">⌘ K</kbd>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle className="sr-only">Command menu</DialogTitle>
                <DialogDescription className="sr-only">Search dashboard modules</DialogDescription>
                <Command>
                  <Command.Input
                    placeholder="Find a module…"
                    className="h-12 w-full border-b bg-background outline-none"
                  />
                  <Command.List>
                    <Command.Empty className="p-4 text-sm">No results.</Command.Empty>
                    {allowed.map((m) => (
                      <Command.Item
                        key={m.path}
                        onSelect={() => {
                          window.location.href = `/dashboard${m.path}`;
                        }}
                        className="flex cursor-pointer items-center gap-3 p-4 text-sm data-[selected=true]:bg-muted"
                      >
                        <m.icon className="size-4" />
                        {m.name}
                      </Command.Item>
                    ))}
                  </Command.List>
                </Command>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="p-5 md:p-9">{children}</div>
      </div>
    </div>
  );
}
