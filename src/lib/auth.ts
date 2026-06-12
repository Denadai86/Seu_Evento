import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "E-mail ou Usuário", type: "text" },
        password: { label: "Senha ou PIN",      type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciais não informadas.");
        }

        const identifier = (credentials.email as string).trim();
        const rawPassword = credentials.password as string;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email:    identifier.toLowerCase() },
              { username: identifier.toUpperCase() },
            ],
          },
        });

        if (!user || !user.password) {
          console.error("❌ Usuário não encontrado:", identifier);
          return null;
        }

        const isPasswordValid = await compare(rawPassword, user.password);
        if (!isPasswordValid) {
          console.error("❌ Senha incorreta:", identifier);
          return null;
        }

        // ── FIX 2: busca o subdomain do tenant para o middleware poder rotear ──
        let subdomain: string | null = null;
        if (user.tenantId) {
          const tenant = await prisma.tenant.findUnique({
            where:  { id: user.tenantId },
            select: { subdomain: true },
          });
          subdomain = tenant?.subdomain ?? null;
        }

        console.log("✅ Login bem-sucedido:", user.email || user.username, "| subdomain:", subdomain);

        return {
          id:       user.id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          tenantId: user.tenantId,
          subdomain,             // ← agora vai junto no token
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role      = user.role;
        token.tenantId  = user.tenantId;
        token.subdomain = user.subdomain; // ← FIX 2: persiste no JWT
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id        = token.sub as string;
        session.user.role      = token.role      as string;
        session.user.tenantId  = (token.tenantId  as string) || null;
        session.user.subdomain = (token.subdomain as string) || null; // ← FIX 2: expõe na sessão
      }
      return session;
    },
  },

  pages:   { signIn: "/entrar" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  //        ↑ aceita os dois nomes enquanto você migra o .env
});