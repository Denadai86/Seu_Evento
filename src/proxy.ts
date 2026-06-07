// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    // Pula rotas internas do Next.js, arquivos estáticos e imagens
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const { pathname } = req.nextUrl;

  // LOG PARA DEBUG NA VERCEL
  // Fique de olho na aba "Logs" (Runtime Logs) no painel da Vercel após o deploy
  console.log(`[TESTE ISOLAMENTO] Host: ${host} | Path: ${pathname}`);

  // DEIXA PASSAR TUDO
  // Sem reescrita, sem auth. O Next.js vai rotear nativamente.
  // Acessar "seu-evento.social.br/" vai bater direto em app/(marketing)/page.tsx
  return NextResponse.next();
}