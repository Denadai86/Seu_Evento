// Testes do código PIX (BR Code) usado no QR do PDV. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { generatePixPayload } from "../src/lib/pix.ts";

// Exemplo público do manual do BR Code (Banco Central): chave aleatória, sem valor.
const EXEMPLO_BCB = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

test("reproduz EXATAMENTE o exemplo oficial do Banco Central (inclui o CRC)", () => {
  assert.equal(generatePixPayload("123e4567-e12b-12d1-a456-426655440000", "Fulano de Tal", "BRASILIA"), EXEMPLO_BCB);
});

test("com valor: o campo 54 leva o valor com 2 casas e o CRC muda", () => {
  const sem = generatePixPayload("joao@exemplo.com", "Paroquia", "Botucatu");
  const com = generatePixPayload("joao@exemplo.com", "Paroquia", "Botucatu", 25.5);
  assert.ok(com.includes("540525.50"), "campo de valor");
  assert.ok(!sem.includes("5405"), "sem valor não tem campo 54");
  assert.notEqual(sem.slice(-4), com.slice(-4));
});

test("nome e cidade são limpos (acento, símbolos) e limitados (25 e 15)", () => {
  const p = generatePixPayload("11999998888", "Associação São José & Cia — Beneficente do Bairro", "São Paulo/SP - Capital Federal");
  // "&" e "—" somem, o acento sai, e o nome é cortado em 25 caracteres (depois do trim ficam 24)
  assert.ok(p.includes("5924Associacao Sao Jose  Cia"), p);
  // a cidade perde "/" e "-" e é cortada em 15 caracteres
  assert.ok(p.includes("6015Sao PauloSP  Ca"), p);
  assert.ok(!/[ãçéñ&—]/.test(p));
});

test("o CRC é sempre os 4 últimos caracteres, em hexadecimal maiúsculo", () => {
  for (const v of [undefined, 1, 10, 99.9, 1234.56]) {
    const p = generatePixPayload("chave-qualquer", "Teste", "Cidade", v);
    assert.match(p.slice(-8, -4), /^6304$/);
    assert.match(p.slice(-4), /^[0-9A-F]{4}$/);
  }
});

test("o tamanho declarado de cada campo bate com o conteúdo (leitura de TLV)", () => {
  const p = generatePixPayload("meu.email@exemplo.com.br", "Igreja Matriz", "Botucatu", 15);
  let i = 0; const tags = [];
  while (i < p.length) {
    const tag = p.slice(i, i + 2), len = Number(p.slice(i + 2, i + 4));
    assert.ok(Number.isInteger(len), `tamanho inválido em ${tag}`);
    assert.ok(i + 4 + len <= p.length, `campo ${tag} passa do fim`);
    tags.push(tag); i += 4 + len;
  }
  assert.equal(i, p.length);
  for (const t of ["00", "26", "52", "53", "54", "58", "59", "60", "62", "63"]) assert.ok(tags.includes(t), `falta o campo ${t}`);
});
