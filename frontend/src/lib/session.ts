import { cookies } from 'next/headers';

const SESSION_COOKIE = 'wallet.session';
const COOKIE_MAX_AGE = 60 * 15; // 15 minutos (alinha com o JWT_EXPIRES_IN)

export function setSession(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function getSession(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

export function clearSession(): void {
  cookies().delete(SESSION_COOKIE);
}
