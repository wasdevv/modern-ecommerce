import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <Link href="/products" className="mt-6 inline-block underline">
        Voltar ao catálogo
      </Link>
    </div>
  );
}
