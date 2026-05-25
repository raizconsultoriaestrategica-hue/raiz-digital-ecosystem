import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/app/AppLayout";
import PageSkeleton from "@/components/app/PageSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const NovaSenha = lazy(() => import("./pages/NovaSenha"));
const TrocarSenha = lazy(() => import("./pages/TrocarSenha"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ferramentas = lazy(() => import("./pages/Ferramentas"));
const Diagnostico = lazy(() => import("./pages/ferramentas/Diagnostico"));
const DiagnosticoFinanceiro = lazy(() => import("./pages/ferramentas/DiagnosticoFinanceiro"));
const SimuladorPrecificacao = lazy(() => import("./pages/ferramentas/SimuladorPrecificacao"));
const Orcamentos = lazy(() => import("./pages/ferramentas/Orcamentos"));
const GestaoCliente = lazy(() => import("./pages/consultor/GestaoCliente"));
const Biblioteca = lazy(() => import("./pages/Biblioteca"));
const FinanceiroLayout = lazy(() => import("./pages/financeiro/FinanceiroLayout"));
const VisaoGeral = lazy(() => import("./pages/financeiro/VisaoGeral"));
const Contratos = lazy(() => import("./pages/financeiro/Contratos"));
const Pagamentos = lazy(() => import("./pages/financeiro/Pagamentos"));
const ContasPagar = lazy(() => import("./pages/financeiro/ContasPagar"));
const PastaDoCliente = lazy(() => import("./pages/PastaDoCliente"));
const SaudePlataforma = lazy(() => import("./pages/admin/SaudePlataforma"));

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
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
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
                <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
                <Route path="/pasta-do-cliente" element={<PastaDoCliente />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute allow={["admin"]}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/biblioteca" element={<Biblioteca />} />
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
                <Route path="/ferramentas/diagnostico-financeiro" element={<DiagnosticoFinanceiro />} />
                <Route path="/ferramentas/precificacao" element={<SimuladorPrecificacao />} />
                <Route path="/ferramentas/simulador-precificacao" element={<SimuladorPrecificacao />} />
                <Route path="/ferramentas/orcamentos" element={<Orcamentos />} />
                <Route path="/consultor/clientes/:id" element={<GestaoCliente />} />

                <Route path="/financeiro-raiz" element={<FinanceiroLayout />}>
                  <Route index element={<VisaoGeral />} />
                  <Route path="contratos" element={<Contratos />} />
                  <Route path="pagamentos" element={<Pagamentos />} />
                  <Route path="contas-pagar" element={<ContasPagar />} />
                </Route>

                <Route path="/saude-plataforma" element={<SaudePlataforma />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
