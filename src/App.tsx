import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/app/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NovaSenha from "./pages/NovaSenha";
import TrocarSenha from "./pages/TrocarSenha";
import Dashboard from "./pages/Dashboard";
import Ferramentas from "./pages/Ferramentas";
import Diagnostico from "./pages/ferramentas/Diagnostico";
import Orcamentos from "./pages/ferramentas/Orcamentos";
import NotFound from "./pages/NotFound";
import GestaoCliente from "./pages/consultor/GestaoCliente";

const queryClient = new QueryClient();

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Home />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Home pública */}
            <Route path="/" element={<HomeRoute />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/nova-senha" element={<NovaSenha />} />

            {/* Troca de senha obrigatória (cliente em primeiro acesso) */}
            <Route
              path="/trocar-senha"
              element={
                <ProtectedRoute allow={["cliente", "admin"]}>
                  <TrocarSenha />
                </ProtectedRoute>
              }
            />

            {/* Área autenticada */}
            <Route
              element={
                <ProtectedRoute allow={["cliente", "admin"]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allow={["admin"]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/ferramentas" element={<Ferramentas />} />
              <Route path="/ferramentas/diagnostico" element={<Diagnostico />} />
              <Route path="/ferramentas/orcamentos" element={<Orcamentos />} />
              <Route path="/consultor/clientes/:id" element={<GestaoCliente />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
