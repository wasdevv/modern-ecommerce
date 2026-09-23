import type { Metadata } from 'next';
import { Assistant } from 'next/font/google';
import './globals.css';
import Analytics from '@/components/Analytics';
import { CartProvider } from '@/components/CartProvider';
import { siteUrl } from '@/lib/format';

// Assistant is the typeface of Shopify's Dawn theme; next/font self-hosts it at build time.
const assistant = Assistant({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-assistant', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'ModernStore — Produtos digitais para devs', template: '%s · ModernStore' },
  description: 'Loja demo: templates, UI kits, cursos e e-books. As compras são simuladas e nunca cobradas.',
  openGraph: { siteName: 'ModernStore', type: 'website', locale: 'pt_BR' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={assistant.variable}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">
          Pular para o conteúdo
        </a>
        <CartProvider>
          {children}
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
