// Pix "copia e cola" payload (BR Code), per the Banco Central EMV spec: ID + 2-digit length + value, CRC16 at the end.
const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

// CRC16/CCITT-FALSE: polynomial 0x1021, initial 0xFFFF, as required by the spec.
export function crc16(payload: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(payload, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const ascii = (s: string, max: number) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max);

export function brCode({ key, amountCents, merchantName, merchantCity, txid }: { key: string; amountCents: number; merchantName: string; merchantCity: string; txid: string }) {
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986') + // BRL
    field('54', (amountCents / 100).toFixed(2)) +
    field('58', 'BR') +
    field('59', ascii(merchantName, 25)) +
    field('60', ascii(merchantCity, 15)) +
    field('62', field('05', txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25))) +
    '6304';
  return body + crc16(body);
}
