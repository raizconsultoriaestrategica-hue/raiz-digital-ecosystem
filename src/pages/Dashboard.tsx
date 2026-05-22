import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PageSkeleton from "@/components/app/PageSkeleton";

const AdminDashboard = lazy(() => import("./dashboard/AdminDashboard"));
const ClienteDashboard = lazy(() => import("@/features/cliente-dashboard/ClienteDashboard"));

export default function Dashboard() {
  const { role } = useAuth();
  if (role === "admin") {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <AdminDashboard />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      {/* Anula o padding do AppLayout para o dashboard do cliente ocupar toda a área útil. */}
      <div className="-m-6 md:-m-10">
        <ClienteDashboard />
      </div>
    </Suspense>
  );
}
