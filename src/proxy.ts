// src/proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: extrai o slug do host
//
// Dev:        "localhost"              → "root"
//             "sjose.localhost"        → "sjose"
//             "sjose.localhost:3000"   → "sjose"
//
// Produção:   "seu-evento.acaoleve.com" → "root"
//             "sjose.acaoleve.com"      → "sjose"
// ─────────────────────────────────────────────────────────────────────────────
function resolveHost(hostname: string): string {
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "production") {
    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.acaoleve.com";

    if (host === rootDomain || host === `www.${rootDomain}`) return "root";

    const baseDomain = rootDomain.split(".").slice(1).join(".");
    return host.replace(`.${baseDomain}`, "");
  }

  if (host === "localhost") return "root";
  if (host.endsWith(".localhost")) return host.replace(".localhost", "");

  return host;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const currentHost = resolveHost(req.headers.get("host") || "");
  const session = req.auth;

  // ═══════════════════════════════════════════════════════════════
  // DOMÍNIO PRINCIPAL  (seu-evento.acaoleve.com  /  localhost)
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
  // SUBDOMÍNIOS DE CLIENTES  (sjose.acaoleve.com / sjose.localhost)
  // ═══════════════════════════════════════════════════════════════

  // 1. ROTAS PÚBLICAS (Sem login)
  if (
    pathname.startsWith("/projector") || 
    pathname.startsWith("/cartela") || 
    pathname === "/verify" // 🔥 Apenas a raiz do verify é pública
  ) {
    // Deixa passar direto para o rewrite abaixo
  } 
  // 2. ROTAS PROTEGIDAS (Exigem login)
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

    // 🔥 Trava da Maquininha (Só Admin e Verifier acessam o PDV)
    if (pathname.startsWith("/vendas")) {
      if (!["ADMIN", "SUPER_ADMIN", "VERIFIER"].includes(session.user.role)) {
        // Se for um operador curioso tentando acessar /vendas
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