// src/components/staff/StaffNav.tsx
"use client";

import { usePathname } from "next/navigation";
import { ShoppingCart, ScanLine, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function StaffNav({ eventId }: { eventId?: string | null }) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isVendas = pathname?.includes("/vendas");
  const isVerify = pathname?.includes("/verify");

  const verifyHref = eventId ? `/verify?event=${eventId}` : `/verify`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-50 flex items-stretch safe-area-pb">
      <Link
        href="/vendas"
        className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
          isVendas ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <ShoppingCart size={22} strokeWidth={isVendas ? 2.5 : 1.75} />
        <span>Vendas</span>
        {isVendas && <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-t-full" />}
      </Link>

      <div className="w-px bg-slate-800 my-3" />

      <Link
        href={verifyHref}
        className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
          isVerify ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <ScanLine size={22} strokeWidth={isVerify ? 2.5 : 1.75} />
        <span>Verificar</span>
        {isVerify && <span className="absolute bottom-0 w-8 h-0.5 bg-blue-400 rounded-t-full" />}
      </Link>

      <div className="w-px bg-slate-800 my-3" />

      <button
        type="button"
        onClick={() => {
          setIsLoggingOut(true);
          signOut({ callbackUrl: "/entrar" });
        }}
        disabled={isLoggingOut}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        <LogOut size={22} strokeWidth={1.75} />
        <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
      </button>
    </nav>
  );
}
