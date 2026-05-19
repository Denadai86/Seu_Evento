// src/app/[subdomain]/dashboard/[eventId]/PrizeManager.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { createPrize, deletePrize, updatePrizeOrders } from "@/actions/prize";
import { Plus, Trash2, Medal, Trophy, GripVertical, Star } from "lucide-react";
import { useRouter } from "next/navigation";

// Importações do Dnd-Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Prize {
  id: string;
  name: string;
  prizeName: string;
  type: "QUINA" | "FULL_HOUSE";
  order: number;
  sponsorId?: string | null;
}

// 🧩 Sub-componente: O Item Arrastável (Com Patrocinador)
function SortablePrizeItem({ prize, index, onDelete, isPending, sponsors = [] }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: prize.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const sponsor = sponsors.find((s: any) => s.id === prize.sponsorId);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-3 border rounded-xl p-3 group transition-colors 
        ${isDragging ? 'bg-slate-800 border-violet-500 shadow-xl opacity-90' : 'bg-black/20 border-slate-800 hover:border-slate-700'}`}
    >
      <div {...attributes} {...listeners} className="p-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-white transition">
        <GripVertical size={18} />
      </div>

      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${prize.type === 'FULL_HOUSE' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
        {prize.type === 'FULL_HOUSE' ? <Trophy size={20} /> : <Medal size={20} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate flex items-center gap-2">
          <span className="text-violet-400 text-xs font-mono bg-violet-900/30 px-2 py-0.5 rounded-md">
            #{index + 1}
          </span> 
          {prize.name}
        </p>
        <p className="text-slate-400 text-xs truncate mt-0.5 font-medium">
          {prize.prizeName}
        </p>
        {/* MOSTRA O PATROCINADOR (NAMING RIGHTS) */}
        {sponsor && (
          <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1 flex items-center gap-1 truncate">
            <Star size={10} /> Oferecimento: {sponsor.name}
          </p>
        )}
      </div>

      <button 
        onClick={() => onDelete(prize.id)}
        disabled={isPending}
        className="text-slate-500 hover:text-red-500 p-2 shrink-0 transition disabled:opacity-50"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

// 🎯 Componente Principal
export default function PrizeManager({ eventId, initialPrizes = [], sponsors = [] }: { eventId: string, initialPrizes?: Prize[], sponsors?: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  
  const [name, setName] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [type, setType] = useState<"QUINA" | "FULL_HOUSE">("QUINA");
  const [sponsorId, setSponsorId] = useState("");

  useEffect(() => {
    // 🔥 BLINDAGEM MÁXIMA ANTI-ERRO:
    if (!initialPrizes || !Array.isArray(initialPrizes)) {
      setPrizes([]);
      return;
    }
    const sorted = [...initialPrizes].sort((a, b) => a.order - b.order);
    setPrizes(sorted);
  }, [initialPrizes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = prizes.findIndex((p) => p.id === active.id);
      const newIndex = prizes.findIndex((p) => p.id === over.id);

      const newOrderedPrizes = arrayMove(prizes, oldIndex, newIndex);
      setPrizes(newOrderedPrizes);

      startTransition(async () => {
        const orderedIds = newOrderedPrizes.map(p => p.id);
        await updatePrizeOrders(orderedIds);
        router.refresh();
      });
    }
  };

  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !prizeName) return;

    startTransition(async () => {
      const nextOrder = prizes.length > 0 ? Math.max(...prizes.map(p => p.order)) + 1 : 1;
      await createPrize(eventId, name, type, prizeName, nextOrder, sponsorId || null);
      setName("");
      setPrizeName("");
      setType("QUINA");
      setSponsorId("");
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover esta rodada?")) return;
    startTransition(async () => {
      await deletePrize(id);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleAddPrize} className="flex flex-col gap-2 mb-6 shrink-0 bg-black/20 p-4 rounded-xl border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input 
            type="text" 
            placeholder="Nome (Ex: 1ª Rodada)" 
            value={prizeName} 
            onChange={(e) => setPrizeName(e.target.value)} 
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-violet-500" 
            required 
          />
          <input 
            type="text" 
            placeholder="Prêmio (Ex: R$ 500)" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-violet-500" 
            required 
          />
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value as any)} 
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="QUINA">Quina (Menor)</option>
            <option value="FULL_HOUSE">Cheia (Maior)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <select 
            value={sponsorId} 
            onChange={e => setSponsorId(e.target.value)}
            className="flex-1 bg-slate-900 border border-emerald-900/50 rounded-xl px-3 py-2 text-emerald-400 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Custeado pela Casa (Sem Patrocínio)</option>
            {sponsors.map((s: any) => (
              <option key={s.id} value={s.id}>🤝 {s.name}</option>
            ))}
          </select>

          <button type="submit" disabled={isPending} className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-bold transition disabled:opacity-50 shrink-0 flex items-center gap-2">
            <Plus size={18} /> Add
          </button>
        </div>
      </form>

      {/* ÁREA DE DRAG AND DROP */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {prizes.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-10 italic">Nenhuma rodada configurada.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={prizes} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {prizes.map((prize, index) => (
                  <SortablePrizeItem 
                    key={prize.id} 
                    prize={prize} 
                    index={index} 
                    onDelete={handleDelete} 
                    isPending={isPending}
                    sponsors={sponsors}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}