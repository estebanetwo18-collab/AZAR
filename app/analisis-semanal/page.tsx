import { Suspense } from "react";
import { AnalisisSemanal } from "@/components/analisis-semanal/AnalisisSemanal";
import { DashboardSkeleton } from "@/components/states";

export const metadata = { title: "Análisis semanal · Azar Latino" };

export default function AnalisisSemanalPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AnalisisSemanal />
    </Suspense>
  );
}
