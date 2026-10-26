'use client';
import dynamic from 'next/dynamic';
const Overview = dynamic(() => import('@/components/dashboard/overview').then((m) => m.Overview), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse bg-muted" />,
});
export default function Page() {
  return <Overview />;
}
