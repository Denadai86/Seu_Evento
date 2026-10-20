// src/lib/verifyUrl.ts
//
// Endereço que vai dentro do QR Code de cada cartela (abre a conferência do fiscal). Função pura, com testes.
// Recebe o domínio JÁ normalizado (siteConfig.rootDomain: sem protocolo e sem barra).

export function buildVerifyUrl(i: {
  subdomain: string;
  rootDomain: string;
  eventId: string;
  shortId: string;
  isLocal?: boolean;
  protocol?: string; // "https", "https:" ou "https://" (tudo vira "https://")
}): string {
  const protocol = `${(i.protocol ?? "https").replace(/:?\/*$/, "")}://`;
  const host = i.isLocal ? `${i.subdomain}.localhost:3000` : `${i.subdomain}.${i.rootDomain}`;
  return `${protocol}${host}/verify?event=${encodeURIComponent(i.eventId)}&id=${encodeURIComponent(i.shortId)}`;
}
