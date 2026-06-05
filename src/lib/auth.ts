// src/lib/auth.ts
import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginRateLimit } from "@/lib/ratelimit";
import { headers } from "next/headers";

/**
 * 1. MODULE AUGMENTATION
 * Ampliamos as tipagens nativas do NextAuth para entenderem
 * os nossos campos customizados de Multi-tenant (SaaS).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      tenantId?: string | null;
      subdomain?: string | null;
    } & DefaultSession["user"];
  }

  // 🔥 Adicionado para evitar o uso de "as any" nos callbacks
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

/**
 * 2. CONFIGURAÇÃO DO NEXTAUTH
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: '/entrar',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        impersonateToken: { label: "Token Magico", type: "text" }
      },
      async authorize(credentials) {
        
        // 🚀 FLUXO 1: ASSISTÊNCIA REMOTA (SUPER ADMIN)
        if (credentials?.impersonateToken) {
          const tenant = await prisma.tenant.findFirst({
            where: { token: credentials.impersonateToken as string }
          });
          
          if (!tenant) throw new Error("Link de assistência expirado ou inválido.");

          // Segurança: Apaga o token na hora para garantir o Uso Único!
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { token: null }
          });

          const user = await prisma.user.findFirst({
            where: { tenantId: tenant.id, role: "ORG_ADMIN" },
            include: { tenant: true }
          });

          if (!user) throw new Error("Administrador não encontrado neste cliente.");

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            subdomain: user.tenant?.subdomain
          };
        }

        // 🧑‍💻 FLUXO 2: LOGIN NORMAL (Vendedor, Locutor, Cliente)
        if (!credentials?.email || !credentials?.password) return null;

        const headersList = headers();
        const ip = (await headersList).get("x-forwarded-for") || "127.0.0.1";

        if (loginRateLimit.limit) {
          const { success } = await loginRateLimit.limit(`login_${ip}`);
          if (!success) {
            throw new Error("Muitas tentativas. Aguarde 15 minutos.");
          }
        }

        const rawIdentifier = credentials.email as string; 
        const isEmail = rawIdentifier.includes("@");
        
        const user = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: isEmail ? rawIdentifier.toLowerCase() : undefined },
              { username: !isEmail ? rawIdentifier.toUpperCase() : undefined }
            ]
          },
          include: { tenant: true } 
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          subdomain: user.tenant?.subdomain
        };
      }
    })
  ],
  // ⚙️ FLUXO 3: CALLBACKS (Transfere dados do User -> JWT -> Session)
  callbacks: {
    async jwt({ token, user }) {
      // O objeto 'user' só está disponível na primeira vez que o usuário faz login
      if (user) {
        token.role      = user.role;
        token.tenantId  = user.tenantId ?? null;
        token.subdomain = user.subdomain ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      // Passa os dados do token (criptografado nos cookies) para a sessão exposta no client/server
      if (token && session.user) {
        session.user.id        = token.sub!;
        session.user.role      = token.role as string;
        session.user.tenantId  = token.tenantId as string | null;
        session.user.subdomain = token.subdomain as string | null;
      }
      return session;
    },
  },
});