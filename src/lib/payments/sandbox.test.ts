import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brCode, crc16 } from './brcode';
import { luhn, readCardToken, sandboxProvider, signWebhook, tokenizeCard, verifyWebhook } from './sandbox';
import { TEST_CARDS } from './test-cards';

const NOW = Date.UTC(2026, 8, 23);
const card = (number: string, extra: Record<string, string> = {}) => tokenizeCard({ number, expiry: '12/34', cvc: '123', holder: 'Ana', ...extra }, NOW);

test('CRC16 matches the example in the Banco Central BR Code manual', () => {
  const body =
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.equal(crc16(body), '1D3D');
});

test('BR Code carries the amount, BRL, the txid and a valid checksum', () => {
  const code = brCode({ key: 'pagamento@modernstore.invalid', amountCents: 12345, merchantName: 'Loja Ção', merchantCity: 'São Paulo', txid: 'pay_ab-cd' });
  assert.ok(code.startsWith('000201'));
  assert.ok(code.includes('5406123.45'));
  assert.ok(code.includes('5303986'));
  assert.ok(code.includes('62110507payabcd'), 'txid in field 62.05');
  assert.ok(code.includes('5908LOJA CAO'));
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
});

test('every sandbox test card passes Luhn; a real-looking card is refused', () => {
  for (const n of Object.keys(TEST_CARDS)) assert.ok(luhn(n), n);
  assert.ok(!luhn('4242424242424241'));
  const r = card('4111 1111 1111 1111'); // Luhn-valid, not a test card
  assert.equal(r.ok, false);
});

test('tokenization validates expiry, CVV and holder', () => {
  assert.equal(card('4242424242424242', { expiry: '08/26' }).ok, false, 'expired last month');
  assert.equal(card('4242424242424242', { expiry: '09/26' }).ok, true, 'valid through the end of this month');
  assert.equal(card('4242424242424242', { expiry: '13/30' }).ok, false);
  assert.equal(card('4242424242424242', { cvc: '12' }).ok, false);
  assert.equal(card('4242424242424242', { holder: ' ' }).ok, false);
  assert.equal(tokenizeCard(null).ok, false);
});

test('tokens are signed, expire, and carry the outcome but never the full number', () => {
  const r = card('4000000000000002');
  assert.ok(r.ok);
  assert.ok(!r.token.includes('4000000000000002'));
  assert.equal(readCardToken(r.token, NOW)?.o, 'card_declined');
  assert.equal(readCardToken(r.token, NOW + 16 * 60_000), null, 'expired');
  const [payload, sig] = r.token.slice('tok_sbx_'.length).split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), o: 'approved' })).toString('base64url');
  assert.equal(readCardToken(`tok_sbx_${forged}.${sig}`, NOW), null, 'outcome tampered');
});

test('card charges follow the test card outcome', async () => {
  // readCardToken checks expiry against the real clock, so tokenize with the real clock here.
  const live = (n: string) => (tokenizeCard({ number: n, expiry: '12/34', cvc: '123', holder: 'Ana' }) as { token: string }).token;
  assert.equal((await sandboxProvider.chargeCard({ paymentId: 'p', amountCents: 100, cardToken: live('4242424242424242') })).status, 'succeeded');
  const declined = await sandboxProvider.chargeCard({ paymentId: 'p', amountCents: 100, cardToken: live('4000000000009995') });
  assert.deepEqual([declined.status, declined.failureReason, declined.last4], ['failed', 'insufficient_funds', '9995']);
  assert.equal((await sandboxProvider.chargeCard({ paymentId: 'p', amountCents: 100, cardToken: 'tok_sbx_x.y' })).failureReason, 'invalid_token');
});

test('webhook signatures reject tampering, other keys and replays', () => {
  const body = '{"id":"evt_1"}';
  const header = signWebhook(body, 1000, 'k');
  assert.ok(verifyWebhook(body, header, 1000, 'k'));
  assert.ok(!verifyWebhook(body + ' ', header, 1000, 'k'), 'body changed');
  assert.ok(!verifyWebhook(body, header, 1000, 'other'), 'other key');
  assert.ok(!verifyWebhook(body, header, 1000 + 301, 'k'), 'too old');
  assert.ok(!verifyWebhook(body, null, 1000, 'k'));
});

test('parseWebhook only accepts well-formed pix.paid events', () => {
  const headers = (b: string) => new Headers({ 'x-sandbox-signature': signWebhook(b) });
  const ok = JSON.stringify({ id: 'evt_1', type: 'pix.paid', data: { ref: 'pix_sbx_1', amount_cents: 500 } });
  assert.deepEqual(sandboxProvider.parseWebhook(ok, headers(ok)), { eventId: 'evt_1', providerRef: 'pix_sbx_1', status: 'succeeded', amountCents: 500 });
  for (const bad of ['null', '7', '[]', '{"id":"e","type":"pix.paid","data":{"ref":"r","amount_cents":"500"}}', '{"id":"e","type":"other","data":{"ref":"r","amount_cents":1}}']) {
    assert.equal(sandboxProvider.parseWebhook(bad, headers(bad)), null, bad);
  }
});
