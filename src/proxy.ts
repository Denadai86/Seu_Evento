// src/proxy.ts (ou middleware.ts)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: extrai o slug do host
// ─────────────────────────────────────────────────────────────────────────────
function resolveHost(hostname: string): string {
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "production") {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.acaoleve.com";

    if (host === rootDomain || host === `www.${rootDomain}`) return "root";

    const baseDomain = rootDomain.split(".").slice(1).join(".");
    return host.replace(`.${baseDomain}`, "");
  }

  if (host === "localhost") return "root";
  if (host.endsWith(".localhost")) return host.replace(".localhost", "");

  return host;
}

// 🔥 LISTA DE ROTAS INSTITUCIONAIS (Não sofrem regras de subdomínio)
const rotasPublicasMarketing = ["/", "/termos", "/privacidade"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const currentHost = resolveHost(req.headers.get("host") || "");
  const session = req.auth;

  // ═══════════════════════════════════════════════════════════════
  // 1. ROTAS INSTITUCIONAIS (Marketing / Global)
  // ═══════════════════════════════════════════════════════════════
  if (rotasPublicasMarketing.includes(pathname)) {
    // Se a pessoa tentar acessar /termos de um subdomínio (ex: sjose.localhost/termos)
    // Redirecionamos para o domínio principal (root) para manter a URL limpa.
    if (currentHost !== "root") {
      const rootUrl = new URL(pathname, req.url);
      rootUrl.host = process.env.NODE_ENV === "production"
        ? (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.acaoleve.com")
        : "localhost:3000";
      return NextResponse.redirect(rootUrl);
    }
    
    // Se já estiver no root, só libera o acesso
    return NextResponse.next();
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. DOMÍNIO PRINCIPAL  (seu-evento.acaoleve.com  /  localhost)
  // ═══════════════════════════════════════════════════════════════
  if (currentHost === "root") {
    if (pathname === "/admin/login") {
      if (session?.user.role === "SUPER_ADMIN")
        return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.next();
    }

    if (pathname.startsWith("/admin")) {
      if (!session)
        return NextResponse.redirect(new URL("/admin/login", req.url));
      if (session.user.role !== "SUPER_ADMIN")
        return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. SUBDOMÍNIOS DE CLIENTES  (sjose.acaoleve.com / sjose.localhost)
  // ═══════════════════════════════════════════════════════════════

  // 3.1 ROTAS PÚBLICAS E LOGIN
  if (
    pathname === "/entrar" || 
    pathname.startsWith("/projector") || 
    pathname.startsWith("/cartela") || 
    pathname === "/verify" 
  ) {
    if (pathname === "/entrar" && session) {
      if (session.user.role === "OPERATOR") {
        return NextResponse.redirect(new URL("/live", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  } 
  // 3.2 ROTAS PROTEGIDAS (Exigem login)
  else {
    if (!session) {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    // Trava de Subdomínio (Não deixa acessar o painel do vizinho)
    if (
      session.user.subdomain !== currentHost &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    // Trava do Locutor (Operador não acessa Dashboard nem Vendas)
    if (
      (pathname.startsWith("/dashboard") || pathname.startsWith("/vendas")) &&
      session.user.role === "OPERATOR"
    ) {
      return NextResponse.redirect(new URL("/live", req.url));
    }

    // Trava da Maquininha (Só Admin e Verifier acessam o PDV)
    if (pathname.startsWith("/vendas")) {
      if (!["ADMIN", "SUPER_ADMIN", "VERIFIER", "ORG_ADMIN"].includes(session.user.role)) {
        return NextResponse.redirect(new URL("/live", req.url));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REESCRITA INTERNA
  // ─────────────────────────────────────────────────────────────
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname = `/${currentHost}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
});