// Deterministic generator for the demo dataset. Same seed → byte-identical JSON.
// Run with `npm run seed`; it rewrites src/data/*.json and public/images/products/*.svg.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = 20260601;
const PERIOD_START = Date.UTC(2026, 5, 1); // 2026-06-01
const PERIOD_END = Date.UTC(2026, 8, 1); // exclusive: orders run through 2026-08-31
const ORDER_COUNT = 240;
const CUSTOMER_COUNT = 120;
// Declared, not measured: the storefront has no real traffic. Conversion = orders / sessions.
const SIMULATED_SESSIONS = 8420;
const TAX_RATE = 0.18;
const DAY = 86_400_000;

const here = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(here, '../../public/images/products');

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
function weighted(entries) {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries.at(-1)[0];
}

const catalog = {
  templates: {
    prefix: 'TMPL',
    color: ['#2563eb', '#1e3a8a'],
    price: [6990, 24990],
    blurb: 'Template Next.js + Tailwind pronto para produção, com TypeScript, dark mode e componentes documentados.',
    names: [
      'SaaS Dashboard Template', 'Startup Landing Page', 'Admin Panel Pro', 'Developer Portfolio',
      'Documentation Site Starter', 'Analytics Dashboard', 'Agency Website Template', 'Blog Starter Kit',
      'Booking App Template', 'CRM Dashboard', 'Changelog & Roadmap Site', 'Invoice App Template',
      'Status Page Template',
    ],
  },
  'ui-kits': {
    prefix: 'UI',
    color: ['#7c3aed', '#4c1d95'],
    price: [4990, 17990],
    blurb: 'Arquivo Figma e componentes React, com design tokens e testados com teclado e leitor de tela.',
    names: [
      'E-commerce UI Kit', 'Mobile Banking UI Kit', 'Dashboard Components Kit', 'Form Patterns Kit',
      'Marketing Sections Kit', 'Data Table Kit', 'Chat Interface Kit', 'Onboarding Flows Kit',
      'Icon Set — 1,200 icons', 'Charts & Graphs Kit', 'Settings Screens Kit', 'Pricing Pages Kit',
      'Email Templates Kit',
    ],
  },
  courses: {
    prefix: 'CRS',
    color: ['#059669', '#064e3b'],
    price: [14990, 39990],
    blurb: 'Curso em vídeo com código-fonte de cada aula e um projeto final para o seu portfólio.',
    names: [
      'Next.js App Router in Depth', 'TypeScript for React Developers', 'Testing React Applications',
      'Web Performance Fundamentals', 'Accessible Components Workshop', 'Node.js APIs from Scratch',
      'PostgreSQL for Application Developers', 'Tailwind CSS Design Systems', 'GraphQL in Practice',
      'Git Beyond the Basics', 'Docker for Web Developers', 'Product Analytics with GA4',
      'Stripe Payments Integration',
    ],
  },
  ebooks: {
    prefix: 'EBK',
    color: ['#ea580c', '#7c2d12'],
    price: [1990, 5990],
    blurb: 'E-book em PDF e EPUB com exemplos executáveis e atualizações grátis na versão atual.',
    names: [
      'TypeScript Advanced Patterns', 'Core Web Vitals Handbook', 'CSS Layout Field Guide',
      'Clean React Architecture', 'SQL Query Cookbook', 'REST API Design Notes', 'JavaScript Async Deep Dive',
      'Technical SEO for Developers', 'Refactoring Frontend Code', 'Monorepos with Turborepo',
      'Security Checklist for Web Apps', 'Regex Pocket Reference', 'The Code Review Book',
    ],
  },
};

const products = [];
const popularity = new Map();
for (const [category, cfg] of Object.entries(catalog)) {
  cfg.names.forEach((name, i) => {
    const id = `prod_${String(products.length + 1).padStart(3, '0')}`;
    // Prices end in 90, like a real price list.
    const priceCents = Math.round(int(cfg.price[0], cfg.price[1]) / 1000) * 1000 - 10;
    const onSale = rand() < 0.4;
    const reviewCount = int(4, 260);
    products.push({
      id,
      name,
      description: `${name}. ${cfg.blurb}`,
      priceCents,
      ...(onSale && { originalPriceCents: Math.round((priceCents * (1.3 + rand() * 0.4)) / 1000) * 1000 - 10 }),
      category,
      image: `/images/products/${id}.svg`,
      rating: Math.round((3.9 + rand() * 1.1) * 10) / 10,
      reviewCount,
      // Two courses closed enrollment: they have sales history but can't be bought now.
      inStock: !(category === 'courses' && (i === 8 || i === 11)),
      sku: `${cfg.prefix}-${String(i + 1).padStart(3, '0')}`,
      createdAt: new Date(Date.UTC(2025, int(0, 11), int(1, 28))).toISOString().slice(0, 10),
    });
    // Sales roughly track review count, with noise, so best sellers look earned.
    popularity.set(id, reviewCount * (0.5 + rand()) + 10);
  });
}

const firstNames = [
  'Ana', 'Bruno', 'Camila', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
  'Larissa', 'Lucas', 'Mariana', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Thiago',
  'Vitória', 'Yuri', 'Beatriz', 'Caio',
];
const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Araújo',
];
const ascii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const customers = [];
const usedNames = new Set();
while (customers.length < CUSTOMER_COUNT) {
  const name = `${pick(firstNames)} ${pick(lastNames)}`;
  if (usedNames.has(name)) continue;
  usedNames.add(name);
  const [first, last] = name.split(' ').map(ascii);
  customers.push({ id: `cus_${String(customers.length + 1).padStart(3, '0')}`, name, email: `${first}.${last}@example.com`, createdAt: '' });
}
// A minority of customers buys repeatedly.
const customerWeights = customers.map((c) => [c, rand() < 0.2 ? 5 : 1]);
const productWeights = products.map((p) => [p, popularity.get(p.id)]);

function orderTimestamp() {
  for (;;) {
    const t = PERIOD_START + rand() * (PERIOD_END - PERIOD_START);
    const date = new Date(t);
    const growth = 0.7 + (0.6 * (t - PERIOD_START)) / (PERIOD_END - PERIOD_START); // sales grow over the quarter
    const weekday = [0.6, 1, 1, 1, 1, 0.9, 0.65][date.getUTCDay()];
    const hourBrt = (date.getUTCHours() + 21) % 24; // UTC-3
    const hour = hourBrt < 7 ? 0.15 : hourBrt < 9 ? 0.6 : hourBrt < 23 ? 1 : 0.4;
    if (rand() < (growth * weekday * hour) / 1.3) return date;
  }
}

const orders = [];
for (let n = 0; n < ORDER_COUNT; n++) {
  const date = orderTimestamp();
  const customer = weighted(customerWeights);
  const lineCount = weighted([[1, 70], [2, 22], [3, 8]]);
  const chosen = new Set();
  while (chosen.size < lineCount) chosen.add(weighted(productWeights));
  const items = [...chosen].map((p) => {
    const quantity = rand() < 0.05 ? 2 : 1; // team licenses
    return { productId: p.id, productName: p.name, quantity, unitPriceCents: p.priceCents, totalCents: p.priceCents * quantity };
  });
  const subtotalCents = items.reduce((sum, i) => sum + i.totalCents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const paymentMethod = weighted([['pix', 45], ['card', 40], ['boleto', 15]]);
  const ageDays = (PERIOD_END - date.getTime()) / DAY;
  const status = rand() < 0.03 ? 'refunded' : paymentMethod === 'boleto' && ageDays < 3 ? 'pending' : 'completed';
  orders.push({
    id: '',
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    items,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    status,
    paymentMethod,
    createdAt: date.toISOString().replace(/\.\d+Z$/, 'Z'),
  });
}
orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
orders.forEach((o, i) => (o.id = `ord_${String(i + 1).padStart(4, '0')}`));

// Customers sign up shortly before their first order; the rest signed up at some point in the period.
for (const c of customers) {
  const first = orders.find((o) => o.customerId === c.id);
  const t = first ? new Date(first.createdAt).getTime() - rand() * 20 * DAY : PERIOD_START + rand() * (PERIOD_END - PERIOD_START);
  c.createdAt = new Date(t).toISOString().slice(0, 10);
}

function svg(product) {
  const [from, to] = catalog[product.category].color;
  const words = product.name.replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean);
  const initials = (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
  const label = { templates: 'TEMPLATE', 'ui-kits': 'UI KIT', courses: 'CURSO', ebooks: 'E-BOOK' }[product.category];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="680" cy="110" r="190" fill="#fff" opacity=".07"/><circle cx="90" cy="560" r="150" fill="#fff" opacity=".06"/>
<text x="400" y="330" text-anchor="middle" font-family="system-ui,sans-serif" font-size="200" font-weight="700" fill="#fff">${initials}</text>
<text x="400" y="430" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" letter-spacing="6" fill="#fff" opacity=".8">${label}</text>
</svg>
`;
}

const write = (file, data) => writeFileSync(join(here, file), JSON.stringify(data, null, 2) + '\n');
write('products.json', products);
write('customers.json', customers);
write('orders.json', orders);
write('meta.json', {
  seed: SEED,
  periodStart: new Date(PERIOD_START).toISOString().slice(0, 10),
  periodEnd: new Date(PERIOD_END - DAY).toISOString().slice(0, 10),
  simulatedSessions: SIMULATED_SESSIONS,
});
mkdirSync(imagesDir, { recursive: true });
for (const p of products) writeFileSync(join(imagesDir, `${p.id}.svg`), svg(p));
console.log(`${products.length} products, ${customers.length} customers, ${orders.length} orders`);
