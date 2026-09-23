'use client';

import { ChevronIcon } from './Icons';

// Dawn applies filters as soon as a value changes; the form's submit button stays for no-JS.
export default function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex items-center">
      <select
        {...props}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="cursor-pointer appearance-none bg-transparent py-2 pl-1 pr-6 text-sm text-ink underline-offset-4 hover:underline focus-visible:underline"
      />
      <ChevronIcon className="pointer-events-none absolute right-1 h-3 w-3 text-ink" />
    </span>
  );
}
