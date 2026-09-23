import { ChevronIcon } from './Icons';
import { formatBRL } from '@/lib/format';

// Two halves: white form column, grey summary column that bleeds to the right edge.
// On mobile the summary collapses into a toggle bar above the form.
export default function CheckoutShell({ summary, totalCents, children }: { summary: React.ReactNode; totalCents: number; children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-[calc(100vh-73px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <details className="group border-b border-checkout-line bg-checkout-panel lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-checkout [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span className="group-open:hidden">Mostrar resumo do pedido</span>
            <span className="hidden group-open:inline">Ocultar resumo do pedido</span>
            <ChevronIcon className="h-3 w-3 transition-transform group-open:rotate-180" />
          </span>
          <span className="text-[17px] font-semibold text-[#333]">{formatBRL(totalCents)}</span>
        </summary>
        <div className="px-5 pb-6">{summary}</div>
      </details>
      <div className="px-5 py-8 lg:flex lg:justify-end lg:py-10 lg:pr-16">
        <div className="mx-auto w-full max-w-[560px] lg:mx-0">{children}</div>
      </div>
      <aside className="hidden border-l border-checkout-line bg-checkout-panel lg:block">
        <div className="sticky top-0 max-w-[460px] px-10 py-10">{summary}</div>
      </aside>
    </div>
  );
}
