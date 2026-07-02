//src/lib/middleware/helpers.ts

import { NextURL } from "next/dist/server/web/next-url";
import { NextResponse } from "next/server";

export const isLocalHost = (hostname: string) => hostname.includes("localhost");

export const getRootDomain = () => {
  let root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
  return root.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

// 🔥 HELPER DE LOGIN COM PROTEÇÃO CONTRA OPEN REDIRECT
export const toLogin = (url: NextURL, error?: string, callbackUrl?: string) => {
  const next = url.clone();
  const isLocal = isLocalHost(url.hostname);

  // Força o redirecionamento sempre para a raiz (evita que o login abra no subdomínio)
  next.hostname = isLocal ? "localhost" : getRootDomain();
  next.port = isLocal ? "3000" : "";
  next.pathname = "/entrar";

  if (error) {
    next.searchParams.set("error", error);
  }

  if (callbackUrl) {
    // 🛡️ Segurança: Evita Open Redirect. Só redireciona se for uma rota interna (começa com /)
    if (callbackUrl.startsWith("/")) {
      next.searchParams.set("callbackUrl", callbackUrl);
    }
  }

  return NextResponse.redirect(next);
};

// 🔥 HELPER PARA REDIRECIONAR PARA SUBDOMÍNIOS
export const toSubdomain = (url: NextURL, subdomain: string, pathname: string) => {
  const next = url.clone();
  const isLocal = isLocalHost(url.hostname);
  
  next.pathname = pathname;
  next.host = isLocal ? `${subdomain}.localhost:3000` : `${subdomain}.${getRootDomain()}`;
  
  return NextResponse.redirect(next);
};

// 🔥 HELPER DE REDIRECT INTERNO SIMPLES
export const to = (url: NextURL, pathname: string) => {
  const next = url.clone();
  next.pathname = pathname;
  return NextResponse.redirect(next);
};
