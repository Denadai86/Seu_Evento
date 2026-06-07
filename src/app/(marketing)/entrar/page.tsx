// src/app/(marketing)/entrar/page.tsx
// Login unificado do domínio raiz (acaoleve.dev.br/entrar).
// Aceita SUPER_ADMIN e ORG_ADMIN. Staff usa o login do próprio subdomínio.
"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
const PROTOCOL = process.env.NEXT_PUBLIC_PROTOCOL || "https://";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password: password.trim(),
      });

      if (result?.error) {
        // Mensagem genérica — não expõe se o e-mail existe ou não
        setError("E-mail ou senha incorretos.");
        setIsLoading(false);
        return;
      }

      // Login OK. Lemos a sessão para decidir para onde redirecionar.
      const session = await getSession();
      const role = session?.user?.role;
      const subdomain = session?.user?.subdomain;

      if (role === "SUPER_ADMIN") {
        // Super Admin vai para o painel central de gestão da plataforma
        window.location.href = "/admin";
        return;
      }

      if (role === "ORG_ADMIN" && subdomain) {
        // Org Admin vai direto para o dashboard do seu tenant.
        // Usamos window.location.href para cruzar o subdomínio (cross-origin).
        // O cookie já está setado em .acaoleve.dev.br, então a sessão chega junto.
        window.location.href = `${PROTOCOL}${subdomain}.${ROOT_DOMAIN}/dashboard`;
        return;
      }

      if (role === "STAFF" && subdomain) {
        window.location.href = `${PROTOCOL}${subdomain}.${ROOT_DOMAIN}/`;
        return;
      }

      // Fallback: qualquer outro perfil vai para a raiz
      window.location.href = "/";

    } catch {
      setError("Ocorreu um erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">

        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Ação Leve
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Painel de controle da plataforma
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                required
                disabled={isLoading}
                autoComplete="email"
                className="w-full bg-slate-700 text-white border border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-slate-500 transition disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full bg-slate-700 text-white border border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-slate-500 tracking-widest transition disabled:opacity-60"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center font-medium bg-red-950/40 border border-red-800/50 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Autenticando..." : "Entrar"}
            </button>
          </form>
        </div>

        {/* Link discreto para o acesso de eventos (tenants) */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Organizador de evento?{" "}
          <a
            href={`${PROTOCOL}app.${ROOT_DOMAIN}/entrar`}
            className="text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            Acesse pelo link do seu evento
          </a>
        </p>

      </div>
    </div>
  );
}