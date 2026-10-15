// src/lib/qrCode.ts
//
// Lê o código da cartela a partir do que a câmera devolveu. O QR impresso na cartela é uma URL
// (".../verify?event=...&id=ABC123"), mas aceitamos também o código puro. Função pura, com testes.

const CODE = /^[A-Z0-9]{4,10}$/;

export function extractCardCode(raw: string): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  let candidate = text;
  try {
    const url = new URL(text);
    candidate = url.searchParams.get("id") ?? "";
  } catch {
    // não é URL: pode ser o código puro
  }

  const code = candidate.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}
