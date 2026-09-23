import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_SECONDS, passwordMatches, signSession } from '@/lib/admin-auth';

// Plain form POST, so login works without JavaScript. 303 turns the POST into a GET on redirect.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const candidate = form?.get('password');
  const ok = typeof candidate === 'string' && passwordMatches(candidate);
  const response = NextResponse.redirect(new URL(ok ? '/admin' : '/admin?error=1', request.url), 303);
  if (ok) {
    response.cookies.set(ADMIN_COOKIE, signSession(Math.floor(Date.now() / 1000)), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_SECONDS,
    });
  }
  return response;
}
