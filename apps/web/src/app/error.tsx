'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="shell py-24 text-center">
      <h1 className="section-heading">A little pause.</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong loading this page. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
