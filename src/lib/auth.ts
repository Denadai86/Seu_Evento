// src/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

// Extrai domínio de uma URL, removendo protocolo se existir
const extractDomain = (url: string) => {
  try {
    // Se for URL com protocolo, extrai host
    if (url.includes("://")) {
      return new URL(url).hostname;
    }
    // Senão, retorna como está
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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "E-mail ou Usuário", type: "text" },
        password: { label: "Senha ou PIN",      type: "password" },
      },
      async authorize(credentials) {
        try {
          console.error("🔐🔐🔐 [AUTH] authorize() CHAMADO 🔐🔐🔐");
          
          if (!credentials?.email || !credentials?.password) {
            console.error("❌ [AUTH] Credenciais não informadas.", { email: !!credentials?.email, password: !!credentials?.password });
            return null;
          }

          const identifier = (credentials.email as string).trim().toLowerCase();
          const rawPassword = credentials.password as string;
          
          console.error(`🔍 [AUTH] Procurando usuário: "${identifier}"`);

          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email:    identifier },
                { username: identifier.toUpperCase() },
              ],
            },
          });

          if (!user) {
            console.error(`❌ [AUTH] Usuário NÃO encontrado no banco: "${identifier}"`);
            console.error(`❌ [AUTH] Procurados com: email="${identifier}" ou username="${identifier.toUpperCase()}"`);
            return null;
          }

          console.error(`✅ [AUTH] Usuário ENCONTRADO: ${user.email}`);

          if (!user.password) {
            console.error(`❌ [AUTH] Usuário encontrado mas SEM SENHA: ${user.email}`);
            return null;
          }

          console.error(`🔐 [AUTH] Comparando senha... (hash primeiros 20 chars: ${user.password.substring(0, 20)})`);
          
          let isPasswordValid = false;
          try {
            isPasswordValid = await compare(rawPassword, user.password);
          } catch (compareError) {
            console.error(`❌ [AUTH] ERRO ao comparar senha:`, compareError);
            return null;
          }
          
          if (!isPasswordValid) {
            console.error(`❌ [AUTH] Senha INCORRETA para: ${identifier}`);
            return null;
          }

          console.error(`✅✅✅ [AUTH] Login SUCESSO: ${user.email}`);

          // Busca subdomain do tenant para o middleware rotear corretamente
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
          };
        } catch (err: any) {
          console.error("❌ [AUTH] ERRO NÃO TRATADO:", err?.message || err);
          console.error("❌ [AUTH] Stack:", err?.stack);
          return null;
        }
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
        token.role      = user.role;
        token.tenantId  = user.tenantId;
        token.subdomain = user.subdomain;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id        = token.sub        as string;
        session.user.role      = token.role       as string;
        session.user.tenantId  = (token.tenantId  as string) || null;
        session.user.subdomain = (token.subdomain as string) || null;
      }
      return session;
    },
  },

  pages:   { signIn: "/entrar" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});