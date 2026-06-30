// src/lib/auth.ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { loginRateLimit } from "@/lib/ratelimit"; // Certifique-se de que este arquivo exista

// Extrai domínio de uma URL, removendo protocolo se existir
const extractDomain = (url: string) => {
  try {
    if (url.includes("://")) {
      return new URL(url).hostname;
    }
    return url;
  } catch {
    return url;
  }
};

const rawDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
const rootDomain = extractDomain(rawDomain);
const isProd     = process.env.NODE_ENV === "production";

console.error(`🔧 [CONFIG] ROOT_DOMAIN configurado como: "${rootDomain}" (raw: "${rawDomain}")`);
console.error(`🔧 [CONFIG] isProd: ${isProd}`);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // ← obrigatório em produção atrás de proxy reverso

  providers: [
    // ─────────────────────────────────────────────────────────────────────────────
    // 1. LOGIN PADRÃO (E-mail/Usuário + Senha/PIN)
    // ─────────────────────────────────────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email:    { label: "E-mail ou Usuário", type: "text" },
        password: { label: "Senha ou PIN",      type: "password" },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const identifier = (credentials.email as string).trim().toLowerCase();
          const rawPassword = credentials.password as string;

          // 🛡️ PROTEÇÃO CONTRA FORÇA BRUTA (Rate Limit restaurado)
          if (loginRateLimit) {
            const { success } = await loginRateLimit.limit(`login_${identifier}`);
            if (!success) throw new Error("Muitas tentativas. Tente novamente mais tarde.");
          }

          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: identifier },
                { username: identifier.toUpperCase() },
              ],
            },
          });

          if (!user || !user.password) return null;

          const isPasswordValid = await compare(rawPassword, user.password);
          if (!isPasswordValid) return null;

          let subdomain: string | null = null;
          if (user.tenantId) {
            const tenant = await prisma.tenant.findUnique({
              where:  { id: user.tenantId },
              select: { subdomain: true },
            });
            subdomain = tenant?.subdomain ?? null;
          }

          return {
            id:        user.id,
            name:      user.name,
            email:     user.email,
            role:      user.role,
            tenantId:  user.tenantId,
            subdomain,
            // 🛡️ HASH SNIPPET: Salva um pedaço da senha no token para invalidação futura
            hashSnippet: user.password.substring(0, 10) 
          };
        } catch (err: any) {
          console.error("❌ [AUTH ERROR]:", err?.message);
          return null;
        }
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. LOGIN VIA MAGIC TOKEN (Uso Único / Handoff / Onboarding)
    // ─────────────────────────────────────────────────────────────────────────────
    CredentialsProvider({
      id: "magic-token",
      name: "Magic Token",
      credentials: {
        token: { type: "text" },
        subdomain: { type: "text" },
      },
      async authorize(credentials, req) {
        const headers = req?.headers as Headers | undefined;
        const ip =
          headers?.get("x-forwarded-for") ||
          headers?.get("x-real-ip") ||
          "anonymous";

        // 🛡️ Rate limit: 5 tentativas por IP a cada 60 segundos
        if (loginRateLimit) {
          const { success, remaining } = await loginRateLimit.limit(
            `login:${ip}`
          );
          if (!success) {
            throw new Error(
              `Muitas tentativas. Aguarde um momento e tente novamente.`
            );
          }
        }

        if (!credentials?.token || !credentials?.subdomain) return null;

        // Busca tenant pelo subdomain + token (Garante que ambos combinam)
        const tenant = await prisma.tenant.findFirst({
          where: {
            subdomain: credentials.subdomain as string,
            token: credentials.token as string,
          },
          include: {
            users: {
              where: { role: "ORG_ADMIN" },
              take: 1,
            },
          },
        });

        if (!tenant || !tenant.token) return null;

        // 🔥 SEGURANÇA SÊNIOR: Invalida o token imediatamente (Consumível)
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { token: null },
        });

        const user = tenant.users[0];
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: tenant.id,
          subdomain: tenant.subdomain,
          // Como o login é sem senha, injetamos o snippet real se houver senha, ou um fallback seguro.
          hashSnippet: user.password ? user.password.substring(0, 10) : "no-pass"
        };
      },
    }),
  ],

  // ← cookie compartilhado entre subdomínios em produção
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path:     "/",
        secure:   isProd,
        domain:   isProd ? `.${rootDomain}` : undefined,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role        = user.role;
        token.tenantId    = user.tenantId;
        token.subdomain   = user.subdomain;
        token.authTime    = Date.now(); 
        token.hashSnippet = (user as any).hashSnippet; // Guarda o estado da senha
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id        = token.sub        as string;
        session.user.role      = token.role       as string;
        session.user.tenantId  = (token.tenantId  as string) || null;
        session.user.subdomain = (token.subdomain as string) || null;
        
        // ⚠️ INVALIDEZ DE SESSÃO EM TEMPO REAL
        try {
           const dbUser = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { id: true, password: true } 
           });

           // Se o admin apagou o usuário OU resetou o PIN (hash mudou), a sessão morre
           const currentSnippet = dbUser?.password ? dbUser.password.substring(0, 10) : "no-pass";
           if (!dbUser || currentSnippet !== token.hashSnippet) {
              return { ...session, error: "RefreshAccessTokenError" } as any;
           }
        } catch (err) {
           console.error("Erro ao validar sessão no DB:", err);
        }
      }
      return session;
    },
  },

  pages:   { signIn: "/entrar" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});