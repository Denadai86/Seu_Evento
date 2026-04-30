//src/app/[subdomain]/page.tsx

export default function TenantHomePage({ params }: { params: { subdomain: string } }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 font-sans p-4">
      <div className="text-center">
        <h1 className="text-4xl font-black mb-4">
          Bem-vindo ao evento da <span className="text-emerald-600 uppercase">{params.subdomain}</span>
        </h1>
        <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
          A sala de espera para o nosso grande sorteio.
        </p>
        
        <div className="p-8 bg-white shadow-xl rounded-2xl border border-slate-100">
          <p className="font-bold text-slate-400 mb-4">Insira o código da sua cartela:</p>
          <input 
            type="text" 
            placeholder="Ex: K85U" 
            className="w-full text-center text-2xl font-black p-4 border-2 border-slate-200 rounded-xl mb-4 focus:border-emerald-500 outline-none uppercase"
          />
          <button className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-emerald-600 transition-colors">
            Acessar Cartela
          </button>
        </div>
      </div>
    </div>
  );
}