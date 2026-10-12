import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, authMode, sessionToken, timingSafeEqual } from "@/lib/auth";

export async function POST(req: Request) {
  const mode = authMode();
  if (mode === "misconfigured") {
    return NextResponse.json(
      { error: "Falta configurar DASHBOARD_PASSWORD en las variables de entorno." },
      { status: 500 },
    );
  }
  if (mode === "open") return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.DASHBOARD_PASSWORD!;
  if (!body.password || !timingSafeEqual(body.password, expected)) {
    // Pequeña demora para frenar fuerza bruta.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
