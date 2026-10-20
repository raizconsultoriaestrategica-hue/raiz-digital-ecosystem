import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

/*
 * Desde 20/10/2026 o site é só a página de apresentação da Raiz.
 * A área com login (painel do cliente, ferramentas, financeiro) saiu:
 * o Diagnóstico 360 virou ferramenta interna fora do site.
 * A plataforma completa está marcada no histórico na tag
 * `plataforma-completa-2026-10-20`.
 *
 * Endereços antigos da área logada levam para a página inicial,
 * para nenhum link salvo cair em "página não encontrada".
 */
const ROTAS_ANTIGAS = [
  "/login",
  "/nova-senha",
  "/trocar-senha",
  "/dashboard",
  "/painel",
  "/pasta-do-cliente",
  "/biblioteca",
  "/ferramentas/*",
  "/consultor/*",
  "/financeiro-raiz/*",
  "/saude-plataforma",
];

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          {ROTAS_ANTIGAS.map((path) => (
            <Route key={path} path={path} element={<Navigate to="/" replace />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
