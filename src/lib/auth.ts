// src/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ... seus provedores atuais
  ],
  // 🔥 A MÁGICA ACONTECE AQUI: Configuração de Cookies Cross-Domain
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // O ponto inicial é VITAL: permite que o cookie seja lido em TODOS os subdomínios
        domain: process.env.NODE_ENV === "production" ? ".acaoleve.dev.br" : "localhost",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        // 👇 Garanta que seu banco de dados retorna o subdomain do usuário no momento do login
        token.subdomain = user.subdomain; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.subdomain = token.subdomain as string; // Passa para a sessão front-end
      }
      return session;
    },
  },
  // ... resto das suas configurações (pages, secret, etc)
});