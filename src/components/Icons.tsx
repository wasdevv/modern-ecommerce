// Stroke icons in the weight Dawn uses. Decorative: callers provide the accessible name.
type P = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true } as const;

export const BagIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 8h14l-1 13H6L5 8z" strokeLinejoin="round" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
export const SearchIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" strokeLinecap="round" />
  </svg>
);
export const MenuIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
  </svg>
);
export const CloseIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
  </svg>
);
export const MinusIcon = ({ className = 'h-3 w-3' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}>
    <path d="M4 12h16" strokeLinecap="round" />
  </svg>
);
export const PlusIcon = ({ className = 'h-3 w-3' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}>
    <path d="M4 12h16M12 4v16" strokeLinecap="round" />
  </svg>
);
export const TrashIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinejoin="round" />
  </svg>
);
export const CheckIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}>
    <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ChevronIcon = ({ className = 'h-3 w-3' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}>
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
