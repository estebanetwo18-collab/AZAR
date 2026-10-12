import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { DashboardSkeleton } from "@/components/states";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
