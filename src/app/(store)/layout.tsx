import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="border-b border-ink/10 px-6 py-2.5 text-center text-[13px] tracking-label text-ink">
        <span className="md:hidden">Loja demo — nada é cobrado</span>
        <span className="hidden md:inline">Loja demo — produtos, avaliações e pedidos são simulados. Nenhum pagamento é cobrado.</span>
      </p>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
