//src/proxy.ts

// src/ (Renomeie de proxy.ts para middleware.ts se necessário)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const path = url.pathname;
  
  // 1. Identificar se é subdomínio ou Domínio Principal
  const rootDomain = process.env.NODE_ENV === 'production' ? 'acaoleve.com' : 'localhost:3000';
  const isSubdomain = hostname !== rootDomain && !hostname.startsWith('www.');
  const subdomain = isSubdomain ? hostname.split('.')[0] : null;

  // =======================================================================
  // 2. CAMADA DE SEGURANÇA (Edge Protection)
  // =======================================================================
  
  if (isSubdomain) {
    // Rotas do inquilino que exigem login
    const isTenantProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/live');

    if (isTenantProtectedRoute) {
      // Verifica os cookies que nós mesmos criamos no lib/session.ts e actions.ts
      const hasAdminSession = req.cookies.has('acaoleve_session'); // Dono da Paróquia
      const hasOperatorSession = req.cookies.has(`auth_${subdomain}`); // Locutor

      // Se não tiver nenhum dos dois crachás, expulsa para a tela de login
      if (!hasAdminSession && !hasOperatorSession) {
        return NextResponse.redirect(new URL('/entrar', req.url));
      }
    }
  } else {
    // Proteção do Hub Mestre (Opcional por enquanto)
    // Se a rota for /admin no domínio principal, no futuro você pode exigir um cookie de Super Admin aqui.
    /*
    if (path.startsWith('/admin') && !req.cookies.has('super_admin_session')) {
      return NextResponse.redirect(new URL('/login-mestre', req.url));
    }
    */
  }

  // =======================================================================
  // 3. CAMADA DE ROTEAMENTO (Multi-tenant Rewrites)
  // =======================================================================
  
  // Caso A: É um SUBDOMÍNIO (ex: saojose.localhost:3000)
  if (isSubdomain && subdomain) {
    // A MÁGICA: Redireciona de forma invisível para a pasta /[subdomain]/...
    // O ${url.search} garante que query params (como ?event=123) sejam repassados!
    return NextResponse.rewrite(new URL(`/${subdomain}${path}${url.search}`, req.url));
  }

  // Caso B: É o domínio principal (localhost:3000)
  // Redireciona tudo que não for subdomínio para dentro da pasta /hub/...
  if (!isSubdomain && !path.startsWith('/hub')) {
    return NextResponse.rewrite(new URL(`/hub${path}${url.search}`, req.url));
  }

  // Se não caiu em nenhuma regra de rewrite, segue o fluxo normal
  return NextResponse.next();
}

// Configuração do Matcher: Define em quais rotas o middleware deve rodar
// Ignora arquivos estáticos (_next, imagens, etc) e rotas de API internas
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};