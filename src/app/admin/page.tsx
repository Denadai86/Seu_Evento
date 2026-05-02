import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth();

  // 🔐 Proteção total
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/entrar");
  }

  return <AdminClient session={session} />;
}