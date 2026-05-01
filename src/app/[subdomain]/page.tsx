//src/app/[subdomain]/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkCard } from "@/actions/bingo"; // Usando o novo Alias!
import { Loader2, AlertCircle } from "lucide-react";

export default function TenantHomePage({ params }: { params: { subdomain: string } }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleAccess() {
    if (!code) return;
    setLoading(true);
    setError("");

    const res = await checkCard(code);

    if (res.success) {
      // Redireciona para a página da cartela específica
      router.push(`/cartela/${code.toUpperCase()}`);
    } else {
      setError(res.message || "Erro ao validar código.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 font-sans p-4">
      <div className="text-center w-full max-w-md">
        <h1 className="text-4xl font-black mb-4">
          Bem-vindo ao evento da <span className="text-emerald-600 uppercase">{params.subdomain}</span>
        </h1>
        <p className="text-lg text-slate-500 mb-8 mx-auto">
          A sala de espera para o nosso grande sorteio.
        </p>
        
        <div className="p-8 bg-white shadow-xl rounded-3xl border border-slate-100">
          <p className="font-bold text-slate-400 mb-4 uppercase text-xs tracking-widest">
            Insira o código da sua cartela:
          </p>
          
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: K85U" 
            className="w-full text-center text-2xl font-black p-4 border-2 border-slate-200 rounded-xl mb-4 focus:border-emerald-500 outline-none uppercase transition-all"
          />

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2 text-sm font-medium animate-in fade-in zoom-in">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            onClick={handleAccess}
            disabled={loading || !code}
            className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Acessar Minha Cartela"}
          </button>
        </div>
      </div>
    </div>
  );
}