import { NextResponse } from "next/server";
import { AnalisisError, cargarAnalisis } from "@/lib/analisis-semanal/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const semana = new URL(req.url).searchParams.get("semana");
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const payload = await cargarAnalisis(semana);
    if (!payload) return NextResponse.json({ semanas: [], semana: null }, { headers });
    return NextResponse.json(payload, { headers });
  } catch (err) {
    const e = err instanceof AnalisisError ? err : new AnalisisError("No se pudo leer el análisis semanal.");
    console.error("[api/analisis-semanal]", err);
    return NextResponse.json({ error: e.message, hint: e.hint }, { status: e.status, headers });
  }
}
