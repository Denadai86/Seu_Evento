// src/lib/auth.ts
import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginRateLimit } from "@/lib/ratelimit";

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

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.com";
const isProd = process.env.NODE_ENV === "production";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: isProd ? `.${rootDomain}` : undefined, // Permite login cruzado
      },
    },
  },

  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        identifier: { label: "Email ou Usuário", type: "text" },
        password: { label: "Senha ou PIN", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const rawIdentifier = (credentials.identifier as string).trim();
        const rawPassword = credentials.password as string;

        // Rate Limit (Proteção contra força bruta em PINs de 4 dígitos)
        const { success } = await loginRateLimit.limit(`login_${rawIdentifier.toLowerCase()}`);
        if (!success) throw new Error("Muitas tentativas. Aguarde 15 minutos.");

        // Lógica Inteligente de Identificação
        const isEmail = rawIdentifier.includes("@");

        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: rawIdentifier.toLowerCase() }
            : { username: rawIdentifier.toUpperCase() },
          include: { tenant: true },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(rawPassword, user.password);
        if (!isPasswordValid) return null;

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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId ?? null;
        token.subdomain = user.subdomain ?? null;
      }
      return token;
    },
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