import { NextResponse } from "next/server";
import pauta from "@/data/pauta-octubre.json";

// Se sirve por API (protegida por el middleware) para que los datos no queden en el bundle público.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(pauta, { headers: { "Cache-Control": "private, no-store" } });
}
