// src/middleware.ts
// ⚠️  RENOMEADO de proxy.ts → middleware.ts
// Next.js SÓ reconhece o arquivo se ele se chamar exatamente "middleware.ts"
// na raiz do projeto ou dentro de /src. Qualquer outro nome é silenciosamente ignorado.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    // Pula rotas internas do Next.js, arquivos estáticos e imagens
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Resolve subdomínio com segurança cirúrgica
// ─────────────────────────────────────────────────────────────────────────────
function resolveHost(hostname: string): string {
  if (!hostname) return "root";

  // Remove a porta (ex: :3000) caso exista
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "production") {
    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.social.br";

    if (host === rootDomain || host === `www.${rootDomain}`) return "root";

    // Extrai o subdomínio (ex: seuevento.seu-evento.social.br → seuevento)
    if (host.endsWith(`.${rootDomain}`)) {
      return host.replace(`.${rootDomain}`, "");
    }

    return host; // Fallback para custom domains futuros
  }

  // Ambiente de Desenvolvimento (Localhost)
  if (host === "localhost") return "root";
  if (host.endsWith(".localhost")) return host.replace(".localhost", "");
  return host;
}

// Rotas públicas institucionais (Só existem no domínio raiz)
const rotasPublicasMarketing = ["/termos", "/privacidade"];

// Rotas públicas dos Tenants (Subdomínios)
const rotasPublicasPorTenant = [
  "/",
  "/entrar",
  "/projector",
  "/verify",
  "/cartela",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const currentHost = resolveHost(req.headers.get("host") || "");
  const session = req.auth;
  const role = session?.user?.role ?? "";
  const userSubdomain = session?.user?.subdomain;

  // ==========================================
  // 1. REGRAS DO DOMÍNIO PRINCIPAL (root)
  // ==========================================
  if (currentHost === "root") {
    // Se for a página inicial do portal ou rotas de marketing
    if (pathname === "/" || rotasPublicasMarketing.includes(pathname)) {
      return NextResponse.next();
    }

    // Regra de Admin Central
    if (pathname.startsWith("/admin")) {
      if (!session)
        return NextResponse.redirect(new URL("/admin/login", req.url));
      if (role !== "SUPER_ADMIN")
        return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // ==========================================
  // 2. REGRAS DE SUBDOMÍNIOS (Tenants)
  // ==========================================

  // Impede que rotas de marketing globais sejam acessadas via tenant
  if (rotasPublicasMarketing.includes(pathname)) {
    const rootUrl = new URL(pathname, req.url);
    rootUrl.host =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.social.br"
        : "localhost:3000";
    return NextResponse.redirect(rootUrl);
  }

  // Permite acesso às rotas públicas do tenant (incluindo a página raiz "/" dele)
  const isPublicTenantRoute = rotasPublicasPorTenant.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  if (isPublicTenantRoute) {
    if (pathname === "/entrar" && session) {
      // Redirecionamento inteligente após login
      if (role === "OPERATOR")
        return NextResponse.redirect(new URL("/live", req.url));
      if (role === "VERIFIER")
        return NextResponse.redirect(new URL("/vendas", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Deixa renderizar normalmente — o rewrite abaixo cuida do roteamento
  } else {
    // Rotas Protegidas do Tenant (Requer Login)
    if (!session) {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    // Trava de Tenant: Bloqueia usuário logado tentando acessar evento de outro tenant
    if (userSubdomain !== currentHost && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    // === REGRAS DE AUTORIZAÇÃO POR ROLE ===
    if (role === "OPERATOR" && !pathname.startsWith("/live")) {
      return NextResponse.redirect(new URL("/live", req.url));
    }

    if (
      role === "VERIFIER" &&
      !pathname.startsWith("/vendas") &&
      !pathname.startsWith("/verify")
    ) {
      return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  // ==========================================
  // 3. REESCRITA INTERNA (App Router)
  // ==========================================
  const rewriteUrl = req.nextUrl.clone();

  // Mapeia silenciosamente `seuevento.seu-evento.social.br/cartela`
  // para `src/app/[subdomain]/cartela/page.tsx`
  if (!pathname.startsWith(`/${currentHost}`)) {
    rewriteUrl.pathname = `/${currentHost}${pathname}`;
  }

  return NextResponse.rewrite(rewriteUrl);
});