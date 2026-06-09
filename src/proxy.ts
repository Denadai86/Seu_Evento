// src/proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; 

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)",
  ],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  const isLocal = hostname.startsWith("localhost");
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.com";
  const protocol = isLocal ? "http://" : "https://";

  const isRootDomain = 
    hostname === rootDomain || 
    hostname === `www.${rootDomain}` || 
    hostname === "localhost:3000";

  const subdomain = isRootDomain ? null : hostname.split(".")[0];

  const session = req.auth;
  const role = session?.user?.role;
  const userSubdomain = session?.user?.subdomain;

  // ==========================================
  // ROTEAMENTO PÓS-LOGIN (Cross-Domain)
  // ==========================================
  // Se o usuário está na raiz de qualquer domínio ou no /entrar COM sessão ativa
  if ((url.pathname === "/" || url.pathname === "/entrar") && session) {
    
    // 1. Super Admin fica no domínio raiz
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // 2. Org Admin e Staff precisam ir para seus subdomínios
    if (userSubdomain) {
      const tenantBaseUrl = isLocal 
        ? `${protocol}${userSubdomain}.localhost:3000` 
        : `${protocol}${userSubdomain}.${rootDomain}`;

      // Se ele logou no domínio raiz, ejeta para o subdomínio correto
      if (isRootDomain || subdomain !== userSubdomain) {
        if (role === "ORG_ADMIN") return NextResponse.redirect(`${tenantBaseUrl}/dashboard`);
        if (role === "STAFF") return NextResponse.redirect(`${tenantBaseUrl}/vendas`);
      } 
      
      // Se ele JÁ ESTÁ no subdomínio correto, apenas direciona para a tela certa
      if (role === "ORG_ADMIN") return NextResponse.redirect(new URL("/dashboard", req.url));
      if (role === "STAFF") return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  // ==========================================
  // PROTEÇÃO DAS ROTAS E ISOLAMENTO
  // ==========================================
  const publicRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
  const isPublicRoute = publicRoutes.some(
    (route) => url.pathname === route || url.pathname.startsWith(`${route}/`)
  );

  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL(`/entrar?callbackUrl=${url.pathname}`, req.url));
  }

  if (session && role !== "SUPER_ADMIN") {
    // Trava de Subdomínio Cruzado (Cross-Tenant Lock)
    if (!isRootDomain && userSubdomain !== subdomain) {
      return NextResponse.redirect(new URL("/entrar?error=AccessDenied", req.url));
    }

    // RBAC: Staff não entra no painel administrativo
    if (role === "STAFF" && (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin"))) {
      return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  return NextResponse.next();
});