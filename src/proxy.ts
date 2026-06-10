import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Configuração do matcher para definir em quais rotas este proxy atua
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};

/**
 * Função principal de proxy/middleware.
 * O Next.js requer este export nomeado 'proxy' ou 'default'.
 */
export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  
  // Extração do subdomínio
  const currentHost = process.env.NODE_ENV === "production" 
    ? hostname.replace(`.seuevento.com.br`, "") 
    : hostname.replace(`.localhost:3000`, "");

  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = session?.role as string | undefined;
  const userSubdomain = session?.subdomain as string | undefined;
  const tenantSubdomain = currentHost === "localhost" || currentHost === "seuevento.com.br" ? null : currentHost;

  // Definição de rotas públicas
  const publicTenantRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
  const isPublicRoute = publicTenantRoutes.some(
    (route) => url.pathname === route || url.pathname.startsWith(`${route}/`)
  );

  // Lógica de Redirecionamento
  if (isPublicRoute) {
    if (url.pathname === "/entrar" && session) {
      if (role === "STAFF") return NextResponse.redirect(new URL("/live", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Proteção de rotas privadas
  if (!session) {
    return NextResponse.redirect(new URL("/entrar", req.url));
  }

  // Trava de segurança cruzada entre inquilinos
  if (tenantSubdomain && userSubdomain !== tenantSubdomain && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/entrar", req.url));
  }

  // Controle de permissão específico para STAFF
  if (role === "STAFF") {
    if (!url.pathname.startsWith("/live") && !url.pathname.startsWith("/vendas") && !url.pathname.startsWith("/verify")) {
      return NextResponse.redirect(new URL("/live", req.url));
    }
  }

  return NextResponse.next();
}

// Opcional: manter como export default se o build ainda reclamar
export default proxy;