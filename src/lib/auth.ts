import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // Páginas customizadas (opcional)
  pages: {
    signIn: "/entrar",
  },

  // Callbacks opcionais — expande o token/session se precisar de dados extras
  callbacks: {
    async session({ session, token }) {
      // Adiciona o ID do Google na session se precisar checar ownership
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string }).id = token.sub;
      }
      return session;
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);