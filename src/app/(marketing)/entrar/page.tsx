// src/app/(marketing)/entrar/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TenantRouter() {
  const [subdomain, setSubdomain] = useState("");
  const router = useRouter();

  const handleRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain) return;

    // Limpa espaços e deixa minúsculo por segurança
    const cleanSubdomain = subdomain.trim().toLowerCase();
    
    // Redireciona para o login específico do subdomínio do cliente
    window.location.href = `https://${cleanSubdomain}.acaoleve.dev.br/entrar`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Acessar meu Evento</h1>
          <p className="text-slate-400 text-sm">
            Digite o endereço do seu evento para fazer login.
          </p>
        </div>

        <form onSubmit={handleRedirect} className="space-y-6">
          <div className="flex items-center bg-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="nome-do-evento"
              className="w-full bg-transparent text-white border-0 p-3 outline-none text-right placeholder-slate-500"
              required
            />
            <span className="text-slate-400 pr-4 pl-1 py-3 bg-slate-700 select-none">
              .acaoleve.dev.br
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Continuar para o Login
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-400">
            É o administrador da plataforma?{" "}
            <button 
              onClick={() => router.push("/admin/login")}
              className="text-blue-500 hover:underline"
            >
              Acesse o Hub
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}