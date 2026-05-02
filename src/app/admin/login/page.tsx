// src/app/admin/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/admin" });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Ação Leve Hub</h1>
          <p className="text-slate-400 text-sm">Acesso restrito ao Administrador</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail master"
            className="w-full bg-slate-700 text-white border-0 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full bg-slate-700 text-white border-0 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Autenticando..." : "Entrar no Hub"}
          </button>
        </form>

        <button
          onClick={() => signIn("google", { callbackUrl: "/admin" })}
          className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-slate-100"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  );
}