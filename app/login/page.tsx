"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo iniciar sesión");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-brand-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-azar/10 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Image src="/logo.png" alt="Azar Latino" width={88} height={88} priority className="h-[88px] w-[88px] rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-white/15" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Azar Latino</h1>
          <p className="mt-1 text-sm text-white/60">Control de inversión · Google Ads</p>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-ink/70 p-6 shadow-2xl backdrop-blur-xl">
          <label htmlFor="password" className="text-sm font-medium text-white/80">
            Contraseña
          </label>
          <div className="relative mt-2">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-11 text-white outline-none transition placeholder:text-white/30 focus:border-azar focus:bg-white/10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/40 hover:text-white"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-red-300">
              {error}
            </motion.p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-azar font-medium text-white shadow-lg shadow-azar/30 transition hover:bg-azar-bright disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </button>
        </form>
      </motion.div>
    </main>
  );
}
