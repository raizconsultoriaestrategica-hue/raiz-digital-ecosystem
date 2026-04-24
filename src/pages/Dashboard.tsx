import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "./dashboard/AdminDashboard";
import ClienteDashboard from "@/features/cliente-dashboard/ClienteDashboard";

export default function Dashboard() {
  const { role } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  return (
    // Anula o padding do AppLayout para o dashboard do cliente ocupar toda a área útil.
    <div className="-m-6 md:-m-10">
      <ClienteDashboard />
    </div>
  );
}
