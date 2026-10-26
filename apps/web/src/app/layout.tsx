import type { Metadata } from 'next';
import { headers } from 'next/headers';
import localFont from 'next/font/local';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import './globals.css';
const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  display: 'swap',
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'AUREL — Considered essentials. Made for your everyday.',
    template: '%s | AUREL',
  },
  description:
    'Thoughtfully made dresses and everyday essentials. Discover relaxed silhouettes, natural fabrics and a little more you.',
  openGraph: { type: 'website', locale: 'en_IN', siteName: 'AUREL' },
  twitter: { card: 'summary_large_image' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers nonce={nonce}>
          <a
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4"
            href="#main"
          >
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
