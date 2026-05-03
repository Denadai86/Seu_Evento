// src/proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: extrai o "slug" do host recebido
//
// Dev:        "localhost"          → "root"
//             "sjose.localhost"    → "sjose"
//             "sjose.localhost:3000" → "sjose"
//
// Produção:   "seu-evento.acaoleve.com" → "root"   (domínio principal do SaaS)
//             "sjose.acaoleve.com"      → "sjose"  (cliente)
// ─────────────────────────────────────────────────────────────────────────────
function resolveHost(hostname: string): string {
  // Remove porta, se houver
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "production") {
    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seu-evento.acaoleve.com";

    // Domínio raiz do SaaS → marca como "root"
    if (host === rootDomain || host === `www.${rootDomain}`) return "root";

    // Ex.: "sjose.acaoleve.com" → "sjose"
    // Funciona independente de quantos níveis o rootDomain tiver
    const baseDomain = rootDomain.split(".").slice(1).join(".");
    return host.replace(`.${baseDomain}`, "");
  }

  // Desenvolvimento
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

    // Rota pública de login do admin
    if (pathname === "/admin/login") {
      // Já autenticado como super admin → manda direto pro painel
      if (session?.user.role === "SUPER_ADMIN")
        return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.next();
    }

    // Rotas protegidas do painel admin
    if (pathname.startsWith("/admin")) {
      if (!session)
        return NextResponse.redirect(new URL("/admin/login", req.url));
      if (session.user.role !== "SUPER_ADMIN")
        return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.next();
    }

    // Qualquer outra rota da raiz (landing page, etc.)
    return NextResponse.next();
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBDOMÍNIOS DE CLIENTES  (sjose.acaoleve.com  /  sjose.localhost)
  // ═══════════════════════════════════════════════════════════════

  // Rotas protegidas do cliente
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/live")) {
    // Não autenticado → tela de login do subdomínio
    if (!session)
      return NextResponse.redirect(new URL("/entrar", req.url));

    // Autenticado em outro tenant → nega acesso (exceto SUPER_ADMIN)
    if (
      session.user.subdomain !== currentHost &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    // Operador não acessa o dashboard de gestão → redireciona para o live
    if (
      pathname.startsWith("/dashboard") &&
      session.user.role === "OPERATOR"
    ) {
      return NextResponse.redirect(new URL("/live", req.url));
    }
  }

  // Reescrita interna: mapeia para a pasta [subdomain] do Next.js
  // Ex.: "sjose.localhost/dashboard" → internamente "/sjose/dashboard"
  return NextResponse.rewrite(
    new URL(`/${currentHost}${pathname}`, req.url)
  );
});