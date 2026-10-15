// src/app/[subdomain]/gestao/LogoutLink.tsx
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutLink() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => { setBusy(true); signOut({ callbackUrl: "/entrar" }); }}
      className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-red-400 transition disabled:opacity-50"
    >
      <LogOut size={16} /> {busy ? "Saindo..." : "Sair"}
    </button>
  );
}
