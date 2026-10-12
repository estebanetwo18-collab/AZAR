import { NextResponse } from "next/server";
import { DataSourceError, getData } from "@/lib/data-source";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const payload = await getData(force);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const e = err instanceof DataSourceError ? err : new DataSourceError("Error inesperado al leer los datos.");
    console.error("[api/data]", err);
    return NextResponse.json({ error: e.message, hint: e.hint }, { status: e.status });
  }
}
