const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatBRL = (cents: number) => brl.format(cents / 100);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Sao_Paulo' });

export const siteUrl = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const formatRating = (rating: number) => rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
