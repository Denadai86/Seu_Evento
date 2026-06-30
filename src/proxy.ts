import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRootDomain, isLocalHost, toLogin, toSubdomain, to } from "@/lib/middleware/helpers";

export const config = {
  matcher: [
    // Atualizado: ignora robots, sitemaps e mais extensões de mídia
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)",
  ],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const isLocal = isLocalHost(hostname);
  const rootDomain = getRootDomain();

  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost:3000";

  const currentSubdomain = isRootDomain ? null : hostname.split(".")[0];
  const session = req.auth;
  const role = session?.user?.role;
  const userSubdomain = session?.user?.subdomain ?? (session?.user as any)?.tenant?.subdomain;

  // ── 1. SESSÃO INVÁLIDA ───────────────────────────────────────────────────
  if ((session as any)?.error === "RefreshAccessTokenError") {
    return toLogin(url, "session_expired");
  }

  // ── 2. ROTEAMENTO PÓS-LOGIN ──────────────────────────────────────────────
  if ((url.pathname === "/" || url.pathname === "/entrar") && session) {
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

  // ── 3. PROTEÇÃO DE ROTAS PÚBLICAS ─────────────────────────────────────────
  const publicRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
  const isPublicRoute = publicRoutes.some((r) => url.pathname === r || url.pathname.startsWith(`${r}/`));

  if (!isPublicRoute && !session) {
    return toLogin(url, undefined, url.pathname); // Envia a rota atual como callbackUrl
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
      return to(url, "/vendas");
    }
  }

  // ── 5. MULTI-TENANT REWRITE (Com Correção de Cache da Edge) ───────────────
  if (currentSubdomain) {
    const globalRoutes = ["/entrar", "/api", "/_next"];
    const isGlobalRoute = globalRoutes.some((r) => url.pathname === r || url.pathname.startsWith(r + "/"));

    if (!isGlobalRoute) {
      const rewriteUrl = url.clone();
      rewriteUrl.pathname = `/${currentSubdomain}${url.pathname}`;

      const response = (req.headers.has("next-action") || req.method === "POST")
        ? NextResponse.rewrite(rewriteUrl, { request: { headers: req.headers } })
        : NextResponse.rewrite(rewriteUrl);

      // 🔥 O SEGREDINHO SÊNIOR: Impede que a Edge Cache misture respostas de tenants diferentes
      response.headers.set("x-middleware-cache", "no-cache");
      return response;
    }
  }

  return NextResponse.next();
});