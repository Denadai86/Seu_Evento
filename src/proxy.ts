//src/proxy.ts

/// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const path = url.pathname;
  
  // 1. DICIONÁRIO DE DOMÍNIOS PRINCIPAIS
  // Aqui definimos quem é o "Dono do SaaS". Tudo que estiver aqui renderiza as páginas normais.
  const rootDomains = [
    'localhost:3000',
    'seu-evento.acaoleve.com', 
    'acaoleve.com',
    'www.acaoleve.com'
  ];

  // Identifica se estamos acessando o site de vendas (Landing Page/Hub) ou a URL de teste da Vercel
  const isRootDomain = rootDomains.includes(hostname) || hostname.endsWith('.vercel.app');

  // 2. EXTRAÇÃO DO SUBDOMÍNIO (O Inquilino / O Cliente)
  let subdomain = null;
  if (!isRootDomain) {
    subdomain = hostname.split('.')[0];
    // Evita erro se o cliente digitar www.saojose.acaoleve.com
    if (subdomain === 'www') {
      subdomain = hostname.split('.')[1];
    }
  }

  // 3. CAMADA DE SEGURANÇA (Apenas para inquilinos)
  if (subdomain) {
    const isTenantProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/live');
    if (isTenantProtectedRoute) {
      const hasAdminSession = req.cookies.has('acaoleve_session');
      const hasOperatorSession = req.cookies.has(`auth_${subdomain}`);

      if (!hasAdminSession && !hasOperatorSession) {
        return NextResponse.redirect(new URL('/entrar', req.url));
      }
    }
  }

  // 4. ROTEAMENTO (O Coração da Aplicação)

  // Caso A: É UM CLIENTE (ex: saojose.acaoleve.com)
  if (subdomain) {
    // Redireciona invisivelmente para a pasta src/app/[subdomain]/...
    return NextResponse.rewrite(new URL(`/${subdomain}${path}${url.search}`, req.url));
  }

  // Caso B: É A NOSSA LANDING PAGE OU HUB (seu-evento.acaoleve.com ou localhost)
  // Deixamos o Next.js agir naturalmente. Ele vai procurar a página na raiz ou na pasta /hub.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};