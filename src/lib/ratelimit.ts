// src/lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Verifica se as variáveis de ambiente existem
const isUpstashConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Se estiver configurado (Produção), usa o Upstash real. 
// Se não estiver (seu PC agora), cria um "Mock" que sempre aprova o login.
export const loginRateLimit = isUpstashConfigured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/login",
    })
  : {
      limit: async (identifier: string) => {
        console.warn(`[DEV MODE] Rate limit ignorado para ${identifier}. Configure o Upstash no .env para ativar.`);
        return { success: true, limit: 10, remaining: 9, reset: 0 };
      }
    };