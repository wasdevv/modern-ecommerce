import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="page-width flex-1 py-24 text-center">
        <p className="caption">404</p>
        <h1 className="mt-3 text-4xl md:text-5xl">Página não encontrada</h1>
        <Link href="/products" className="btn mt-10">
          Continuar comprando
        </Link>
      </main>
      <Footer />
    </>
  );
}
