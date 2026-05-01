// src/app/[subdomain]/entrar/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { loginTenantAdmin, loginOperator } from "../../../actions/auth";
import { KeyRound, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function TenantLoginPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Roteamento Inteligente (Smart Auth)
      const isEmail = identifier.includes("@");
      
      let res;
      if (isEmail) {
        // Se tem @, é o Dono da Organização tentando acessar o Dashboard
        res = await loginTenantAdmin(subdomain, identifier, password);
      } else {
        // Se não tem @, é um Locutor tentando acessar o Telão
        res = await loginOperator(subdomain, identifier, password);
      }

      if (res.success) {
        // Redireciona o usuário para o lugar certo com base no cargo dele
        window.location.href = isEmail ? "/dashboard" : "/live";
      } else {
        setError(res.message || "Credenciais inválidas. Tente novamente.");
      }
    } catch (err) {
      setError("Ocorreu um erro no servidor. Tente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans">
      
      {/* Elementos de background para dar um ar premium */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950"></div>
      
      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-sm z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <KeyRound className="text-emerald-500" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Acesso ao Sistema
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-mono">
            {subdomain}.acaoleve.com
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              E-mail ou Usuário
            </label>
            <div className="relative">
              <input
                required
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toLowerCase().trim())}
                placeholder="padre@igreja.com ou locutor01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 pl-12 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600"
              />
              <Mail className="absolute left-4 top-4 text-slate-500" size={20} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Senha
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "ENTRAR"}
          </button>
        </form>

      </div>
    </div>
  );
}