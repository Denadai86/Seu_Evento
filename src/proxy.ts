//src/proxy.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

console.log("🔥 PROXY RODANDO");

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};

export const proxy = auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const pathname = url.pathname;
  const session = req.auth;


  
  // 🔥 ROTAS QUE NÃO DEVEM SER REESCRITAS
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  // 🧠 DEV: sem subdomínio
  if (hostname.includes("localhost")) {
    return NextResponse.next();
  }

  // 🌍 PRODUÇÃO
  const currentHost = hostname.replace(".acaoleve.com", "");

  if (
    currentHost !== "acaoleve" &&
    currentHost !== "www"
  ) {
    // 🔐 Proteção
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/live")
    ) {
      if (!session) {
        return NextResponse.redirect(new URL(`/entrar`, req.url));
      }

      if (
        session.user.subdomain !== currentHost &&
        session.user.role !== "SUPER_ADMIN"
      ) {
        return NextResponse.redirect(new URL(`/`, req.url));
      }
    }

    return NextResponse.rewrite(
      new URL(`/${currentHost}${pathname}`, req.url)
    );
  }

  return NextResponse.next();
});