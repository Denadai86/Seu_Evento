// src/lib/auth.ts
import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * 1. MODULE AUGMENTATION
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId?: string | null;
      subdomain?: string | null;
    } & DefaultSession["user"];
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
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
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
  callbacks: {
    async signIn({ user, account }) {
      // Trava de segurança: impede novos cadastros pelo Google
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });
        if (!existingUser) return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // O `user` só é injetado nesta função no exato milissegundo do login
      if (user) {
        if (account?.provider === "google") {
          // O Google não sabe o cargo do usuário, então buscamos no banco
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { tenant: true }
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.tenantId = dbUser.tenantId;
            token.subdomain = dbUser.tenant?.subdomain;
          }
        } else {
          // Se foi login por senha, os dados já vieram prontos do `authorize`! Poupa o banco de dados.
          token.role = (user as any).role;
          token.tenantId = (user as any).tenantId;
          token.subdomain = (user as any).subdomain;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Repassa para o frontend apenas se o token tiver o cargo
      if (session.user && token.role) {
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.subdomain = token.subdomain as string | undefined;
      }
      return session;
    }
  }
});