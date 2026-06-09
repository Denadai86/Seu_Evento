import AdminNavbar from "./_components/AdminNavbar";

export const metadata = {
  title: "AçãoLeve - God Mode",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      {/* A Navbar Global é injetada aqui */}
      <AdminNavbar />
      
      {/* O conteúdo da página (como o AdminClient) renderiza aqui */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}