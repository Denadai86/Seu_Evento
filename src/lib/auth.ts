
// src/lib/auth.ts
import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * 1. MODULE AUGMENTATION: 
 * Ensinamos ao TypeScript que nosso User e Session do NextAuth 
 * possuem propriedades adicionais específicas do nosso SaaS.
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
    signIn: '/entrar', // Define a rota customizada de login
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
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
          include: { tenant: true } // O erro do Prisma sumirá após o npx prisma generate
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
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });
        if (!existingUser) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { tenant: true }
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.subdomain = dbUser.tenant?.subdomain;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.subdomain = token.subdomain as string | undefined;
      }
      return session;
    }
  }
});