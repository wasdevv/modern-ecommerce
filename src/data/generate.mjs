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
    tones: ['#34506b', '#2f5d5a', '#5b4a6e'],
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
    tones: ['#4a4e69', '#6d5a4b', '#355c4a'],
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
    tones: ['#1f3a3d', '#3b3355', '#4a3a2a'],
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
    tones: ['#8c3b2e', '#1f4e5f', '#6b5d2f', '#2e3b55'],
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

// Covers are flat illustrations on a neutral backdrop, like product photos on a studio background.
const escapeXml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(text, max) {
  const lines = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last && (last + ' ' + word).length <= max) lines[lines.length - 1] = last + ' ' + word;
    else lines.push(word);
  }
  return lines;
}
const textLines = (lines, { x, y, size, weight = 600, fill = '#121212', gap = 1.2 }) =>
  lines
    .map((l, i) => `<text x="${x}" y="${y + i * size * gap}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(l)}</text>`)
    .join('');

const art = {
  templates: (t) => `<rect x="118" y="150" width="564" height="400" rx="18" fill="#121212" opacity=".07" transform="translate(0 14)"/>
<rect x="118" y="150" width="564" height="400" rx="18" fill="#fff"/>
<path d="M118 168a18 18 0 0 1 18-18h528a18 18 0 0 1 18 18v28H118z" fill="${t}" opacity=".12"/>
<circle cx="146" cy="173" r="7" fill="${t}" opacity=".45"/><circle cx="170" cy="173" r="7" fill="${t}" opacity=".3"/><circle cx="194" cy="173" r="7" fill="${t}" opacity=".2"/>
<rect x="142" y="222" width="104" height="304" rx="8" fill="${t}" opacity=".12"/>
<rect x="266" y="222" width="392" height="124" rx="10" fill="${t}"/>
<rect x="266" y="366" width="120" height="160" rx="10" fill="${t}" opacity=".22"/><rect x="402" y="366" width="120" height="160" rx="10" fill="${t}" opacity=".22"/><rect x="538" y="366" width="120" height="160" rx="10" fill="${t}" opacity=".22"/>`,
  'ui-kits': (t) =>
    [0, 1, 2]
      .flatMap((r) => [0, 1, 2].map((c) => [c, r]))
      .map(([c, r], i) => {
        const x = 130 + c * 186, y = 130 + r * 146;
        const inner = [
          `<rect x="${x + 30}" y="${y + 48}" width="110" height="34" rx="17" fill="${t}"/>`,
          `<rect x="${x + 44}" y="${y + 44}" width="82" height="42" rx="21" fill="${t}" opacity=".25"/><circle cx="${x + 105}" cy="${y + 65}" r="16" fill="${t}"/>`,
          `<rect x="${x + 28}" y="${y + 36}" width="114" height="14" rx="7" fill="${t}" opacity=".5"/><rect x="${x + 28}" y="${y + 62}" width="80" height="14" rx="7" fill="${t}" opacity=".25"/>`,
        ][i % 3];
        return `<rect x="${x}" y="${y}" width="170" height="130" rx="14" fill="#fff"/>${inner}`;
      })
      .join(''),
  courses: (t) => `<rect x="100" y="150" width="600" height="360" rx="16" fill="${t}"/>
<circle cx="400" cy="315" r="56" fill="#fff" opacity=".95"/><path d="M386 290l42 25-42 25z" fill="${t}"/>
<rect x="136" y="468" width="528" height="8" rx="4" fill="#fff" opacity=".25"/><rect x="136" y="468" width="190" height="8" rx="4" fill="#fff"/>`,
  ebooks: (t, name) => `<ellipse cx="400" cy="650" rx="190" ry="18" fill="#121212" opacity=".08"/>
<rect x="240" y="120" width="320" height="520" rx="6" fill="${t}"/>
<rect x="240" y="120" width="22" height="520" fill="#121212" opacity=".18"/>
<rect x="296" y="190" width="208" height="3" fill="#fff" opacity=".6"/>
${textLines(wrap(name, 13), { x: 411, y: 270, size: 38, fill: '#fff' })}
<text x="411" y="590" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="20" letter-spacing="5" fill="#fff" opacity=".75">E-BOOK</text>`,
};

function svg(category, name, index, withCaption = true) {
  const cfg = catalog[category];
  const tone = cfg.tones[index % cfg.tones.length];
  const caption = category === 'ebooks' || !withCaption ? '' : textLines(wrap(name, 26).slice(0, 2), { x: 400, y: 640, size: 36 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<rect width="800" height="800" fill="#f3f3f1"/>
${art[category](tone, name)}
${caption}
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
products.forEach((p, i) => writeFileSync(join(imagesDir, `${p.id}.svg`), svg(p.category, p.name, i)));
const categoryNames = { templates: 'Templates', 'ui-kits': 'UI Kits', courses: 'Cursos', ebooks: 'E-books' };
mkdirSync(join(imagesDir, '../categories'), { recursive: true });
Object.keys(catalog).forEach((c, i) => writeFileSync(join(imagesDir, `../categories/${c}.svg`), svg(c, categoryNames[c], i + 1, false)));
console.log(`${products.length} products, ${customers.length} customers, ${orders.length} orders`);
