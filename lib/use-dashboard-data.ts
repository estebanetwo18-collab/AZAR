"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, DataPayload } from "./types";

const POLL_MS = 60_000;

/** Carga /api/data, refresca cada 60 s y expone "Actualizar ahora". */
export function useDashboardData() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async (force: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/data${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setError(body as ApiError);
      } else {
        setData(body as DataPayload);
        setError(null);
      }
    } catch {
      setError({ error: "No se pudo conectar con el servidor.", hint: "Revisa tu conexión a internet e inténtalo de nuevo." });
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(false);
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { data, error, refreshing, refresh: () => load(true), retry: () => load(false) };
}

/** Texto relativo "hace X min" que se actualiza solo. */
export function useRelativeTime(iso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return "";
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "hace un momento";
  if (mins === 1) return "hace 1 min";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  return `hace ${h} h`;
}

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("azar-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };
  return { dark, toggle };
}
