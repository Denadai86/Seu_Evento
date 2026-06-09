import Link from "next/link";
import { auth } from "@/lib/auth";
import { ShieldAlert, UserCog, Zap } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton"; // O botão que criamos antes!

export default async function AdminNavbar() {
  // Puxa a sessão diretamente no servidor
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LADO ESQUERDO: Marca e Navegação */}
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                AL
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  AçãoLeve
                </h1>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none">
                  God Mode
                </p>
              </div>
            </Link>

            {/* Links rápidos caso precise no futuro */}
            <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-800 pl-6">
              <Link href="/admin" className="px-3 py-2 text-sm font-bold text-white bg-slate-800/50 rounded-lg">
                Hub Geral
              </Link>
            </nav>
          </div>

          {/* LADO DIREITO: Perfil e Ações */}
          <div className="flex items-center gap-4">
            
            {/* Badge de Ambiente */}
            <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">Super Admin</span>
            </div>

            {/* Identificação do Usuário */}
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{session?.user?.name || "Administrador"}</p>
                <p className="text-xs text-slate-500">{session?.user?.email}</p>
              </div>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <UserCog size={18} className="text-slate-400" />
              </div>
            </div>

            {/* Logout (Usando o Server Action Component) */}
            <div className="pl-2">
              {/* O showText={false} deixa apenas o ícone, economizando espaço */}
              <LogoutButton showText={false} className="!w-auto !p-2 bg-slate-900 border border-slate-800" />
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
