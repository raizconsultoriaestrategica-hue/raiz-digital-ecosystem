import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/financeiro-raiz", label: "Visão Geral", end: true },
  { to: "/financeiro-raiz/contratos", label: "Contratos & Clientes" },
  { to: "/financeiro-raiz/pagamentos", label: "Pagamentos" },
  { to: "/financeiro-raiz/contas-pagar", label: "Contas a Pagar" },
];

export default function FinanceiroLayout() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-verde-raiz">Financeiro Raiz</h1>
        <p className="font-body text-sm text-quase-preto/70">
          Gestão financeira interna da consultoria — contratos, pagamentos e custos.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-white p-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "rounded-md px-4 py-2 font-body text-sm transition-colors",
                isActive
                  ? "bg-verde-raiz text-linho"
                  : "text-quase-preto/70 hover:bg-off-white",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
