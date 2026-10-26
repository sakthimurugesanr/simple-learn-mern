import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export function Footer() {
  return (
    <footer className="border-t bg-secondary/30">
      <div className="shell grid gap-10 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="text-3xl tracking-[.22em]">
            AUREL®
          </Link>
          <p className="mt-5 max-w-64 text-sm leading-6 text-muted-foreground">
            Considered essentials.
            <br />
            Made for your everyday.
          </p>
          <p className="eyebrow mt-7">Designed with intention. Worn with ease.</p>
        </div>
        {[
          {
            title: 'Explore',
            links: [
              ['Shop all', '/shop'],
              ['New arrivals', '/shop?sort=newest'],
              ['Our story', '/about'],
            ],
          },
          {
            title: 'Here to help',
            links: [
              ['My account', '/account'],
              ['Track your order', '/account'],
              ['Shipping & returns', '/policies/shipping'],
            ],
          },
          {
            title: 'The details',
            links: [
              ['Privacy policy', '/policies/privacy'],
              ['Terms of service', '/policies/terms'],
              ['Contact us', '/contact'],
            ],
          },
        ].map((g) => (
          <div key={g.title}>
            <h3 className="eyebrow mb-6">{g.title}</h3>
            <div className="grid gap-3 text-xs text-muted-foreground">
              {g.links.map(([name, href]) => (
                <Link
                  key={name}
                  href={href}
                  className="flex items-center gap-2 hover:text-foreground"
                >
                  {name}
                  <ArrowUpRight className="size-3" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="shell flex flex-wrap items-center justify-between gap-4 border-t py-6 text-[10px] text-muted-foreground">
        <span>© {new Date().getFullYear()} Aurel. Thoughtfully, always.</span>
        <span>
          India · INR ₹ <span className="ml-8">CASH ON DELIVERY AVAILABLE</span>
        </span>
      </div>
    </footer>
  );
}
