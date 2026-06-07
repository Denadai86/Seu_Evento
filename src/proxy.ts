// src/middleware.ts
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

  // Remove a porta (ex: :3000) caso exista no localhost
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "production") {
    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.social.br";

    // Domínio principal
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
  const hostHeader = req.headers.get("host") || "";
  
  // Aqui descobrimos se é "root" ou o nome do subdomínio (ex: "seuevento")
  const tenantOrRoot = resolveHost(hostHeader);
  
  const session = req.auth;
  const role = session?.user?.role ?? "";
  const userSubdomain = session?.user?.subdomain;

  // ==========================================
  // 1. REGRAS DO DOMÍNIO PRINCIPAL (root)
  // ==========================================
  if (tenantOrRoot === "root") {
    // Regra de Admin Central
    if (pathname.startsWith("/admin")) {
      if (!session) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      if (role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Se for a página inicial ("/") ou marketing, o Next.js roteia naturalmente 
    // para as pastas app/(marketing) ou similares.
    return NextResponse.next();
  }

  // ==========================================
  // 2. REGRAS DE SUBDOMÍNIOS (Tenants)
  // ==========================================
  const tenant = tenantOrRoot; // Renomeado por clareza semântica nesta etapa

  // Impede que rotas de marketing globais sejam acessadas via tenant
  if (rotasPublicasMarketing.includes(pathname)) {
    const rootUrl = new URL(pathname, req.url);
    rootUrl.host =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.social.br"
        : "localhost:3000";
    return NextResponse.redirect(rootUrl);
  }

  // Permite acesso às rotas públicas do tenant
  const isPublicTenantRoute = rotasPublicasPorTenant.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicTenantRoute) {
    if (pathname === "/entrar" && session) {
      // Redirecionamento inteligente após login
      if (role === "OPERATOR") return NextResponse.redirect(new URL("/live", req.url));
      if (role === "VERIFIER") return NextResponse.redirect(new URL("/vendas", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Se for rota pública e o usuário não estiver tentando ir pro /entrar logado, continua.
  } else {
    // Rotas Protegidas do Tenant (Requer Login)
    if (!session) {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    // Trava de Tenant: Bloqueia usuário logado tentando acessar evento de outro tenant
    if (userSubdomain !== tenant && role !== "SUPER_ADMIN") {
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
  // O código só chega aqui se for um subdomínio válido e o usuário tiver permissão.
  // Mapeia silenciosamente: seuevento.seu-evento.social.br/dashboard -> /seuevento/dashboard
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname = `/${tenant}${pathname}`;
  
  return NextResponse.rewrite(rewriteUrl);
});