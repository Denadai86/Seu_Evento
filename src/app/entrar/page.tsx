// src/app/entrar/page.tsx (ou onde você centralizar a rota unificada)
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { KeyRound, User } from "lucide-react";

export default function UnifiedLogin() {
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
        identifier: identifier.trim(),
        password: password.trim(),
      });

      if (res?.error) {
        setError("Credenciais inválidas. Verifique seu acesso.");
        setIsLoading(false);
        return;
      }

      // Deixa o Middleware (proxy.ts) decidir para qual domínio/rota enviar
      window.location.assign("/");
      
    } catch (err) {
      setError("Erro de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-slate-800">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-black text-white">Acesso à Plataforma</h1>
          <p className="text-slate-400 text-sm mt-2">
            Insira seu e-mail ou nome de usuário
          </p>
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center font-bold animate-in fade-in">
              {error}
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
    </div>
  );
}
