
//src/app/[subdomain]/dashboar/[eventoId]/SponsorManager.tsx
"use client";

import { useState, useTransition } from "react";
import { addSponsor, removeSponsor } from "@/actions/sponsor";

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface Props {
  eventId: string;
  initialSponsors: Sponsor[];
}

export default function SponsorManager({
  eventId,
  initialSponsors,
}: Props) {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    startTransition(async () => {
      let logoUrl = "";

      // 🎯 Upload Cloudinary
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "acaoleve_sponsors");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dq096xyrs/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();
        logoUrl = data.secure_url;
      }

      const newSponsor = await addSponsor(eventId, name, logoUrl);

      setSponsors((prev) => [...prev, newSponsor]);

      setName("");
      setFile(null);
    });
  };

  const handleRemove = (id: string) => {
    if (!confirm("Remover patrocinador?")) return;

    startTransition(async () => {
      await removeSponsor(id);
      setSponsors((prev) => prev.filter((s) => s.id !== id));
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">
          Patrocinadores
        </h3>
        {isPending && (
          <span className="text-sm text-amber-500 animate-pulse">
            Atualizando...
          </span>
        )}
      </div>

      {/* FORM */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col md:flex-row gap-3 mb-6"
      >
        <input
          type="text"
          placeholder="Nome da empresa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="flex-1 border border-gray-200 p-2.5 rounded-lg text-sm"
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isPending}
          className="text-sm"
          accept="image/*"
        />

        <button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
        >
          {isPending ? "Salvando..." : "Adicionar"}
        </button>
      </form>

      {/* LISTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sponsors.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Nenhum patrocinador cadastrado.
          </p>
        ) : (
          sponsors.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
            >
              {s.logoUrl && (
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  className="w-10 h-10 object-contain bg-white rounded"
                />
              )}

              <span className="flex-1 text-sm font-semibold text-slate-700">
                {s.name}
              </span>

              <button
                onClick={() => handleRemove(s.id)}
                disabled={isPending}
                className="text-red-500 text-xs hover:underline"
              >
                remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}