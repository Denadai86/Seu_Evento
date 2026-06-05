// src/proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Resolve subdomínio
// ─────────────────────────────────────────────────────────────────────────────
function resolveHost(hostname: string): string {
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "production") {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.com";
    if (host === rootDomain || host === `www.${rootDomain}`) return "root";
    const baseDomain = rootDomain.split(".").slice(1).join(".");
    return host.replace(`.${baseDomain}`, "");
  }

  if (host === "localhost") return "root";
  if (host.endsWith(".localhost")) return host.replace(".localhost", "");
  return host;
}

// Rotas públicas (marketing + algumas públicas por tenant)
const rotasPublicasMarketing = ["/", "/termos", "/privacidade"];
const rotasPublicasPorTenant = ["/entrar", "/projector", "/verify", "/cartela"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const currentHost = resolveHost(req.headers.get("host") || "");
  const session = req.auth;
  const role = session?.user?.role ?? "";
  const userSubdomain = session?.user?.subdomain;

  // 1. ROTAS INSTITUCIONAIS (Marketing)
  if (rotasPublicasMarketing.includes(pathname)) {
    if (currentHost !== "root") {
      const rootUrl = new URL(pathname, req.url);
      rootUrl.host = process.env.NODE_ENV === "production"
        ? (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.com")
        : "localhost:3000";
      return NextResponse.redirect(rootUrl);
    }
    return NextResponse.next();
  }

  // 2. DOMÍNIO PRINCIPAL (Admin)
  if (currentHost === "root") {
    if (pathname.startsWith("/admin")) {
      if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
      if (role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // 3. SUBDOMÍNIOS DE CLIENTES
  // Rotas Públicas por Tenant
  if (rotasPublicasPorTenant.some(route => pathname === route || pathname.startsWith(route))) {
    if (pathname === "/entrar" && session) {
      // Redirecionamento inteligente após login
      if (role === "OPERATOR") return NextResponse.redirect(new URL("/live", req.url));
      if (role === "VERIFIER") return NextResponse.redirect(new URL("/vendas", req.url)); // Verifier vai direto pro PDV
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next(); // Permite acesso público (projector, verify, etc)
  }

  // 3.2 ROTAS PROTEGIDAS
  if (!session) {
    return NextResponse.redirect(new URL("/entrar", req.url));
  }

  // Trava de Tenant (Multi-tenancy)
  if (userSubdomain !== currentHost && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/entrar", req.url));
  }

  // === REGRAS POR ROLE ===

  // OPERATOR (Locutor) → Só pode acessar /live
  if (role === "OPERATOR") {
    if (!pathname.startsWith("/live")) {
      return NextResponse.redirect(new URL("/live", req.url));
    }
  }

  // VERIFIER → Pode acessar /vendas e /verify
  if (role === "VERIFIER") {
    if (!pathname.startsWith("/vendas") && !pathname.startsWith("/verify")) {
      return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  // ORG_ADMIN → Acesso total (menos /live se quiser)
  if (role === "ORG_ADMIN" || role === "SUPER_ADMIN") {
    // Pode tudo
  }

  // Reescrita interna para App Router
  const rewriteUrl = req.nextUrl.clone();

// Evita duplicar o subdomínio quando já está na URL
if (!pathname.startsWith(`/${currentHost}`)) {
  rewriteUrl.pathname = `/${currentHost}${pathname}`;
} else {
  rewriteUrl.pathname = pathname;
}

return NextResponse.rewrite(rewriteUrl);
});