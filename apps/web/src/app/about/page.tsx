import Link from 'next/link';
import { Button } from '@/components/ui/button';
export const metadata = { title: 'Our story' };
export default function Page() {
  return (
    <div className="shell max-w-3xl py-24">
      <p className="eyebrow mb-8 text-muted-foreground">A LITTLE ABOUT AUREL</p>
      <h1 className="font-editorial mb-10 text-6xl leading-tight">
        Less ordinary.
        <br />
        More you.
      </h1>
      <p className="text-lg leading-9 text-muted-foreground">
        Aurel is a space for considered essentials. For easy silhouettes, natural textures, and the
        everyday pieces that become part of your story.
      </p>
      <p className="mb-10 text-sm leading-8 text-muted-foreground">
        Our collection brings together uncomplicated design and a thoughtful point of view. From
        your wardrobe to your workspace, discover things you will want to reach for again.
      </p>
      <Button asChild>
        <Link href="/shop">Find your everyday</Link>
      </Button>
    </div>
  );
}
