// src/app/admin/danger/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nukeDatabase } from "@/actions/danger";
import { AlertTriangle, Bomb, CheckCircle } from "lucide-react";

export default function DangerZonePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const confirmationWord = "ANIQUILAR";
  const isButtonDisabled = confirmText !== confirmationWord || password.length < 4 || loading;

  const handleNuke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isButtonDisabled) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await nukeDatabase(password);
      
      if (res.success) {
        setFeedback({ type: "success", msg: res.message! });
        setPassword("");
        setConfirmText("");
        // Redireciona de volta pro admin principal após 3 segundos
        setTimeout(() => router.push("/admin"), 3000);
      } else {
        setFeedback({ type: "error", msg: res.error! });
      }
    } catch (error) {
      setFeedback({ type: "error", msg: "Erro fatal de conexão." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="border-2 border-red-600 rounded-xl bg-red-50/10 p-8 shadow-2xl">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 text-red-600 mb-6">
          <AlertTriangle size={40} strokeWidth={2.5} />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Danger Zone</h1>
            <p className="text-red-500/80 font-medium">Esta ação é irreversível.</p>
          </div>
        </div>

        <div className="bg-red-100 dark:bg-red-950/30 p-4 rounded-lg mb-8 text-red-800 dark:text-red-200 text-sm font-medium">
          Você está prestes a apagar <strong>todos os Inquilinos, Eventos, Vendedores, Cartelas e Históricos Financeiros</strong>. Apenas usuários com privilégios de SUPER_ADMIN sobreviverão.
        </div>

        {/* Formulário */}
        <form onSubmit={handleNuke} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Senha de Administrador
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-red-500 focus:ring-red-500 outline-none transition-all"
              placeholder="Sua senha mestre..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Para confirmar, digite <span className="text-red-600 font-black tracking-widest">{confirmationWord}</span>
            </label>
            <input
              type="text"
              required
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-red-500 focus:ring-red-500 outline-none font-mono uppercase transition-all placeholder:normal-case"
              placeholder="Digite aqui..."
              autoComplete="off"
            />
          </div>

          {feedback && (
            <div className={`p-4 rounded-lg flex items-center gap-3 font-bold ${
              feedback.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {feedback.type === "success" ? <CheckCircle /> : <AlertTriangle />}
              {feedback.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg font-black text-lg uppercase tracking-wider transition-all duration-300 ${
              isButtonDisabled 
                ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                : "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)]"
            }`}
          >
            {loading ? (
              <span className="animate-pulse">Processando aniquilação...</span>
            ) : (
              <>
                <Bomb size={24} />
                Iniciar Autodestruição
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}