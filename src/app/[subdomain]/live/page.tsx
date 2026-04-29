export default function LiveSorteioPage({ params }: { params: { subdomain: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <div className="text-center">
        <h1 className="text-3xl font-black mb-2 text-emerald-400">
          Painel do Locutor
        </h1>
        <p className="text-slate-400">
          Organização: <span className="font-mono text-white">{params.subdomain}</span>
        </p>
        <p className="mt-8 text-sm text-slate-500">O globo de sorteio entrará aqui em breve...</p>
      </div>
    </div>
  );
}