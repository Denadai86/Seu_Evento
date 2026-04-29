import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/dashboard(.*)', '/live(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // 1. Identificar se é subdomínio ou não
  const rootDomain = process.env.NODE_ENV === 'production' ? 'acaoleve.com' : 'localhost:3000';
  const isSubdomain = hostname !== rootDomain && !hostname.startsWith('www.');
  const subdomain = isSubdomain ? hostname.split('.')[0] : null;

  // 2. Proteção de Rotas
  const session = await auth();
  if (isProtectedRoute(req) && !session.userId) {
    return session.redirectToSignIn();
  }

  // 3. ROTEAMENTO
  
  // Caso A: É um SUBDOMÍNIO (ex: saojose.localhost:3000)
  if (isSubdomain && subdomain) {
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
  }

  // Caso B: É o domínio principal (localhost:3000)
  // IMPORTANTE: Se o caminho já começar com /hub, não mexemos. Se não, adicionamos /hub.
  if (!url.pathname.startsWith('/hub')) {
    return NextResponse.rewrite(new URL(`/hub${url.pathname}`, req.url));
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};