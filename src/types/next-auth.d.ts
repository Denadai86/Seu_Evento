import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId?: string | null;
      subdomain?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    tenantId?: string | null;
    subdomain?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string | null;
    subdomain?: string | null;
  }
}