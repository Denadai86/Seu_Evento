// src/proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)",
  ],
};

export default auth((req) => {
  const url      = req.nextUrl; 
  const hostname = req.headers.get("host") || "";

  const isLocal    = hostname.includes("localhost");
  
  // 🔥 A TRAVA DE SEGURANÇA: Remove protocolos (http:// ou https://) e barras finais que possam vir do .env
  let rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
  rootDomain = rootDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost:3000";

  const currentSubdomain = isRootDomain ? null : hostname.split(".")[0];

  const session       = req.auth;
  const role          = session?.user?.role;
  // Fallback seguro caso o subdomain esteja aninhado no objeto tenant
  const userSubdomain = session?.user?.subdomain || (session?.user as any)?.tenant?.subdomain;

  // ── HELPER 1: Redirect interno (Mesmo domínio) ──────────────────────────
  const to = (pathname: string) => {
    const next = url.clone();
    next.pathname = pathname;
    return NextResponse.redirect(next);
  };

  // ── HELPER 2: A SOLUÇÃO SÊNIOR (Redirect cruzado para Subdomínio) ───────
  const toSubdomain = (subdomain: string, pathname: string) => {
    const next = url.clone(); // Objeto inteligente, preserva o protocolo
    next.pathname = pathname;
    next.host = isLocal ? `${subdomain}.localhost:3000` : `${subdomain}.${rootDomain}`;
    return NextResponse.redirect(next);
  };

  // ── 1. PÓS-LOGIN ─────────────────────────────────────────────────────────
  if ((url.pathname === "/" || url.pathname === "/entrar") && session) {

    if (role === "SUPER_ADMIN") {
      return to("/admin");
    }

    if (userSubdomain) {
      // Está no domínio errado (raiz ou outro inquilino) → ejeta para o subdomínio correto
      if (isRootDomain || currentSubdomain !== userSubdomain) {
        if (role === "ORG_ADMIN") return toSubdomain(userSubdomain, "/dashboard");
        if (role === "STAFF")     return toSubdomain(userSubdomain, "/vendas");
      }

      // Já está no subdomínio correto → redirect interno simples
      if (role === "ORG_ADMIN") return to("/dashboard");
      if (role === "STAFF")     return to("/vendas");
    }
  }

  // ── 2. PROTEÇÃO DE ROTAS ──────────────────────────────────────────────────
  const publicRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
  const isPublicRoute = publicRoutes.some(
    (r) => url.pathname === r || url.pathname.startsWith(`${r}/`)
  );

  if (!isPublicRoute && !session) {
    const next = url.clone();
    next.pathname = "/entrar";
    next.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(next);
  }

  // ── 3. ISOLAMENTO ENTRE TENANTS + RBAC ───────────────────────────────────
  if (session && role !== "SUPER_ADMIN") {
    
    // Org_Admin ou Staff tentando acessar subdomínio de outra ONG
    if (!isRootDomain && userSubdomain !== currentSubdomain) {
      const next = url.clone();
      next.pathname = "/entrar";
      next.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(next);
    }

    // Staff tentando dar uma de Admin
    if (
      role === "STAFF" &&
      (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin"))
    ) {
      return to("/vendas");
    }
  }

  // ── 4. REWRITE PARA MULTI-TENANT (O SEGREDO DO APP ROUTER) ──────────────
  // Isso garante que a URL /dashboard no navegador acesse a pasta /src/app/[subdomain]/dashboard
  if (currentSubdomain) {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = `/${currentSubdomain}${url.pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
});