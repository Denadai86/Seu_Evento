// src/middleware.ts  ← deve estar neste path para o Next.js reconhecer
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// MATCHER — exclui assets estáticos e rotas de API
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE — wrappado com auth() do NextAuth v5
// req.auth já contém a sessão decodificada (substitui getToken)
// ─────────────────────────────────────────────────────────────────────────────
export default auth((req) => {
  const url   = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  const isLocal     = hostname.includes("localhost");
  const rootDomain  = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
  const protocol    = isLocal ? "http://" : "https://";

  // Identifica se a requisição está no domínio raiz
  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost:3000";

  // Subdomínio atual (null se for o domínio raiz)
  const currentSubdomain = isRootDomain
    ? null
    : hostname.split(".")[0];

  // Dados da sessão — req.auth é o equivalente v5 do getToken()
  const session      = req.auth;
  const role         = session?.user?.role;
  const userSubdomain = session?.user?.subdomain;

  // ── 1. ROTEAMENTO PÓS-LOGIN ──────────────────────────────────────────────
  // Usuário logado bateu em "/" ou "/entrar" → decide para onde mandar
  if ((url.pathname === "/" || url.pathname === "/entrar") && session) {

    // Super Admin fica sempre no domínio raiz → /admin
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Org Admin e Staff pertencem ao seu subdomínio
    if (userSubdomain) {
      const tenantBaseUrl = isLocal
        ? `${protocol}${userSubdomain}.localhost:3000`
        : `${protocol}${userSubdomain}.${rootDomain}`;

      // Está no domínio raiz ou no subdomínio errado → ejeta para o correto
      if (isRootDomain || currentSubdomain !== userSubdomain) {
        if (role === "ORG_ADMIN") return NextResponse.redirect(`${tenantBaseUrl}/dashboard`);
        if (role === "STAFF")     return NextResponse.redirect(`${tenantBaseUrl}/vendas`);
      }

      // Já está no subdomínio correto → rota interna
      if (role === "ORG_ADMIN") return NextResponse.redirect(new URL("/dashboard", req.url));
      if (role === "STAFF")     return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  // ── 2. PROTEÇÃO DE ROTAS PRIVADAS ────────────────────────────────────────
  const publicRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
  const isPublicRoute = publicRoutes.some(
    (route) => url.pathname === route || url.pathname.startsWith(`${route}/`)
  );

  // Rota protegida sem sessão → login (preservando callbackUrl)
  if (!isPublicRoute && !session) {
    const callbackUrl = encodeURIComponent(url.pathname);
    return NextResponse.redirect(
      new URL(`/entrar?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  // ── 3. ISOLAMENTO ENTRE TENANTS + RBAC ───────────────────────────────────
  if (session && role !== "SUPER_ADMIN") {

    // Cross-Tenant Lock: bloqueia acesso ao subdomínio alheio
    if (!isRootDomain && userSubdomain !== currentSubdomain) {
      return NextResponse.redirect(new URL("/entrar?error=AccessDenied", req.url));
    }

    // RBAC: Staff não pode acessar /dashboard nem /admin
    if (
      role === "STAFF" &&
      (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin"))
    ) {
      return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  return NextResponse.next();
});