# ModernStore: o que foi desenvolvido

Este documento registra o que existe no projeto, como cada parte funciona, as decisões tomadas (e por quê), o que foi verificado e o que ficou de fora. O README cobre o essencial para rodar. Aqui está o detalhe.

- Repositório: https://github.com/wasdevv/modern-ecommerce (público)
- Stack: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3, Postgres 16
- Idioma da interface: português do Brasil. Preços em BRL.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Como rodar](#2-como-rodar)
3. [Estrutura de pastas](#3-estrutura-de-pastas)
4. [Loja (storefront)](#4-loja-storefront)
5. [Carrinho](#5-carrinho)
6. [Checkout](#6-checkout)
7. [Pagamentos (Pix e cartão)](#7-pagamentos-pix-e-cartão)
8. [Página do pedido](#8-página-do-pedido)
9. [Admin](#9-admin)
10. [Analytics (GA4 / GTM)](#10-analytics-ga4--gtm)
11. [Email de confirmação](#11-email-de-confirmação)
12. [SEO](#12-seo)
13. [Design (estilo Shopify / Dawn)](#13-design-estilo-shopify--dawn)
14. [Dados de demonstração](#14-dados-de-demonstração)
15. [Banco de dados](#15-banco-de-dados)
16. [Referência da API](#16-referência-da-api)
17. [Variáveis de ambiente](#17-variáveis-de-ambiente)
18. [Testes](#18-testes)
19. [Verificação feita](#19-verificação-feita)
20. [Decisões e divergências do guia original](#20-decisões-e-divergências-do-guia-original)
21. [Limitações conhecidas](#21-limitações-conhecidas)
22. [Próximos passos sugeridos](#22-próximos-passos-sugeridos)
23. [Histórico](#23-histórico)

---

## 1. Visão geral

ModernStore é uma loja de produtos digitais para desenvolvedores: templates, UI kits, cursos e e-books. É um projeto de portfólio, e o objetivo é mostrar como uma loja deve ser montada por dentro, não só por fora:

- **O servidor calcula o preço.** O navegador envia apenas ids de produto e quantidades. Nome, preço, imposto e total vêm do catálogo no servidor.
- **O pagamento passa por uma interface de gateway.** Hoje ela tem uma implementação sandbox, com Pix e cartão, que nunca cobra nada.
- **Pedidos e pagamentos ficam no Postgres**, com uma máquina de estados aplicada em um único lugar e protegida por lock de linha e índice único.
- **O Pix é confirmado por webhook assinado**, idempotente e com conferência de valor.
- **O número do cartão é tokenizado** antes de chegar à API de pedidos.
- **O GA4/GTM só carrega depois do consentimento**, e cada evento sai por um único caminho.
- **O admin usa cookie assinado HttpOnly**, nunca uma flag no `localStorage`.
- **O painel do admin reconcilia com os pedidos**, porque os números são derivados deles.

O que é simulado fica dito de forma explícita, na interface e no README: catálogo, avaliações, histórico de pedidos e o próprio gateway.

---

## 2. Como rodar

Pré-requisitos: Node 18+ (testado com 22), Docker.

```bash
npm ci
docker compose up -d                  # Postgres 16 em localhost:5434
cp .env.example .env.local            # DATABASE_URL já vem apontando para o compose
npm run db:migrate                    # aplica db/schema.sql (idempotente)
npm run dev                           # http://localhost:3000
```

Build de produção:

```bash
npm run build && npm start            # exige SANDBOX_SECRET em .env.local
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes unitários (17) |
| `npm run test:db` | Testes de integração de pagamento contra o Postgres (7) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run db:migrate` | Aplica o schema |
| `npm run seed` | Regenera os JSON de dados e as capas SVG (determinístico) |

### Como testar o Pix

1. Adicione um produto ao carrinho e clique em **Finalizar compra**.
2. Preencha email e nome, deixe **Pix** selecionado e clique em **Gerar Pix**.
3. Na página do pedido aparecem o QR code, o copia e cola e a contagem de 30 minutos.
4. Clique em **Simular pagamento do Pix**. O pedido vira **Pago**. Se o pedido estiver aberto em outra aba, ela atualiza sozinha em até 3 segundos.

Para testar a expiração sem esperar:

```bash
docker exec modern-ecommerce-db psql -U modernstore -c \
  "UPDATE payments SET expires_at = now() WHERE status = 'pending' AND method = 'pix'"
```

### Como testar o cartão

Escolha **Cartão de crédito** e clique num dos cartões de teste listados no checkout, que ele preenche os campos.

| Cartão | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Aprovado (Visa) |
| `5555 5555 5555 4444` | Aprovado (Mastercard) |
| `4000 0000 0000 0002` | Recusado pelo banco |
| `4000 0000 0000 9995` | Saldo insuficiente |

Qualquer validade futura e qualquer CVV funcionam. Um cartão real é recusado antes de qualquer pedido ser criado.

### Admin

Pelo link **Admin** no rodapé, ou direto em `/admin`. A senha é a definida em `ADMIN_PASSWORD`.

---

## 3. Estrutura de pastas

```
db/schema.sql                      Schema do Postgres (idempotente)
docker-compose.yml                 Postgres 16 local (porta 5434)
scripts/migrate.mjs                Aplica o schema
public/images/products/*.svg       Capas dos 52 produtos (geradas)
public/images/categories/*.svg     Capas das 4 categorias (geradas)

src/app/
  layout.tsx                       Raiz: fonte, CartProvider, consentimento de analytics
  (store)/                         Páginas com header e rodapé da loja
    page.tsx                       Home
    products/page.tsx              Catálogo (filtro, ordenação, paginação)
    products/[id]/page.tsx         Produto (SSG, metadata, JSON-LD)
    cart/page.tsx                  Carrinho
    admin/…                        Painel e pedidos (protegidos)
  (checkout)/                      Layout de checkout, sem a navegação da loja
    checkout/page.tsx              Checkout (Pix / cartão)
    order/[id]/page.tsx            Pedido: Pix pendente, confirmação, nova tentativa
  api/…                            Rotas HTTP (ver seção 16)
  sitemap.ts, robots.ts, not-found.tsx, icon.svg

src/components/                    Componentes de UI (header, card, carrinho, checkout…)
src/data/                          Dados de demonstração + gerador determinístico
src/lib/
  catalog.ts                       Produtos (seguro para o cliente)
  store.ts                         Consulta de catálogo, precificação do pedido, analytics
  limits.ts                        Limites e imposto compartilhados entre cliente e servidor
  db.ts                            Pool do Postgres
  admin-auth.ts                    Sessão do admin (HMAC)
  email.ts                         Email via Resend
  tracking.ts                      Eventos GA4/GTM
  purchase.ts                      Controle do evento purchase no navegador
  payments/
    types.ts                       Interface PaymentProvider
    sandbox.ts                     Gateway sandbox (tokenização, Pix, webhook)
    brcode.ts                      Payload Pix (BR Code) + CRC16
    service.ts                     Pedidos, pagamentos, máquina de estados, webhook
    test-cards.ts, labels.ts       Cartões de teste e mensagens de recusa
```

---

## 4. Loja (storefront)

### Home

A home tem quatro seções, no padrão do tema Dawn:

- **Imagem com texto:** colagem 2×2 de capas, título, texto e dois botões.
- **Mais vendidos:** 8 produtos, ordenados por volume de avaliações.
- **Categorias:** 4 cards de coleção.
- **Rich text:** faixa com chamada para comprar.

### Catálogo (`/products`)

- Busca, categoria, ordenação e página ficam na URL (`?search=&category=&sort=&page=`). O filtro é um formulário GET comum, então funciona sem JavaScript e todo resultado pode ser compartilhado.
- Com JavaScript, trocar categoria ou ordenação aplica na hora (`AutoSubmitSelect`). Sem JavaScript, aparece um botão "Aplicar".
- Ordenações: mais vendidos, menor preço, maior preço, mais recentes e mais bem avaliados. A ordenação é estável, com o id como desempate.
- Parâmetros inválidos (categoria inexistente, página 0, texto no lugar de número) mostram mensagem e o link "Limpar filtros", nunca um erro 500.
- A paginação é numerada, com 12 produtos por página.
- Quando nada é encontrado, aparece "Nenhum produto encontrado" e o botão "Remover todos".

### Página de produto (`/products/[id]`)

- É gerada estaticamente no build (`generateStaticParams`), e um id inexistente dá 404.
- Duas colunas: imagem fixa ao rolar à esquerda, informações à direita.
- Mostra categoria, título, preço com preço original riscado, selo "Promoção" ou "Esgotado", nota e avaliações (marcadas como dados de demonstração), seletor de quantidade (− 1 +), **Adicionar ao carrinho** e **Comprar agora**.
- Tem um bloco expansível "Detalhes do produto" (formato, SKU, entrega) e a seção "Você também pode gostar", com 4 produtos da mesma categoria.
- Produto esgotado (dois cursos com "inscrições encerradas") tem o botão desabilitado.

### Card de produto

Segue o card do Dawn: sem borda, imagem sobre fundo neutro com zoom leve no hover, selo sobre a imagem, título sublinhado no hover, nota, preço e botão de compra rápida. O link cobre o card inteiro; o botão fica acima dele.

### Header e rodapé

- **Header:** logo, navegação (Início, Catálogo) com indicação da página atual, busca que abre sobre o header, e sacola com contador. Fica fixo no topo. No mobile vira menu hambúrguer, com o logo centralizado.
- **Faixa de anúncio:** avisa que a loja é demo. No mobile o texto é mais curto.
- **Rodapé:** categorias, texto "Sobre a loja", links (Catálogo completo, Carrinho, **Admin**), formas de pagamento e copyright.

---

## 5. Carrinho

- Um único `CartProvider` (React Context) guarda o estado do carrinho.
- Ele persiste no `localStorage` e só é lido **depois da montagem**, então o HTML do servidor e o do cliente batem (sem erro de hidratação).
- Fica sincronizado entre abas pelo evento `storage`.
- O carrinho guarda **somente** `productId` e `quantidade`. O preço vem sempre do catálogo, então um `localStorage` editado não muda o valor de nada.
- Linhas inválidas no storage (produto inexistente, quantidade fora de 1–10) são descartadas na leitura.
- Ao adicionar um item, aparece a **notificação de carrinho** do Dawn: produto, quantidade, "Ver carrinho", "Finalizar compra" e "Continuar comprando". Ela fecha com Esc, com o X ou ao navegar, e recebe o foco quando abre.
- A página `/cart` mostra uma tabela Produto / Quantidade / Total, seletor de quantidade, lixeira, subtotal, imposto previsto e o botão "Finalizar compra". Se houver produto esgotado no carrinho, o botão fica bloqueado com um aviso.

---

## 6. Checkout

O layout imita o checkout hospedado da Shopify: formulário branco à esquerda e resumo em fundo cinza à direita, com miniaturas e uma bolinha de quantidade. No mobile, o resumo vira a barra recolhível "Mostrar resumo do pedido". Os campos usam rótulo flutuante e o destaque é azul.

Seções:

1. **Contato:** email.
2. **Entrega:** nome completo e o aviso de que o produto é digital.
3. **Pagamento:** Pix ou cartão de crédito. Ao escolher cartão, aparecem os campos (número formatado, validade MM/AA, CVV e nome no cartão) e a caixa de cartões de teste, que preenche com um clique.

Fluxo ao enviar:

1. **Cartão:** os dados vão para `/api/payments/sandbox/tokens`, que devolve um token. Erro de validação aparece aqui, antes de existir pedido.
2. **Pedido:** `POST /api/orders` com um `Idempotency-Key` aleatório. O pedido nasce `pending`. Se o comprador mudar nome ou email depois, a próxima tentativa cria um pedido novo.
3. **Pagamento:** `POST /api/orders/:id/payments` com `{ method: "pix" }` ou `{ method: "card", cardToken }`.
4. **Cartão recusado:** a mensagem aparece no topo, o foco vai para ela e o comprador pode tentar outro cartão **no mesmo pedido**.
5. **Cartão aprovado ou Pix gerado:** o carrinho é limpo e o comprador vai para `/order/:id`.

O botão fica desabilitado durante o envio, o que impede envio duplo. A chave de idempotência cobre o caso de um reenvio chegar ao servidor mesmo assim.

---

## 7. Pagamentos (Pix e cartão)

### Arquitetura

```
navegador ──dados do cartão──▶ POST /api/payments/sandbox/tokens    (tokenização do gateway → tok_…)
navegador ──ids e qtd────────▶ POST /api/orders                     (Idempotency-Key → pedido "pending")
navegador ──token ou pix─────▶ POST /api/orders/:id/payments        (tentativa de pagamento)
"banco"   ──paga o Pix───────▶ POST /api/payments/sandbox/pix/:id/pay
gateway   ──webhook assinado─▶ POST /api/webhooks/payments          (Pix confirmado → pedido "paid")
navegador ──polling 3s───────▶ GET  /api/orders/:id                 (página do pedido)
```

### Interface do gateway (`src/lib/payments/types.ts`)

```ts
interface PaymentProvider {
  name: string;
  createPix({ paymentId, amountCents }): Promise<{ providerRef, pixCode, expiresAt }>;
  chargeCard({ paymentId, amountCents, cardToken }): Promise<{ providerRef, status, failureReason?, brand, last4 }>;
  cancel(providerRef): Promise<void>;
  parseWebhook(rawBody, headers): PaymentEvent | null;   // null = assinatura inválida
}
```

A implementação é escolhida por `PAYMENT_PROVIDER`, e hoje só existe `sandbox`. Um gateway real (Mercado Pago, Stripe, Pagar.me) seria outra implementação. O código de pedido, a máquina de estados e as telas não mudam.

### Gateway sandbox (`src/lib/payments/sandbox.ts`)

**Cartão**

- A tokenização valida o nome, o número (13–19 dígitos e Luhn), a validade (MM/AA, válida até o fim do mês) e o CVV (3–4 dígitos).
- Só aceita os 4 cartões de teste. Qualquer outro número, mesmo válido, é recusado com "Use um dos cartões de teste", para ninguém digitar um cartão real numa demo.
- O token (`tok_sbx_…`) é assinado com HMAC, expira em 15 minutos e carrega bandeira, últimos 4 dígitos e resultado. **Nunca o número completo.** Um token adulterado é rejeitado.
- A cobrança devolve `succeeded`, ou `failed` com o motivo (`card_declined`, `insufficient_funds`, `invalid_token`).
- O endpoint de tokenização não registra nem guarda o corpo da requisição.

**Pix**

- Gera um **BR Code no formato real**: campos EMV (payload format, conta Pix com GUI `br.gov.bcb.pix`, MCC, moeda 986, valor, país, nome, cidade, txid) e CRC16/CCITT-FALSE. O CRC foi conferido contra o exemplo do manual do Banco Central (`1D3D`).
- A chave é `pagamento@modernstore.invalid`. O domínio `.invalid` é reservado (RFC 2606), ninguém consegue registrá-lo, então nenhum app de banco paga esse código.
- O QR code é um SVG gerado no servidor a partir do próprio BR Code, com a lib `qrcode`.
- O Pix expira em 30 minutos.
- "Simular pagamento" faz o papel do banco pagador: confere que o Pix ainda está pendente e não expirou, e então envia o webhook assinado para a loja, por HTTP. Assim o caminho exercitado é exatamente o do webhook.

**Webhook**

- O cabeçalho é `x-sandbox-signature: t=<timestamp>,v1=<hmac(timestamp.corpo)>`, no mesmo formato do Stripe.
- A assinatura cobre o corpo **cru**. A rota lê o corpo como texto e nunca o re-serializa.
- Uma entrega com mais de 5 minutos é rejeitada, o que impede replay.
- O JSON é validado no formato esperado antes de ser usado. `JSON.parse` também aceita `"7"` e `"null"`, por isso a checagem.

### Máquina de estados (`src/lib/payments/service.ts`)

Pedido: `pending → paid`

Pagamento: `pending → succeeded | failed | expired | cancelled`

- **Toda mudança de estado passa por `settle()`**, venha ela da cobrança síncrona do cartão, do webhook ou da expiração. `settle()` pega a linha com `SELECT … FOR UPDATE` e só age se o pagamento ainda está `pending`, então um pagamento sai de `pending` uma única vez.
- `succeeded` marca o pedido como `paid` com `paid_at`.
- **Um pedido tem no máximo um pagamento aprovado**, garantido pelo próprio Postgres com o índice único parcial `payments_one_success_per_order`.

### Regras de negócio e casos de borda

| Situação | Comportamento |
| --- | --- |
| Clique duplo, ou reenvio do POST do pedido | Mesmo `Idempotency-Key`, mesmo pedido |
| Mesma chave com outro comprador ou outro total | 409: é bug do cliente, não um retry |
| Cartão recusado | Pedido continua `pending`, e dá para tentar de novo no mesmo pedido |
| Nova tentativa com um Pix aberto | O Pix anterior vira `cancelled`, e pagá-lo depois não conta |
| Três tentativas simultâneas no mesmo pedido | Lock no pedido: sobra exatamente um Pix pendente |
| Pix expirado | O banco simulado recusa, e a página oferece "Gerar novo Pix" |
| Pedido já pago recebe nova tentativa | 409 |
| Webhook com assinatura inválida | 401 |
| Webhook repetido (mesmo event id) | Ignorado (`duplicate`) |
| Webhook com valor diferente do pagamento | Ignorado e logado |
| Webhook de pagamento cancelado ou expirado | Não altera nada e é logado (numa integração real, viraria estorno) |
| Falha no meio do processamento do webhook | O registro do evento e a aplicação estão na mesma transação, então o retry do gateway é processado |

A expiração é aplicada **na leitura**: ao consultar um pagamento vencido, ele vira `expired`. Não precisa de cron.

Depois que um pagamento é confirmado, o servidor envia o email de confirmação e grava `email_status` no pedido.

---

## 8. Página do pedido

`/order/:id` usa o mesmo layout do checkout e consulta `GET /api/orders/:id`.

| Estado | O que aparece |
| --- | --- |
| Pix pendente | "Quase lá", QR code, copia e cola com botão "Copiar código", contagem regressiva e caixa sandbox com "Simular pagamento do Pix". A página consulta o servidor a cada 3 s. |
| Pago | "Obrigado, {nome}", "Pagamento confirmado" e o status do email |
| Pix expirado | "O Pix expirou" e o botão "Gerar novo Pix" |
| Cartão recusado | "Pagamento não aprovado", o motivo e "Gerar novo Pix" |
| Pedido do histórico (seed) | "Pedido de {nome}" e a indicação de pedido fictício |
| Inexistente | "Pedido não encontrado" |

A página também mostra contato, forma de pagamento (com os últimos 4 dígitos no cartão), data, status e o resumo com itens, subtotal, imposto e total.

O id do pedido é um UUID aleatório e funciona como segredo do link, como o link de agradecimento de um checkout hospedado.

---

## 9. Admin

- **Login** em `/admin`, por formulário POST comum, que funciona sem JavaScript.
- **A senha fica só no servidor** (`ADMIN_PASSWORD`). A comparação é feita em tempo constante, sobre hashes SHA-256.
- A sessão é o cookie `admin_session` = `expiração.HMAC(expiração)`, com `HttpOnly`, `SameSite=Lax`, `Secure` em produção e duração de 2 horas. Não há sessão guardada no servidor.
- As páginas do admin e `/api/analytics` conferem o cookie no servidor. Sem ele: 401 na API e tela de login nas páginas.
- **Sem `ADMIN_PASSWORD`, ou com `ADMIN_SESSION_SECRET` com menos de 32 caracteres, o admin fica desativado** e a tela diz o porquê.
- As páginas do admin são `force-dynamic` e leem o cookie antes de qualquer outra coisa. Isso corrigiu um bug real: `/admin/orders` chegou a ser pré-renderizado no build, sem variáveis de ambiente.

**Painel:**

- Receita (com impostos), pedidos, ticket médio e conversão.
- Receita por mês em barras.
- Top 5 produtos por receita.
- Tudo é derivado dos 240 pedidos do histórico, e os reembolsados ficam fora.

**Pedidos:**

- **Pedidos da loja:** vêm do Postgres, com os últimos 50, forma e status do pagamento, status do pedido, total e link para o pedido.
- **Histórico (seed):** os 240 pedidos fictícios, com busca por id, nome ou email e paginação de 20 em 20.

---

## 10. Analytics (GA4 / GTM)

- Nada carrega antes do consentimento. Aparece um banner com **Aceitar** e **Recusar**, e a escolha fica no `localStorage`.
- Aceito, carrega o GTM, ou o GA4 se o GTM não estiver configurado, via `next/script`.
- **Um caminho só:** com GTM configurado, os eventos vão para o `dataLayer` (e a tag GA4 fica dentro do GTM). Senão vão por `gtag`. Assim nada é contado duas vezes.
- Os eventos seguem o schema de e-commerce do GA4, em BRL:

  | Evento | Quando dispara |
  | --- | --- |
  | `view_item` | Página de produto |
  | `add_to_cart` | Botão de adicionar ao carrinho |
  | `view_cart` | Página do carrinho |
  | `begin_checkout` | Checkout |
  | `purchase` | Depois do pagamento confirmado |

- `purchase` dispara **uma vez por pedido**, **só no navegador que fez o pedido** e **só depois do pagamento confirmado**. Um reload, um link compartilhado ou um Pix confirmado depois não contam a venda duas vezes.
- Nome e email nunca vão para os eventos.
- Sem IDs configurados, o banner nem aparece.

---

## 11. Email de confirmação

- Enviado pelo servidor **depois do pagamento confirmado**, pela API HTTP do Resend (sem SDK), com timeout de 5 s.
- Só é enviado com `RESEND_API_KEY` e `EMAIL_FROM` (num domínio verificado no Resend). Sem eles, o status fica `not_configured` e a página do pedido diz isso.
- Uma falha no envio nunca desfaz o pagamento: fica registrado `email_status = failed`.
- O HTML escapa tudo o que veio do usuário (nome, itens).
- Não existe endpoint público de "enviar email", o que evita uso para spam.

---

## 12. SEO

- Metadata global com template de título, `metadataBase`, Open Graph e `locale pt_BR`.
- Produto: título, descrição, canonical, Open Graph com imagem e **JSON-LD `Product`** com `Offer` (preço, BRL, disponibilidade). O `<` é escapado para o JSON nunca fechar a tag `<script>`.
- **Não há `aggregateRating` no JSON-LD**, porque as avaliações são fictícias e o Google trata marcação de review falsa como spam.
- `sitemap.xml` com home, catálogo e os 52 produtos.
- `robots.txt` bloqueia `/admin`, `/api`, `/cart`, `/checkout` e `/order`. Carrinho, checkout, pedido e admin também são `noindex`.
- Página 404 própria.
- `SITE_URL` é lida no build para as páginas estáticas.

---

## 13. Design (estilo Shopify / Dawn)

O visual segue o **Dawn**, o tema padrão da Shopify. Não usei marca, logo nem o texto "Powered by Shopify".

- Fonte **Assistant** (a do Dawn), servida pelo próprio projeto via `next/font`.
- Tokens no Tailwind: tinta `#121212`, texto em 75% de opacidade, fundo neutro `#f3f3f1`, espaçamento de letras do Dawn e largura de página de 1200 px.
- Botões retos de 45 px com contorno que engrossa no hover. Botão contornado para a ação secundária.
- Campos com rótulo flutuante. No checkout, estilo de checkout hospedado: cantos de 5 px, foco azul `#1773b0`.
- **Capas geradas**, em vez de gradientes com iniciais: ilustrações planas sobre fundo neutro, uma por categoria (janela de navegador, grade de componentes, player de vídeo, livro), com o nome do produto.
- Grade de 4 colunas no desktop e 2 no mobile.
- **Acessibilidade:** link "Pular para o conteúdo", foco visível, `aria-current` na navegação, rótulos em todos os campos, foco movido para erros e notificações, contraste AA. O Lighthouse mede 100 em acessibilidade.

---

## 14. Dados de demonstração

`src/data/generate.mjs` gera tudo a partir da semente `20260601`. A mesma semente produz exatamente os mesmos bytes (conferido por hash).

- **52 produtos**, 13 por categoria. Preços terminam em 90, e cerca de 40% estão em promoção. Nota entre 3,9 e 5,0. Dois cursos estão esgotados.
- **120 clientes fictícios**, todos com email `@example.com`. O cadastro acontece antes do primeiro pedido.
- **240 pedidos** entre 01/06/2026 e 31/08/2026:
  - o volume cresce ao longo do trimestre e cai no fim de semana e de madrugada (horário de Brasília);
  - os mais vendidos acompanham o volume de avaliações;
  - cerca de 20% dos clientes compram de novo;
  - 70% dos pedidos têm 1 item, 22% têm 2 e 8% têm 3;
  - Pix 45%, cartão 40%, boleto 15%;
  - cerca de 3% são reembolsados, e boletos recentes estão pendentes.
- A conversão é calculada sobre **8.420 sessões declaradas**. Esse número é uma entrada, não uma medição, e o painel diz isso.
- A soma de itens + imposto é igual ao total, em centavos, em todos os pedidos. Os testes conferem.

---

## 15. Banco de dados

Postgres 16. Schema em `db/schema.sql`, aplicado por `npm run db:migrate`.

| Tabela | Conteúdo |
| --- | --- |
| `orders` | Pedido. `idempotency_key` é única; os itens ficam em `jsonb` (instantâneo de nome e preço); `CHECK total = subtotal + imposto`; status `pending`/`paid`; `email_status`; `paid_at` |
| `payments` | Uma linha por tentativa: método, valor, status, `provider_ref`, motivo da falha, código Pix, bandeira e últimos 4 dígitos, `expires_at` |
| `webhook_events` | Ids de eventos já processados (idempotência) |

Índices: `payments(order_id)` e o índice único parcial `payments(order_id) WHERE status = 'succeeded'`.

O pool de conexões (`postgres`, máximo de 5) é reaproveitado entre hot reloads no desenvolvimento.

Em desenvolvimento, o `docker-compose.yml` sobe o container `modern-ecommerce-db`, só em `127.0.0.1:5434`, com volume próprio. Os testes de integração usam o banco `modernstore_test`.

---

## 16. Referência da API

| Método e rota | Autenticação | Descrição |
| --- | --- | --- |
| `GET /api/products` | — | Lista com `category`, `search`, `sort`, `page`, `pageSize` (máx. 60). 400 em parâmetro inválido |
| `GET /api/products/:id` | — | Produto, ou 404 |
| `POST /api/orders` | `Idempotency-Key` | Cria o pedido `pending`. Corpo: `{ name, email, items: [{ productId, quantity }] }`. 201 `{ id }` |
| `GET /api/orders/:id` | id do pedido | Pedido + último pagamento (código Pix e QR se estiver pendente). Cai no seed se não achar no banco |
| `POST /api/orders/:id/payments` | id do pedido | `{ method: "pix" }` ou `{ method: "card", cardToken }`. 201 com o pagamento; 409 se já estiver pago |
| `POST /api/payments/sandbox/tokens` | — | Tokeniza um cartão de teste. `{ number, expiry, cvc, holder }` → `{ token, brand, last4 }` |
| `POST /api/payments/sandbox/pix/:paymentId/pay` | — | Simula o banco pagando o Pix e dispara o webhook |
| `POST /api/webhooks/payments` | assinatura HMAC | Recebe eventos do gateway |
| `GET /api/analytics` | cookie de admin | Métricas do painel; 401 sem sessão |
| `POST /api/admin/login` | — | Formulário; 303 para `/admin` ou `/admin?error=1` |
| `POST /api/admin/logout` | — | Apaga o cookie |

Regras comuns:

- Corpo JSON com no máximo 10 kB (413 acima disso). JSON malformado dá 400.
- Os erros vêm em português, no formato `{ error }`.
- As rotas do sandbox respondem 404 se `PAYMENT_PROVIDER` não for `sandbox`.

Validação do pedido:

- Nome de 1 a 100 caracteres e email válido.
- 1 a 20 produtos diferentes, sem repetir produto, com quantidade inteira de 1 a 10.
- O produto precisa existir (404) e estar disponível (409).
- **Preço, total ou qualquer valor enviado pelo navegador é ignorado.**

---

## 17. Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | para o checkout | Postgres |
| `PAYMENT_PROVIDER` | não (padrão `sandbox`) | Gateway |
| `SANDBOX_SECRET` | em produção | Assina tokens de cartão e webhooks do sandbox |
| `SITE_URL` | recomendada | URLs absolutas (metadata, sitemap, JSON-LD, email). Lida no build |
| `ADMIN_PASSWORD` | para o admin | Senha do admin |
| `ADMIN_SESSION_SECRET` | para o admin | Chave do cookie (32+ caracteres) |
| `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA4_ID` | não | Analytics |
| `RESEND_API_KEY` / `EMAIL_FROM` | não | Email de confirmação |

O `.env.local` fica fora do git. O `.env.example` documenta tudo.

---

## 18. Testes

`node:test` executado com `tsx`. Não há framework de testes nem mocks do código do app.

### Unitários: `npm test` (17)

**`store.test.ts`**

- Tamanho mínimo dos dados e ids e emails únicos.
- Todo pedido do seed referencia cliente e produto existentes, está dentro do período e em ordem de data, e fecha a conta em centavos.
- Toda imagem de produto existe no disco.
- O analytics bate com os pedidos.
- Filtros combinados, validação de parâmetros e paginação estável.
- O preço vem do catálogo, ignorando o valor enviado pelo cliente.
- 12 entradas inválidas de pedido, cada uma com o status esperado.
- Token de admin expira e não pode ser forjado.
- O email escapa HTML.

**`sandbox.test.ts`**

- CRC16 igual ao exemplo do Banco Central.
- Campos do BR Code (valor, moeda, txid, nome sem acento, checksum).
- Luhn dos cartões de teste, e cartão real recusado.
- Validade (vencido no mês passado, válido até o fim do mês atual, mês 13), CVV e nome.
- Token não contém o número, expira e rejeita adulteração do resultado.
- Resultado da cobrança por cartão de teste.
- Assinatura de webhook rejeita corpo alterado, chave errada e replay.
- `parseWebhook` só aceita eventos bem formados.

### Integração: `npm run test:db` (7), contra Postgres real

- Idempotência: a mesma chave devolve o mesmo pedido, e a chave com outro comprador dá 409.
- Cartão recusado deixa o pedido pendente; o cartão aprovado seguinte paga; o pedido pago recusa nova tentativa.
- Pix pago só por webhook assinado: assinatura falsa dá 401, valor errado é ignorado, evento repetido é ignorado.
- Nova tentativa cancela o Pix aberto, e o pagamento tardio dele não conta.
- Pix expirado não pode ser pago, e dá para gerar outro.
- O banco recusa um segundo pagamento aprovado no mesmo pedido.
- Três tentativas simultâneas deixam exatamente um Pix pendente.

**Os testes pegam regressões:** removi de propósito (1) a checagem de `pending` em `settle`, (2) a conferência de valor do webhook e (3) o cancelamento do Pix anterior. Cada remoção fez pelo menos um teste falhar.

---

## 19. Verificação feita

Além dos testes automatizados:

**API com `curl`**

- Filtros, 400 e 404.
- POST com preço forjado devolve o total recalculado.
- JSON malformado dá 400, produto indisponível dá 409, corpo grande dá 413.
- Analytics sem cookie dá 401, e com cookie forjado também.
- Senha errada não autentica.
- O cookie sai com `HttpOnly`, `SameSite=Lax`, `Secure` e `Max-Age=7200`.
- `robots.txt`, sitemap e JSON-LD conferidos.

**Navegador (Chromium headless, Playwright)**

- **Loja e carrinho:** busca pelo header; notificação de carrinho (e Esc); "Comprar agora"; produto esgotado; quantidade, remoção e sincronização entre abas; reload; carrinho vazio; pedido inexistente; menu mobile.
- **Cartão:** recusado e depois aprovado no mesmo pedido (1 pedido criado). O número do cartão não aparece em nenhuma requisição à API de pedidos, e um cartão real é recusado.
- **Pix:** QR e copia e cola gerados; "Simular pagamento" confirma; uma segunda aba vê o pagamento pelo polling.
- **Admin:** login e logout, e os pedidos do banco com o status do pagamento.
- **Analytics** (com um ID de GTM de teste): nada é enviado antes do Aceitar; cada evento dispara uma vez; `purchase` não repete no reload; nenhum dado pessoal vai para o `dataLayer`.
- Nenhuma página transborda a tela em 360–375 px, e não houve erro no console.

**Lighthouse 12** (build de produção, localhost)

| Página | Mobile (perf / a11y / best practices / SEO) | Desktop |
| --- | --- | --- |
| `/` | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/products` | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/products/prod_001` | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/cart`, `/checkout` | 98–99 / 100 / 100 / 63 | 100 / 100 / 100 / 63 |

O SEO de carrinho e checkout fica em 63 porque essas páginas são `noindex` de propósito. O CLS máximo foi 0,015. Esses números são de localhost e precisam ser medidos de novo depois do deploy.

---

## 20. Decisões e divergências do guia original

O guia de partida propunha várias coisas que foram trocadas:

| Guia | O que foi feito | Por quê |
| --- | --- | --- |
| Preços como `99.99` (float) | Centavos inteiros do começo ao fim, com o imposto arredondado uma vez sobre o subtotal | Evita erro de arredondamento de ponto flutuante |
| `/api/cart/[sessionId]` com carrinho na memória do servidor | Carrinho no `localStorage` com preço sempre do catálogo | Na Vercel, memória de servidor some entre instâncias |
| POST do pedido aceitando `subtotal`, `tax` e `total` do navegador | O servidor recalcula tudo | Um request adulterado mudaria o preço |
| Array global de pedidos na memória | Postgres | Persistência de verdade, necessária para o webhook |
| `NEXT_PUBLIC_ADMIN_PASSWORD` e flag `admin_auth` no `localStorage` | Senha só no servidor e cookie assinado HttpOnly | Uma variável `NEXT_PUBLIC_` vai para o bundle do navegador, e uma flag no `localStorage` qualquer um cria |
| `Math.random()` no analytics | Métricas derivadas dos pedidos | Números que não reconciliam denunciam o fake |
| `/api/emails/confirm` público | Email enviado pelo servidor depois do pagamento | Um endpoint público de email vira ferramenta de spam |
| Scripts do GA4 e do GTM sempre carregados | Só depois do consentimento, com um único caminho de envio | LGPD/consentimento, e evita contar evento em dobro |
| `aggregateRating` no JSON-LD | Removido | Avaliações fictícias em marcação estruturada violam as diretrizes do Google |
| `trackingNumber` postal nos pedidos | Removido | O produto é digital |
| axios, zustand, uuid, chart.js, SDK do Resend, lucide | `fetch`, Context, `crypto.randomUUID`, barras em CSS, API HTTP do Resend, ícones SVG próprios | Menos dependências para o mesmo resultado |
| "Lighthouse 95+", "LIVE", "email real" | Números medidos e limites declarados | Não afirmar o que não foi medido ou configurado |

Decisões que vieram ao longo do projeto:

- **Repositório separado e público** (`~/projetos/modern-ecommerce`), fora do Swarm.
- **Interface em pt-BR.** Os nomes dos produtos ficaram em inglês, como é comum em produto para desenvolvedor.
- **Visual do tema Dawn da Shopify.** A skill `redesign-skill` foi usada como referência.
- **Gateway sandbox próprio** atrás de uma interface, em vez de integrar um gateway real sem credenciais.
- **Postgres** (Neon ou Supabase em produção, Docker no desenvolvimento), em vez de SQLite ou tokens sem estado.

---

## 21. Limitações conhecidas

- **O sandbox é o único gateway.** Integrar Mercado Pago ou Stripe exige escrever o adapter e ter credenciais de teste.
- **A confirmação do Pix chega por polling de 3 s**, não por push (SSE ou WebSocket).
- **O login do admin não tem limite de tentativas.** Use uma senha longa.
- **O link do pedido é o segredo dele:** quem tem a URL vê nome, email e itens.
- **O painel do admin usa o histórico do seed**; os pedidos novos aparecem só na lista de pedidos. O admin não tem ações que alterem status.
- **Não há estorno.** Um Pix pago depois de cancelado ou expirado é só logado.
- **Um pedido abandonado fica `pending` para sempre** (não há limpeza).
- **`SITE_URL` é lida no build**, então é preciso reconstruir se o domínio mudar.
- **Não há licença definida no repositório** (hoje, todos os direitos reservados).

---

## 22. Próximos passos sugeridos

1. Um adapter real (Mercado Pago tem Pix e cartão em modo de teste), usando o SDK do gateway para tokenizar no navegador.
2. Deploy: Neon + Vercel, com `DATABASE_URL`, `SANDBOX_SECRET` e `SITE_URL`, e Lighthouse medido de novo em produção.
3. Painel do admin incluindo os pedidos pagos do banco.
4. Limite de tentativas no login do admin e na tokenização.
5. Job de limpeza de pedidos pendentes antigos.
6. Um arquivo LICENSE (por exemplo, MIT), se a intenção for permitir reuso.

---

## 23. Histórico

| Commit | O que entrou |
| --- | --- |
| `fc2bf66` | Loja base: catálogo, carrinho, checkout simulado, admin com cookie assinado, GA4/GTM com consentimento, email, SEO, dados determinísticos, testes e Lighthouse |
| `9824b18` | Tradução completa para pt-BR (interface, API, email, descrições) e ajuste do card no mobile |
| `8b66655` | Redesign no estilo Dawn da Shopify: fonte, tokens, header, notificação de carrinho, catálogo, página de produto, checkout em duas colunas e capas novas |
| `318d6ae` | Pagamentos Pix e cartão via gateway sandbox, Postgres, máquina de estados, webhook assinado e testes de integração |
