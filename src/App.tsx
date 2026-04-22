import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SiteLayout from "@/components/site/SiteLayout";
import AppLayout from "@/components/app/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NovaSenha from "./pages/NovaSenha";
import TrocarSenha from "./pages/TrocarSenha";
import Dashboard from "./pages/Dashboard";
import Ferramentas from "./pages/Ferramentas";
import Diagnostico from "./pages/ferramentas/Diagnostico";
import Orcamentos from "./pages/ferramentas/Orcamentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Site público */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
            </Route>

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
