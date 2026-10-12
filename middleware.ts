import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authMode, sessionToken, timingSafeEqual } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/login" || pathname === "/api/login" || pathname === "/api/logout";
  const mode = authMode();
  if (mode === "open" || isPublic) return NextResponse.next();

  let ok = false;
  if (mode === "password") {
    const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? "";
    ok = timingSafeEqual(cookie, await sessionToken(process.env.DASHBOARD_PASSWORD!));
  }
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Todo excepto assets estáticos, el logo y los íconos.
  matcher: ["/((?!_next/static|_next/image|logo.png|icon.png|apple-icon.png|favicon.ico).*)"],
};
