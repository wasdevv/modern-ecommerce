import Link from 'next/link';
import { BagIcon } from '@/components/Icons';

// Checkout and the thank-you page drop the store navigation, like a hosted checkout does.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[14px] tracking-normal text-[#333] [&_h1]:tracking-normal [&_h2]:tracking-normal">
      <header className="border-b border-checkout-line">
        {/* Same column split as CheckoutShell, so the logo lines up with the form and the bag with the summary. */}
        <div className="flex h-[72px] items-center justify-between px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:px-0">
          <div className="lg:flex lg:justify-end lg:pr-16">
            <Link href="/" className="block w-full max-w-[560px] text-2xl tracking-dawn text-ink">
              ModernStore
            </Link>
          </div>
          <div className="lg:px-10">
            <Link href="/cart" className="flex max-w-[460px] justify-end text-checkout" aria-label="Voltar ao carrinho">
              <BagIcon />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
