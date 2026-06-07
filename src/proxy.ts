import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Ajuste o caminho se necessário

export const config = {
  matcher: [
    // Ignora rotas internas, estáticos, imagens e API
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)",
  ],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // 1. Definição do Domínio Principal com base no ambiente
  const rootDomain =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br" || "seu-evento.social.br"
      : "localhost:3000";

  // 2. Descoberta de Contexto: É o domínio principal ou um subdomínio?
  let isMainDomain = false;
  let tenantSubdomain = "";

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    isMainDomain = true;
  } else if (hostname.endsWith(`.${rootDomain}`)) {
    // Extrai "meuevento" de "meuevento.acaoleve.dev.br"
    tenantSubdomain = hostname.replace(`.${rootDomain}`, "");
  } else {
    // Fallback de segurança: trata domínios não reconhecidos como principal
    isMainDomain = true;
  }

  // ==========================================
  // FLUXO A: DOMÍNIO PRINCIPAL (acaoleve.dev.br)
  // ==========================================
  if (isMainDomain) {
    // Aqui está o segredo: NÃO fazemos rewrite. 
    // Usamos NextResponse.next() para deixar o Next.js rotear nativamente.
    // Isso fará a rota "/" bater perfeitamente em `app/(marketing)/page.tsx`
    
    // (Opcional) Regras exclusivas do portal principal, como Admin:
    if (url.pathname.startsWith("/admin")) {
      const session = req.auth;
      const role = session?.user?.role;
      
      if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
      if (role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  // ==========================================
  // FLUXO B: SUBDOMÍNIOS / TENANTS (*.acaoleve.dev.br)
  // ==========================================
  
  // Impede que as páginas institucionais sejam acessadas pelo subdomínio
  const marketingRoutes = ["/termos", "/privacidade"];
  if (marketingRoutes.includes(url.pathname)) {
    return NextResponse.redirect(new URL(`${url.protocol}//${rootDomain}${url.pathname}`));
  }

  // Regras de Autenticação do Tenant
  const session = req.auth;
  const role = session?.user?.role;
  const userSubdomain = session?.user?.subdomain;

  const publicTenantRoutes = ["/", "/entrar", "/projector", "/verify", "/cartela"];
  const isPublicRoute = publicTenantRoutes.some(
    (route) => url.pathname === route || url.pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    // Se logado e acessar /entrar, redireciona pelo cargo
    if (url.pathname === "/entrar" && session) {
      if (role === "STAFF") return NextResponse.redirect(new URL("/live", req.url));
      if (role === "STAFF") return NextResponse.redirect(new URL("/vendas", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  } else {
    // Rotas protegidas (Dashboard, etc)
    if (!session) return NextResponse.redirect(new URL("/entrar", req.url));

    // Trava de segurança cruzada
    if (userSubdomain !== tenantSubdomain && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }

    if (role === "STAFF" && !url.pathname.startsWith("/live")) {
      return NextResponse.redirect(new URL("/live", req.url));
    }
    if (role === "STAFF" && !url.pathname.startsWith("/vendas") && !url.pathname.startsWith("/verify")) {
      return NextResponse.redirect(new URL("/vendas", req.url));
    }
  }

  // O Rewrite final exclusivo para tenants!
  // Mapeia `meuevento.seu-evento.../dashboard` para a pasta interna `app/[tenant]/dashboard`
  return NextResponse.rewrite(new URL(`/${tenantSubdomain}${url.pathname}`, req.url));
}
);