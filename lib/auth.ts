/** Utilidades de sesión compatibles con Edge (middleware) y Node (API routes). */
export const SESSION_COOKIE = "azar_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

const enc = new TextEncoder();

/** Token de sesión = HMAC-SHA256 de una constante con la contraseña como clave. */
export async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("azar-latino-dashboard:v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Sin DASHBOARD_PASSWORD el dashboard queda abierto solo en desarrollo local.
 * En producción sin contraseña configurada se bloquea el acceso.
 */
export function authMode(): "password" | "open" | "misconfigured" {
  if (process.env.DASHBOARD_PASSWORD) return "password";
  return process.env.NODE_ENV === "production" ? "misconfigured" : "open";
}
