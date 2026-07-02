//src/app/[subdomain]/entrar/magico/page.tsx

"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function MagicoPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    signIn("magic-token", {
      token,
      subdomain: params.subdomain,
      callbackUrl: `/dashboard`,
      redirect: true,
    }).catch(() => setStatus("error"));
  }, [token, params.subdomain]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 font-semibold">
          Link inválido ou expirado. Solicite um novo acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Autenticando, aguarde...</p>
    </div>
  );
}