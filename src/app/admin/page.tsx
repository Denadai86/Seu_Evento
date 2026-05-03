//src/app/admin/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth();

  // 🔐 Proteção total
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/login");
  }

  return <AdminClient session={session} />;
}