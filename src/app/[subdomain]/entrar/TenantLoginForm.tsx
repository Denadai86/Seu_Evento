// src/app/[subdomain]/entrar/TenantLoginForm.tsx
"use client";

import { signIn, getSession } from "next-auth/react"; // Adicionamos getSession
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TenantLoginForm() {
  // Mudamos de "email" para "identifier", pois agora pode ser email ou ID (JOADENAD)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: identifier.trim(), // Continuamos mandando na variável 'email' para o NextAuth, mas com a string limpa
        password: password.trim(),
      });

      if (res?.error) {
        setError("Acesso negado. Verifique seu E-mail/ID e senha.");
        setIsLoading(false);
        return;
      }

      // 🔥 ROTEAMENTO INTELIGENTE: Puxamos a sessão para ver QUEM logou
      const session = await getSession();
      const role = session?.user?.role;

      if (role === "VERIFIER") {
        router.push("/vendas"); // Vai direto para o Caixa do Pátio
      } else if (role === "OPERATOR") {
        router.push("/live"); // Vai direto para a Tela do Locutor
      } else {
        router.push("/dashboard"); // Contratante vai para o Painel
      }
      
    } catch (err) {
      setError("Ocorreu um erro ao tentar fazer login.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleCredentialsLogin} className="space-y-4 mb-6">
        <input
          type="text" // 🔥 Mudamos de 'email' para 'text' para aceitar o ID
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)} // IDs sempre maiúsculos
          placeholder="E-mail ou ID de Acesso (ex: JOADENAD)"
          required
          disabled={isLoading}
          className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:normal-case placeholder:text-slate-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha ou PIN"
          required
          disabled={isLoading}
          className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none tracking-widest"
        />
        
        {error && <p className="text-red-500 text-sm text-center font-medium animate-in fade-in">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-colors disabled:opacity-50"
        >
          {isLoading ? "Autenticando..." : "Entrar com Senha"}
        </button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Ou para Organizadores</span></div>
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
        Entrar com Google
      </button>
    </>
  );
}