'use client';

import { MinusIcon, PlusIcon } from './Icons';
import { MAX_QUANTITY } from '@/lib/limits';

// Dawn's quantity selector: a bordered box with − / + buttons around the number.
export default function QuantityInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const set = (n: number) => onChange(Math.min(MAX_QUANTITY, Math.max(1, n || 1)));
  return (
    <div className="inline-flex h-[45px] w-[140px] items-stretch text-ink shadow-[0_0_0_1px_rgba(18,18,18,0.55)]">
      <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="flex w-11 items-center justify-center disabled:opacity-30" aria-label={`Diminuir quantidade de ${label}`}>
        <MinusIcon />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-label={`Quantidade de ${label}`}
        className="w-full min-w-0 bg-transparent text-center text-[15px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= MAX_QUANTITY} className="flex w-11 items-center justify-center disabled:opacity-30" aria-label={`Aumentar quantidade de ${label}`}>
        <PlusIcon />
      </button>
    </div>
  );
}
