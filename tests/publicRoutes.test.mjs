// Testes das rotas públicas (o que um visitante sem login pode abrir). Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { isPublicPath, PUBLIC_ROUTES } from "../src/lib/publicRoutes.ts";

test("site, login e documentos legais abrem sem login", () => {
  for (const p of ["/", "/entrar", "/entrar/magico", "/termos", "/privacidade"]) assert.equal(isPublicPath(p), true, p);
});

test("telão, verificador e cartela continuam públicos", () => {
  for (const p of ["/projector", "/verify", "/cartela", "/cartela/AB12CD"]) assert.equal(isPublicPath(p), true, p);
});

test("áreas privadas continuam exigindo login", () => {
  for (const p of ["/dashboard", "/dashboard/abc/tesouraria", "/vendas", "/live", "/gestao", "/admin", "/print", "/api/bingo/state"]) {
    assert.equal(isPublicPath(p), false, p);
  }
});

test("não confunde prefixos parecidos (/termosx não é /termos)", () => {
  for (const p of ["/termosx", "/privacidade-interna", "/entrarx", "/projectors"]) assert.equal(isPublicPath(p), false, p);
});

test("a lista tem exatamente o que se espera (mudou? revise de propósito)", () => {
  assert.deepEqual([...PUBLIC_ROUTES], ["/", "/entrar", "/termos", "/privacidade", "/projector", "/verify", "/cartela"]);
});
