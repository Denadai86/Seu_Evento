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
    // A MÁGICA AQUI: Adicionamos o ${url.search} para ele repassar o ?event=ID
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}${url.search}`, req.url));
  }

  // Caso B: É o domínio principal (localhost:3000)
  if (!url.pathname.startsWith('/hub')) {
    // Aqui também, por garantia!
    return NextResponse.rewrite(new URL(`/hub${url.pathname}${url.search}`, req.url));
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};