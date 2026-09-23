import { NextResponse } from 'next/server';

const MAX_BODY_BYTES = 10_000;

// Reads a small JSON body; returns a ready error response instead of throwing.
export async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { ok: false, response: NextResponse.json({ error: 'Requisição grande demais' }, { status: 413 }) };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'JSON malformado' }, { status: 400 }) };
  }
}

export const error = (status: number, message: string) => NextResponse.json({ error: message }, { status });
