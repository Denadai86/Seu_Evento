// src/middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)",
  ],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  const currentHost =
    process.env.NODE_ENV === "production" && process.env.VERCEL === "1"
      ? hostname.replace(`.acaoleve.com`, "")
      : hostname.replace(`.localhost:3000`, "");

  const { pathname } = url;
  const session = req.auth;

  // 1. Área Master
  if (pathname.startsWith("/hub/admin")) {
    if (!session) return NextResponse.redirect(new URL("/entrar", req.url));
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 2. Subdomínios
  if (
    currentHost !== "localhost:3000" &&
    currentHost !== "acaoleve.com" &&
    currentHost !== "www"
  ) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/live")) {
      if (!session) {
        return NextResponse.redirect(new URL(`/entrar`, req.url));
      }

      if (
        session.user.subdomain !== currentHost &&
        session.user.role !== "SUPER_ADMIN"
      ) {
        return NextResponse.redirect(new URL(`/`, req.url));
      }

      if (
        pathname.startsWith("/dashboard") &&
        session.user.role === "OPERATOR"
      ) {
        return NextResponse.redirect(new URL(`/live`, req.url));
      }
    }

    return NextResponse.rewrite(
      new URL(`/${currentHost}${pathname}`, req.url)
    );
  }

  return NextResponse.next();
});