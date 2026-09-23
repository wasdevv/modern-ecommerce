import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { queryProducts } from '@/lib/store';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export default function HomePage() {
  const featured = queryProducts({ sort: 'featured', page: 1, pageSize: 8 }).items;
  const collage = queryProducts({ sort: 'rating', page: 1, pageSize: 4 }).items;

  return (
    <>
      {/* Dawn "Image with text" section */}
      <section className="page-width grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-20">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {collage.map((p, i) => (
            <div key={p.id} className="relative aspect-square bg-mist">
              <Image src={p.image} alt="" fill priority={i < 2} sizes="(min-width: 750px) 25vw, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
        <div className="md:max-w-md">
          <p className="caption">Templates, UI kits, cursos e e-books</p>
          <h1 className="mt-4 text-4xl md:text-[52px] md:leading-[1.15]">Menos tempo no boilerplate, mais tempo no produto.</h1>
          <p className="mt-5">Material feito por devs para devs: código que você abre e usa, cursos com projeto final e livros curtos que vão direto ao ponto.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn">
              Ver catálogo
            </Link>
            <Link href="/products?category=courses" className="btn-outline">
              Ver cursos
            </Link>
          </div>
        </div>
      </section>

      {/* Dawn "Featured collection" section */}
      <section className="page-width py-12 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl md:text-[32px]">Mais vendidos</h2>
          <Link href="/products" className="link text-sm">
            Ver tudo
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Dawn "Collection list" section */}
      <section className="page-width py-12 md:py-16">
        <h2 className="text-2xl md:text-[32px]">Categorias</h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {CATEGORIES.map((c) => (
            <li key={c} className="group relative">
              <div className="relative aspect-square overflow-hidden bg-mist">
                <Image src={`/images/categories/${c}.svg`} alt="" fill sizes="(min-width: 750px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <h3 className="mt-4 text-lg">
                <Link href={`/products?category=${c}`} className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-[0.3rem]">
                  {CATEGORY_LABELS[c]} <span aria-hidden>→</span>
                </Link>
              </h3>
            </li>
          ))}
        </ul>
      </section>

      {/* Dawn "Rich text" section */}
      <section className="bg-mist">
        <div className="page-width py-16 text-center md:py-24">
          <h2 className="mx-auto max-w-2xl text-3xl md:text-[40px]">Comprou, baixou, usou.</h2>
          <p className="mx-auto mt-5 max-w-xl">
            Todo produto é digital: nada de frete, nada de espera. Nesta demo o checkout é simulado, então dá para testar o fluxo inteiro sem cartão.
          </p>
          <Link href="/products" className="btn mt-8">
            Começar a comprar
          </Link>
        </div>
      </section>
    </>
  );
}
