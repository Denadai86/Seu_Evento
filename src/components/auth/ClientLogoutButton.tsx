"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";

interface ClientLogoutButtonProps {
  className?: string;
}

export default function ClientLogoutButton({ className = "" }: ClientLogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Realiza o signout pelo lado do cliente e força o redirecionamento
    await signOut({ callbackUrl: "/entrar" });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 group ${className}`}
    >
      <LogOut 
        size={18} 
        className="text-slate-500 group-hover:text-red-400 transition-colors" 
      />
      <span>{isLoggingOut ? "Saindo..." : "Sair da Conta"}</span>
    </button>
  );
}