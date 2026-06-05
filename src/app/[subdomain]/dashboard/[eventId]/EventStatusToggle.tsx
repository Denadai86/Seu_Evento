"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEventStatus } from "@/actions/event"; // Verifique se o caminho da action está correto
import { Power } from "lucide-react";

interface EventStatusToggleProps {
  eventId: string;
  initialStatus: string; // 🔥 CORRIGIDO: Agora aceita a String ("ACTIVE", "DRAFT") do Prisma
  tenantId: string;
  subdomain: string;     // 🔥 Recebendo o subdomain via props para evitar erro de hidratação
}

export default function EventStatusToggle({ eventId, initialStatus, tenantId, subdomain }: EventStatusToggleProps) {
  const router = useRouter();
  
  // O estado interno continua sendo true/false para a interface, baseado na String do banco
  const [isActive, setIsActive] = useState(initialStatus === "ACTIVE");
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    // Optimistic UI: Muda a cor do botão na hora antes mesmo do servidor responder
    setIsActive(!isActive);

    startTransition(async () => {
      try {
        // Define qual será a string enviada para o banco
        const newStatus: "ACTIVE" | "DRAFT" | "FINISHED" = !isActive ? "ACTIVE" : "DRAFT";

        // Chama a action na ordem correta que nós arrumamos antes
        const result = await toggleEventStatus(eventId, newStatus);
        
        if (!result.success) {
          // Se der erro no backend, desfaz a animação do botão
          setIsActive(isActive);
          alert(`Erro ao alterar status: ${result.error}`);
        } else {
          // Atualiza a página por trás para refletir o novo status nos outros componentes
          router.refresh(); 
        }
      } catch (error) {
        setIsActive(isActive);
        alert("Erro crítico ao comunicar com o servidor.");
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
        isActive 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" 
          : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
      }`}
    >
      <Power size={18} className={isPending ? "animate-pulse" : ""} />
      {isActive ? "Evento Ativo" : "Evento Inativo"}
    </button>
  );
}