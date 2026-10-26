import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return (
    <div className="shell py-28 text-center">
      <p className="eyebrow text-muted-foreground">404 · A LITTLE OFF THE PATH</p>
      <h1 className="section-heading">Let’s find your way back.</h1>
      <p className="mb-8 text-sm text-muted-foreground">This page seems to have wandered off.</p>
      <Button asChild>
        <Link href="/shop">Explore the collection</Link>
      </Button>
    </div>
  );
}
