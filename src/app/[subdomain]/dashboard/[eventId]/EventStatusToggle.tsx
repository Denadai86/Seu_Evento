// src/app/[subdomain]/dashboard/[eventId]/EventStatusToggle.tsx
"use client";

import { useTransition } from "react";
import { toggleEventStatus } from "@/actions/event";

interface Props {
  eventId: string;
  tenantId: string;
  subdomain: string;
  currentStatus: string;
}

export default function EventStatusToggle({ eventId, tenantId, subdomain, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const isActive = currentStatus === "ACTIVE";

  const handleToggle = () => {
    startTransition(async () => {
      const newStatus = isActive ? "DRAFT" : "ACTIVE";
      await toggleEventStatus(eventId, tenantId, subdomain, newStatus);
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`
        px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2
        ${isActive 
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200" 
          : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30 shadow-lg"}
        disabled:opacity-50
      `}
    >
      {isPending ? (
        "Processando..."
      ) : isActive ? (
        "⏸ Pausar Evento"
      ) : (
        "▶️ ATIVAR EVENTO (AO VIVO)"
      )}
    </button>
  );
}