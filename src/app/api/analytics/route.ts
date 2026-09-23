import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { getAnalytics } from '@/lib/store';

export function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json(getAnalytics());
}
