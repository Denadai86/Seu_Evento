// src/proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)",
  ],
};

export default auth((req) => {
  const url      = req.nextUrl;             // ← sempre nextUrl, nunca req.url
  const hostname = req.headers.get("host") || "";

  const isLocal    = hostname.includes("localhost");
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
  const protocol   = isLocal ? "http://" : "https://";

  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost:3000";

  const currentSubdomain = isRootDomain ? null : hostname.split(".")[0];

  const session       = req.auth;
  const role          = session?.user?.role;
  const userSubdomain = session?.user?.subdomain;

  // ── helper: redirect interno sem usar req.url ─────────────────────────────
  const to = (pathname: string) => {
    const next = url.clone();
    next.pathname = pathname;
    return NextResponse.redirect(next);
  };

  // ── 1. PÓS-LOGIN ─────────────────────────────────────────────────────────
  if ((url.pathname === "/" || url.pathname === "/entrar") && session) {

    if (role === "SUPER_ADMIN") {
      return to("/admin");
    }

    if (userSubdomain) {
      const tenantBase = isLocal
        ? `${protocol}${userSubdomain}.localhost:3000`
        : `${protocol}${userSubdomain}.${rootDomain}`;

      // Está no domínio errado → ejeta para o subdomínio correto (redirect absoluto)
      if (isRootDomain || currentSubdomain !== userSubdomain) {
        if (role === "ORG_ADMIN") return NextResponse.redirect(`${tenantBase}/dashboard`);
        if (role === "STAFF")     return NextResponse.redirect(`${tenantBase}/vendas`);
      }

      // Já no subdomínio correto → redirect interno
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

    if (!isRootDomain && userSubdomain !== currentSubdomain) {
      const next = url.clone();
      next.pathname = "/entrar";
      next.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(next);
    }

    if (
      role === "STAFF" &&
      (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin"))
    ) {
      return to("/vendas");
    }
  }

  return NextResponse.next();
});