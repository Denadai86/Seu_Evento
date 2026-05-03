// src/components/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface Props {
  callbackUrl: string; // Para onde ele vai depois de deslogar?
  variant?: "dark" | "light"; // Para combinar com o telão (escuro) ou dashboard (claro)
}

export default function LogoutButton({ callbackUrl, variant = "light" }: Props) {
  const isDark = variant === "dark";

  return (
    <button
      onClick={() => signOut({ callbackUrl })}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors
        ${isDark 
          ? "text-gray-400 hover:text-red-400 hover:bg-red-950/30" 
          : "text-slate-500 hover:text-red-600 hover:bg-red-50"}
      `}
      title="Sair do sistema"
    >
      <LogOut size={18} />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}