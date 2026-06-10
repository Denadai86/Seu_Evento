import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // ==========================================
  // 1. IDENTIFICAÇÃO SÓLIDA DO DOMÍNIO (O fim do erro 404!)
  // ==========================================
  let isMainDomain = false;
  let subdomain: string | null = null;

  if (
    hostname === "localhost:3000" || 
    hostname === "acaoleve.dev.br" || 
    hostname === "www.acaoleve.dev.br" ||
    hostname.startsWith("192.168.") // Para funcionar no Wi-Fi local via celular
  ) {
    isMainDomain = true;
  } else {
    // Pega tudo antes do primeiro ponto. Ex: "igreja.acaoleve.dev.br" -> "igreja"
    subdomain = hostname.split(".")[0];
  }

  // ==========================================
  // 2. OBTENDO A SESSÃO DO USUÁRIO
  // ==========================================
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = session?.role as string | undefined;

  // ==========================================
  // REGRAS: DOMÍNIO PRINCIPAL (Ação Leve / God Mode)
  // ==========================================
  if (isMainDomain) {
    // A. Acabou de fazer Login -> Vai direto pro Admin
    if (url.pathname === "/entrar" && session) {
      if (role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      // Se um usuário perdido logar no painel principal, expulsa
      return NextResponse.redirect(new URL("/", req.url));
    }

    // B. Proteção Bruta da Rota /admin
    if (url.pathname.startsWith("/admin")) {
      if (!session) return NextResponse.redirect(new URL("/entrar", req.url));
      if (role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/", req.url));
      
      // Deixa acessar a pasta nativa src/app/admin e ignora reescrita
      return NextResponse.next(); 
    }

    // C. Deixa Home, Termos, etc. passarem limpos
    return NextResponse.next();
  }

  // ==========================================
  // REGRAS: SUBDOMÍNIOS (Tenants / Inquilinos)
  // ==========================================
  if (subdomain) {
    // A. Redirecionamento correto após o Login no Tenant
    if (url.pathname === "/entrar" && session) {
      // O Voluntário vai para as vendas
      if (role === "STAFF") return NextResponse.redirect(new URL("/vendas", req.url));
      // O Org Admin vai para o dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // B. Proteção das Rotas do Inquilino
    const publicTenantRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
    const isPublicRoute = publicTenantRoutes.some(
      (route) => url.pathname === route || url.pathname.startsWith(`${route}/`)
    );

    if (!isPublicRoute) {
      if (!session) return NextResponse.redirect(new URL("/entrar", req.url));
      
      // Trava tática: Voluntário/STAFF NUNCA acessa o Dashboard
      if (role === "STAFF" && url.pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/vendas", req.url));
      }
    }

    // C. O SEGREDO DO MULTI-TENANT
    // Reescreve a URL por debaixo dos panos para a pasta interna /[subdomain]
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
  }
}