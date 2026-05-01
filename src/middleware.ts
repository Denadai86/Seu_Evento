// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const path = url.pathname;
  
  // Lista de domínios que mostram a Landing Page (Vendas)
  const rootDomains = ['localhost:3000', 'seu-evento.acaoleve.com', 'acaoleve.com'];
  const isRootDomain = rootDomains.includes(hostname);

  let subdomain = null;
  if (!isRootDomain) {
    subdomain = hostname.split('.')[0];
  }

  // 1. Rota de Cliente (Ex: saojose.acaoleve.com)
  if (subdomain && subdomain !== 'www') {
    // Proteção de rotas do inquilino
    if (path.startsWith('/dashboard') || path.startsWith('/live')) {
      const session = req.cookies.has('acaoleve_session') || req.cookies.has(`auth_${subdomain}`);
      if (!session) return NextResponse.redirect(new URL('/entrar', req.url));
    }
    return NextResponse.rewrite(new URL(`/${subdomain}${path}${url.search}`, req.url));
  }

  // 2. Rota de Vendas / Landing Page
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};