// src/proxy.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRootDomain, isLocalHost, toLogin, toSubdomain, to } from "@/lib/middleware/helpers";
import { isPublicPath } from "@/lib/publicRoutes";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|pdf)$).*)",
  ],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const rootDomain = getRootDomain();

  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost:3000";

  const currentSubdomain = isRootDomain ? null : hostname.split(".")[0];
  const session = req.auth;
  const role = session?.user?.role;
  const userSubdomain = session?.user?.subdomain ?? (session?.user as any)?.tenant?.subdomain;

  // ── ROTAS PÚBLICAS (definidas primeiro — usadas em múltiplos checks abaixo) ──
  // A lista fica em src/lib/publicRoutes.ts (com testes).
  const isPublicRoute = isPublicPath(url.pathname);

  // ── 1. SESSÃO INVÁLIDA ───────────────────────────────────────────────────
  // ✅ Só bloqueia rotas protegidas — /projector e /cartela são públicos
  // e não exigem sessão válida (ex: telão aberto por visitante)
  if (!isPublicRoute && (session as any)?.error === "RefreshAccessTokenError") {
    return toLogin(url, "session_expired");
  }

  // ── 2. ROTEAMENTO PÓS-LOGIN ──────────────────────────────────────────────
   const hasSessionError = !!(session as any)?.error;
  if ((url.pathname === "/" || url.pathname === "/entrar") && session && !hasSessionError) {
    if (role === "SUPER_ADMIN") return to(url, "/admin");

    if (userSubdomain) {
      if (isRootDomain || currentSubdomain !== userSubdomain) {
        if (role === "ORG_ADMIN") return toSubdomain(url, userSubdomain, "/dashboard");
        if (role === "STAFF")     return toSubdomain(url, userSubdomain, "/vendas");
      }
      if (role === "ORG_ADMIN") return to(url, "/dashboard");
      if (role === "STAFF")     return to(url, "/vendas");
    }
  }

  // ── 3. PROTEÇÃO DE ROTAS PRIVADAS ─────────────────────────────────────────
  if (!isPublicRoute && !session) {
    return toLogin(url, undefined, url.pathname);
  }

  // ── 4. ISOLAMENTO CROSS-TENANT E RBAC ─────────────────────────────────────
  if (session && role !== "SUPER_ADMIN") {
    if (!isRootDomain && userSubdomain !== currentSubdomain) {
      if (req.headers.has("next-action") || req.method !== "GET") {
        return new NextResponse("Forbidden: Tentativa de manipulação cross-tenant.", { status: 403 });
      }
      return toLogin(url, "AccessDenied");
    }

    if (role === "STAFF" && (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin"))) {
      // Tesoureiro e Conselho abrem SÓ as telas de gestão de UM evento. Quem decide se a pessoa pode entrar
      // é a própria página (permissão por evento): o proxy só afasta o que nunca é de voluntário.
      const staffManagementPage =
        /^\/dashboard\/[^/]+\/(tesouraria|relatorio|extrato|cartelas|resultados|patrocinadores|auditoria)(\/|$)/.test(url.pathname);
      if (!staffManagementPage) return to(url, "/vendas");
    }
  }

  // ── 5. MULTI-TENANT REWRITE ───────────────────────────────────────────────
  if (currentSubdomain) {
    // /entrar EXATO é global — /entrar/magico cai no rewrite normalmente
    const isGlobalRoute =
      url.pathname === "/entrar" ||
      ["/api", "/_next"].some((r) => url.pathname === r || url.pathname.startsWith(r + "/"));

    if (!isGlobalRoute) {
      const rewriteUrl = url.clone();
      rewriteUrl.pathname = `/${currentSubdomain}${url.pathname}`;

      const response = (req.headers.has("next-action") || req.method === "POST")
        ? NextResponse.rewrite(rewriteUrl, { request: { headers: req.headers } })
        : NextResponse.rewrite(rewriteUrl);

      response.headers.set("x-middleware-cache", "no-cache");
      return response;
    }
  }

  return NextResponse.next();
});