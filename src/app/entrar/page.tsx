// src/app/entrar/page.tsx (ou onde você centralizar a rota unificada)

"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { KeyRound, User } from "lucide-react";
import { useSearchParams } from "next/navigation";

// 📦 Dicionário Centralizado de Mensagens
const MESSAGES: Record<string, string> = {
  session_expired: "Sua sessão expirou por segurança. Entre novamente.",
  AccessDenied: "Você não possui permissão para acessar esta organização.",
  CredentialsSignin: "Credenciais inválidas. Verifique seu usuário e PIN.",
};

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const errorParam = params.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: identifier.trim().toLowerCase(),
        password: password.trim(),
      });

      if (res?.error) {
        // Usa o dicionário ou uma mensagem padrão se o NextAuth devolver algo estranho
        setError(MESSAGES[res.error] || MESSAGES.CredentialsSignin);
        setIsLoading(false);
        return;
      }

      // 🔥 UX SÊNIOR: replace() limpa o login do histórico (se o usuário clicar em "Voltar", ele não cai no login de novo)
      // E aproveita o callbackUrl para devolver o usuário para onde ele estava tentando ir.
      window.location.replace(callbackUrl || "/");
      
    } catch (err) {
      setError("Erro de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  // Se houver erro na URL (vindo do middleware), resgata a mensagem do dicionário
  const urlErrorMessage = errorParam ? MESSAGES[errorParam] : null;

  return (
    <div className="max-w-md w-full bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-slate-800">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
          <KeyRound size={32} />
        </div>
        <h1 className="text-2xl font-black text-white">Acesso à Plataforma</h1>
        <p className="text-slate-400 text-sm mt-2">Insira seu e-mail ou nome de usuário</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">
            Identificação
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="E-mail ou Usuário"
              required
              disabled={isLoading}
              autoFocus
              className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">
            Código de Acesso
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha ou PIN"
            required
            disabled={isLoading}
            className="w-full bg-black/50 border border-slate-700 rounded-xl p-3 text-center text-xl tracking-[0.5em] text-white focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal"
          />
        </div>

        {/* Exibe o erro vindo da URL (Middleware) ou o Erro de submissão do form */}
        {(urlErrorMessage || error) && (
          <div className={`p-3 rounded-xl text-sm text-center font-bold animate-in fade-in ${
            errorParam === "session_expired" 
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" 
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {error || urlErrorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 mt-4 shadow-lg shadow-emerald-900/20"
        >
          {isLoading ? "Validando..." : "Entrar no Sistema"}
        </button>
      </form>
    </div>
  );
}

// 🛡️ Wrapper de Suspense obrigatório no Next.js ao usar useSearchParams no client
export default function UnifiedLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] p-4 font-sans">
      <Suspense fallback={<div className="text-white font-bold">Carregando painel de acesso...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}