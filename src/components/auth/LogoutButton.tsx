// src/components/auth/LogoutButton.tsx

import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

export default function LogoutButton({ className = "", showText = true }: LogoutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        // Destrói a sessão no servidor e te joga com segurança para a tela de login
        await signOut({ redirectTo: "/entrar" });
      }}
    >
      <button
        type="submit"
        className={`flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-slate-800/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all font-bold text-sm border border-transparent hover:border-red-500/20 group outline-none focus:ring-2 focus:ring-red-500/20 ${className}`}
        title="Sair da Conta"
      >
        <LogOut 
          size={18} 
          className="group-hover:scale-110 transition-transform" 
        />
        {/* Esconde o texto no celular (sm:inline) para não quebrar o Header */}
        {showText && <span className="hidden sm:inline">Sair</span>}
      </button>
    </form>
  );
}