// src/app/entrar/page.tsx
"use client";

import { signIn, signOut } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { KeyRound, User, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ FIX LOOP: apaga o cookie corrompido sem redirecionar.
  // Sem isso, o middleware vê a sessão como "presente" e entra em loop
  // redirecionando /entrar → /dashboard → /entrar → ...
  useEffect(() => {
    if (errorParam === "session_expired") {
      signOut({ redirect: false });
    }
  }, [errorParam]);

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
        setError(MESSAGES[res.error] || MESSAGES.CredentialsSignin);
        setIsLoading(false);
        return;
      }

      // replace() limpa o login do histórico — voltar não cai no login de novo
      window.location.replace(callbackUrl || "/");
    } catch {
      setError("Erro de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  const urlErrorMessage = errorParam ? MESSAGES[errorParam] : null;
  const isSessionExpired = errorParam === "session_expired";

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
        {/* IDENTIFICAÇÃO */}
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

        {/* SENHA / PIN */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">
            Código de Acesso
          </label>
          {/*
            ✅ FIX BOTÃO OLHO: o input fica dentro de um wrapper relativo.
            O botão usa `type="button"` (evita submit acidental) e posição absoluta
            com z-index garantido — nunca some, independente do estado do input.
          */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha ou PIN"
              required
              disabled={isLoading}
              className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white text-center text-xl tracking-[0.5em] focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={isLoading}
              tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-40"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* MENSAGEM DE ERRO */}
        {(urlErrorMessage || error) && (
          <div
            className={`p-3 rounded-xl text-sm text-center font-bold animate-in fade-in ${
              isSessionExpired
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
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

export default function UnifiedLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] p-4 font-sans">
      <Suspense
        fallback={
          <div className="text-white font-bold">Carregando painel de acesso...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}