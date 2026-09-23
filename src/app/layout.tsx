import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Analytics from '@/components/Analytics';
import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';
import { siteUrl } from '@/lib/format';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'ModernStore — Digital products for developers', template: '%s · ModernStore' },
  description: 'Demo store: templates, UI kits, courses and ebooks. Purchases are simulated and never charged.',
  openGraph: { siteName: 'ModernStore', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
            Demo store — products, reviews and orders are simulated. No payment is ever charged.
          </p>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-gray-500">
            ModernStore is a portfolio project. <Link href="/products" className="underline">Browse the catalog</Link>
          </footer>
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
