import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Analytics from '@/components/Analytics';
import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';
import { siteUrl } from '@/lib/format';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'ModernStore — Produtos digitais para devs', template: '%s · ModernStore' },
  description: 'Loja demo: templates, UI kits, cursos e e-books. As compras são simuladas e nunca cobradas.',
  openGraph: { siteName: 'ModernStore', type: 'website', locale: 'pt_BR' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
            Loja demo — produtos, avaliações e pedidos são simulados. Nenhum pagamento é cobrado.
          </p>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-gray-500">
            ModernStore é um projeto de portfólio. <Link href="/products" className="underline">Ver o catálogo</Link>
          </footer>
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
