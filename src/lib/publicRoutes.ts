// src/lib/publicRoutes.ts
//
// Rotas que um VISITANTE (sem login) pode abrir. Função pura, com testes.
// Tudo que não está aqui exige login (o proxy redireciona para /entrar).
//
//  • "/" e "/entrar"           → site e login
//  • "/termos", "/privacidade" → documentos legais: precisam estar ao alcance de quem ainda nem é cliente
//  • "/projector"              → telão aberto num projetor, sem login
//  • "/verify", "/cartela"     → conferência de cartela

export const PUBLIC_ROUTES = ["/", "/entrar", "/termos", "/privacidade", "/projector", "/verify", "/cartela"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
