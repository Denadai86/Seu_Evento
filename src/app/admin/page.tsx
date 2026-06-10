//src/app/admin/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import type { Session } from "next-auth";
import AdminClient from "./AdminClient";

const AdminClientTyped = AdminClient as ComponentType<{ session: Session }>;

export default async function AdminPage() {
  const session = await auth();

  // 🔐 Proteção total
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/login");
  }

  return <AdminClientTyped session={session} />;
}
