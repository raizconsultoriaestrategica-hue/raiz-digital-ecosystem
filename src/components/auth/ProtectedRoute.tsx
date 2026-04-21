import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
  /** Papéis permitidos. Admin sempre pode acessar áreas de cliente. */
  allow: AppRole[];
}

export default function ProtectedRoute({ children, allow }: Props) {
  const { session, role, primeiroAcesso, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-2xl text-verde-raiz">Raiz<span className="text-dourado">.</span></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Cliente em primeiro acesso → forçar troca de senha
  if (role === "cliente" && primeiroAcesso === true && location.pathname !== "/trocar-senha") {
    return <Navigate to="/trocar-senha" replace />;
  }

  // Admin pode tudo
  if (role === "admin") return <>{children}</>;

  if (!role || !allow.includes(role)) {
    if (role === "cliente" && !allow.includes("cliente")) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
