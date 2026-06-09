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
        // O NextAuth v5 limpa o cookie cross-domain automaticamente 
        // e invalida a sessão no servidor.
        await signOut({ redirectTo: "/entrar" });
      }}
      className="w-full"
    >
      <button
        type="submit"
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 outline-none focus:ring-2 focus:ring-red-500/20 group ${className}`}
      >
        <LogOut 
          size={18} 
          className="text-slate-500 group-hover:text-red-400 transition-colors" 
        />
        {showText && <span>Sair da Conta</span>}
      </button>
    </form>
  );
}
