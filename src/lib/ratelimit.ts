// src/lib/ratelimit.ts
//
// Limite de tentativas de login (força bruta).
//
// • Dois limites INDEPENDENTES: por conta (identificador) e por IP.
//   (Chave composta "IP+usuário" deixaria um atacante com muitos IPs tentar à vontade
//    na mesma conta; e só por IP bloquearia uma sala cheia de voluntários no mesmo wi-fi.)
// • Com Upstash configurado → limite compartilhado entre todas as instâncias.
// • Sem Upstash, ou com Upstash fora do ar → PISO em memória (por instância):
//   fraco, mas nunca "aprova tudo". Em produção sem Upstash o erro aparece no log.
// • Em desenvolvimento sem Upstash o limite é ignorado (para você não se trancar testando).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type LoginLimitKind = "identifier" | "ip" | "magic";

const LIMITS: Record<LoginLimitKind, { max: number; windowMs: number; window: `${number} m` }> = {
  identifier: { max: 8, windowMs: 15 * 60_000, window: "15 m" },
  ip: { max: 60, windowMs: 15 * 60_000, window: "15 m" },
  magic: { max: 10, windowMs: 15 * 60_000, window: "15 m" },
};

const isUpstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const isProd = process.env.NODE_ENV === "production";

if (!isUpstashConfigured && isProd) {
  console.error("[RATE_LIMIT] Upstash NÃO configurado em produção: usando limite em memória (fraco). Configure o Upstash.");
}

// ── Piso em memória (janela deslizante simples, por instância) ───────────────
const memoryHits = new Map<string, number[]>();

export function memoryRateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    memoryHits.set(key, recent);
    return false;
  }
  recent.push(now);
  memoryHits.set(key, recent);

  if (memoryHits.size > 5000) {
    for (const [k, hits] of memoryHits) {
      if (hits.every((t) => now - t >= windowMs)) memoryHits.delete(k);
    }
  }
  return true;
}

// ── Upstash (criado sob demanda) ─────────────────────────────────────────────
const upstashLimiters = new Map<LoginLimitKind, Ratelimit>();
function upstashFor(kind: LoginLimitKind): Ratelimit {
  let limiter = upstashLimiters.get(kind);
  if (!limiter) {
    const cfg = LIMITS[kind];
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(cfg.max, cfg.window),
      analytics: true,
      prefix: `@upstash/ratelimit/login/${kind}`,
    });
    upstashLimiters.set(kind, limiter);
  }
  return limiter;
}

/**
 * true  → pode tentar logar
 * false → estourou o limite
 */
export async function checkLoginRateLimit(kind: LoginLimitKind, key: string): Promise<boolean> {
  const cfg = LIMITS[kind];

  if (!isUpstashConfigured) {
    if (isProd) return memoryRateLimit(`${kind}:${key}`, cfg.max, cfg.windowMs);
    console.warn(`[DEV MODE] Rate limit ignorado para ${kind}:${key}. Configure o Upstash no .env para ativar.`);
    return true;
  }

  try {
    const { success } = await upstashFor(kind).limit(key);
    return success;
  } catch (err) {
    // Upstash indisponível: NÃO derruba o login (evento ao vivo), mas também não aprova tudo.
    console.error(
      "[RATE_LIMIT_UNAVAILABLE] Upstash fora do ar, usando limite em memória:",
      err instanceof Error ? err.message : err
    );
    return memoryRateLimit(`${kind}:${key}`, cfg.max, cfg.windowMs);
  }
}

/** Primeiro IP de x-forwarded-for (os seguintes são proxies). */
export function getClientIp(headers?: Headers): string {
  const forwarded = headers?.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "anonymous";
  return headers?.get("x-real-ip")?.trim() || "anonymous";
}
