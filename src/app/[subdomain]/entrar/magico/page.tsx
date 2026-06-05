"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function MagicLogin() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const router = useRouter();
  const [status, setStatus] = useState("Iniciando protocolo de Assistência Remota...");

  useEffect(() => {
    if (!token) {
      setStatus("Acesso negado: Token ausente.");
      return;
    }

    // Aciona o NextAuth silenciosamente passando o token
    signIn("credentials", {
      impersonateToken: token,
      redirect: false,
    }).then((res) => {
      if (res?.error) {
        setStatus("Acesso negado: Link expirado ou já utilizado.");
      } else {
        setStatus("Identidade validada. Acessando painel do cliente...");
        // Redireciona para o painel de controle do cliente
        window.location.href = "/dashboard";
      }
    });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-emerald-400 font-sans">
      <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      <p className="font-bold tracking-widest uppercase text-sm animate-pulse">{status}</p>
    </div>
  );
}