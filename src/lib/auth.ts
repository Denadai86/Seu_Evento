// src/lib/auth.ts
import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginRateLimit } from "@/lib/ratelimit";

// ─────────────────────────────────────────────────────────────────────────────
// MODULE AUGMENTATION — Ensina o TypeScript sobre os campos custom do SaaS
// ─────────────────────────────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId: string | null;
      subdomain: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    tenantId?: string | null;
    subdomain?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string | null;
    subdomain?: string | null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO NEXTAUTH
// ─────────────────────────────────────────────────────────────────────────────
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
const isProd = process.env.NODE_ENV === "production";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // OBRIGATÓRIO para Vercel com domínio customizado e subdomínios wildcard.
  // Sem isso, NextAuth v5 rejeita tokens de qualquer host diferente de AUTH_URL.
  trustHost: true,

  session: { strategy: "jwt" },

  // Quando alguém não autenticado tenta acessar uma rota protegida,
  // o proxy.ts já cuida do redirect. Mas se o NextAuth precisar redirecionar
  // (ex: fallback), ele vai para /entrar no domínio atual.
  pages: {
    signIn: "/entrar",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Cookies com domain=".acaoleve.dev.br" para que o mesmo token de sessão
  // seja válido em TODOS os subdomínios (tenant.acaoleve.dev.br, etc.)
  // O ponto inicial antes do domínio é obrigatório para o wildcard funcionar.
  // ─────────────────────────────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: isProd ? `.${rootDomain}` : undefined,
      },
    },
    callbackUrl: {
      name: isProd ? "__Secure-authjs.callback-url" : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: isProd ? `.${rootDomain}` : undefined,
      },
    },
    csrfToken: {
      name: isProd ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        // __Host- cookies não aceitam domain explícito — correto omitir.
      },
    },
  },

  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        // "email" aqui é o identificador geral — pode ser e-mail ou username (JOADENAD)
        email: { label: "Email ou ID", type: "text" },
        password: { label: "Senha", type: "password" },
        // Token especial para o Super Admin acessar o tenant de um cliente
        impersonateToken: { label: "Token Mágico", type: "text" },
      },

      async authorize(credentials) {
        // ══════════════════════════════════════════════════════════════════
        // FLUXO 1 — ACESSO ASSISTIDO (Super Admin entrando como um tenant)
        // Usado via link mágico de suporte, nunca exposto ao usuário final.
        // ══════════════════════════════════════════════════════════════════
        if (credentials?.impersonateToken) {
          const token = credentials.impersonateToken as string;

          const tenant = await prisma.tenant.findFirst({
            where: { token },
          });

          if (!tenant) {
            throw new Error("Link de assistência expirado ou inválido.");
          }

          // Token de uso único: apaga imediatamente após validação.
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { token: null },
          });

          const adminUser = await prisma.user.findFirst({
            where: { tenantId: tenant.id, role: "ORG_ADMIN" },
            include: { tenant: true },
          });

          if (!adminUser) {
            throw new Error("Administrador do tenant não encontrado.");
          }

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            tenantId: adminUser.tenantId,
            subdomain: adminUser.tenant?.subdomain ?? null,
          };
        }

        // ══════════════════════════════════════════════════════════════════
        // FLUXO 2 — LOGIN NORMAL (Super Admin, Org Admin ou Staff)
        // ══════════════════════════════════════════════════════════════════
        if (!credentials?.email || !credentials?.password) return null;

        const rawIdentifier = (credentials.email as string).trim();
        const rawPassword = credentials.password as string;

        // Rate limit por identificador (e-mail ou username).
        // O loginRateLimit já tem fallback de dev que sempre aprova.
        const { success } = await loginRateLimit.limit(`login_${rawIdentifier.toLowerCase()}`);
        if (!success) {
          throw new Error("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
        }

        // Aceita e-mail (contém @) ou username em caixa alta (JOADENAD)
        const isEmail = rawIdentifier.includes("@");

        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: rawIdentifier.toLowerCase() }
            : { username: rawIdentifier.toUpperCase() },
          include: { tenant: true },
        });

        // Usuário não encontrado ou sem senha cadastrada
        if (!user || !user.password) return null;

        const senhaCorreta = await bcrypt.compare(rawPassword, user.password);
        if (!senhaCorreta) return null;

        // Retorna os campos que vão compor o token JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId ?? null,
          subdomain: user.tenant?.subdomain ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // jwt: roda toda vez que um token é criado ou atualizado.
    // O objeto 'user' só existe no primeiro login — nas demais chamadas é undefined.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId ?? null;    // ← CRÍTICO: requireTenant() depende disso
        token.subdomain = user.subdomain ?? null;
      }
      return token;
    },

    // session: roda toda vez que a sessão é lida (server components, middleware, etc.)
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = (token.role as string) ?? "";
        session.user.tenantId = (token.tenantId as string | null) ?? null;
        session.user.subdomain = (token.subdomain as string | null) ?? null;
      }
      return session;
    },
  },
});