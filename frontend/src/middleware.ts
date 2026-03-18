import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];
const SESSION_COOKIE = 'wallet.session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Usuário autenticado tentando acessar rota pública → redireciona para dashboard
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Usuário não autenticado tentando acessar rota privada → redireciona para login
  if (!isPublicRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
