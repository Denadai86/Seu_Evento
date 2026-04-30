import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Em produção, você DEVE colocar JWT_SECRET no seu arquivo .env
const secretKey = process.env.JWT_SECRET || "chave-super-secreta-acaoleve-bingo-2026";
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Sessão dura 7 dias
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSession(userId: string, orgSlug: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  const session = await encrypt({ userId, orgSlug, role, expiresAt });
  
  const cookieStore = await cookies();
  cookieStore.set("acaoleve_session", session, {
    httpOnly: true, // Segurança máxima: impede que hackers roubem o cookie via JavaScript
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("acaoleve_session");
}