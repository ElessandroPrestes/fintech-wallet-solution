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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
  ],
};
