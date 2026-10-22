import { NextResponse } from "next/server";
import pauta from "@/data/pauta-octubre.json";
import presupuesto from "@/data/presupuesto-octubre.json";

// Se sirve por API (protegida por el middleware) para que los datos no queden en el bundle público.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ...pauta, presupuesto }, { headers: { "Cache-Control": "private, no-store" } });
}
