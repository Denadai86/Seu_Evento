"use client";

import { useState } from "react";
import { addSponsor, removeSponsor } from "../../.././actions";

export default function SponsorManager({ eventId, initialSponsors }: { eventId: string, initialSponsors: any[] }) {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    let logoUrl = "";

    // 1. Upload para o Cloudinary (se houver arquivo)
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "acaoleve_sponsors"); // O preset que você criou
//CLOUDINARY_URL=cloudinary://244797743426591:o_AvTwlZwhdn15WwVBGEptXvER0@dq096xyrs
      const res = await fetch("https://api.cloudinary.com/v1_1/dq096xyrs/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      logoUrl = data.secure_url;
    }

    // 2. Salva no nosso banco com a URL da logo
    const newSponsor = await addSponsor(eventId, name, logoUrl);
    setSponsors([...sponsors, newSponsor]);
    
    // Limpa os campos
    setName("");
    setFile(null);
    setLoading(false);
  };

  return (
    <div className="p-8 border border-amber-200 rounded-2xl bg-amber-50 shadow-sm mb-6">
      <h2 className="text-xl font-bold text-amber-900 mb-4">Patrocinadores</h2>
      
      <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 mb-6">
        <input 
          type="text" 
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nome da Empresa"
          className="flex-1 border rounded-xl p-3 outline-none"
        />
        
        {/* Campo de Upload de Imagem */}
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="bg-white border rounded-xl p-2 text-sm text-slate-500"
          accept="image/*"
        />

        <button disabled={loading || !name.trim()} className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl">
          {loading ? "Enviando..." : "Adicionar"}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sponsors.map((sponsor) => (
          <div key={sponsor.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
            {sponsor.logoUrl && (
              <img src={sponsor.logoUrl} className="w-10 h-10 object-contain" alt="Logo" />
            )}
            <span className="flex-1 font-bold text-slate-700 text-sm">{sponsor.name}</span>
            <button onClick={() => removeSponsor(sponsor.id).then(() => setSponsors(sponsors.filter(s => s.id !== sponsor.id)))} className="text-red-400 text-xs">Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}