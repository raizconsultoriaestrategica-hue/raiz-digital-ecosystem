import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IntroScreen } from "@/features/diagnostico/screens/IntroScreen";
import { DadosScreen } from "@/features/diagnostico/screens/DadosScreen";
import type { ClientData, SelOpts } from "@/features/diagnostico/types";

// O repositório de diagnósticos e o seletor de cliente batem no Supabase.
// Aqui só interessa a renderização do formulário, então ficam neutralizados.
vi.mock("@/features/diagnostico/screens/RepositorioDiagnosticos", () => ({
  RepositorioDiagnosticos: () => null,
}));
vi.mock("@/features/diagnostico/components/ClienteSelector", () => ({
  ClienteSelector: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  },
}));

const CLIENT_VAZIO: ClientData = {
  name: "", cidade: "", proc: "", objetivo: "", dor: "", meta: "", data: "",
  fat: "—", tipo: "—", func: "—", ticket: "—", cadeiras: "—", tempo: "—", pacientes: "—",
  especialidade: "", convenio: "", modalidade: "",
};

function renderDados(ramo: "dentista" | "medico" | "psicologo", selOpts: SelOpts = {}) {
  return render(
    <MemoryRouter>
      <DadosScreen
        client={CLIENT_VAZIO}
        selOpts={selOpts}
        ramo={ramo}
        kpisIniciais={{}}
        clienteId={null}
        onClientField={vi.fn()}
        onSel={vi.fn()}
        onRamoChange={vi.fn()}
        onKpiChange={vi.fn()}
        onClienteIdChange={vi.fn()}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("tela inicial: seleção de ramo", () => {
  it("mostra os três ramos, incluindo Psicologia", () => {
    render(<IntroScreen ramo="dentista" onRamoChange={vi.fn()} onStart={vi.fn()} />);

    expect(screen.getByText("Odontologia")).toBeInTheDocument();
    expect(screen.getByText("Saúde / Medicina")).toBeInTheDocument();
    expect(screen.getByText("Psicologia")).toBeInTheDocument();
    expect(screen.getByText("Psicólogos, consultórios e clínicas")).toBeInTheDocument();
  });

  it("lista os 7 pilares de psicologia e anuncia 33 perguntas", () => {
    render(<IntroScreen ramo="psicologo" onRamoChange={vi.fn()} onStart={vi.fn()} />);

    expect(screen.getByText("Marketing Digital & Posicionamento")).toBeInTheDocument();
    expect(screen.getByText("Relacionamento & Retenção")).toBeInTheDocument();
    expect(screen.getByText(/33 perguntas/)).toBeInTheDocument();
  });
});

describe("tela de dados: ramo psicologia", () => {
  it("usa os rótulos do segmento no lugar dos de odontologia", () => {
    renderDados("psicologo");

    expect(screen.getByText("Valor médio por sessão")).toBeInTheDocument();
    expect(screen.getByText("Sessões por semana")).toBeInTheDocument();
    expect(screen.getByText("Estrutura de atendimento")).toBeInTheDocument();
    expect(screen.getByText("Modalidade de atendimento")).toBeInTheDocument();
    expect(screen.getByText("% de receita de convênios/plataformas")).toBeInTheDocument();

    // Rótulos dos outros ramos não vazam
    expect(screen.queryByText("Ticket médio")).not.toBeInTheDocument();
    expect(screen.queryByText("Cadeiras / consultórios")).not.toBeInTheDocument();
    expect(screen.queryByText("Pacientes ativos / mês")).not.toBeInTheDocument();
  });

  it("oferece o tipo de operação e as abordagens de psicologia", () => {
    renderDados("psicologo");

    expect(screen.getByText("Psicólogo(a) Autônomo(a)")).toBeInTheDocument();
    expect(screen.getByText("Clínica de Psicologia (3+ profissionais)")).toBeInTheDocument();
    expect(screen.getByText("Atendo só online")).toBeInTheDocument();
    expect(screen.getByText("100% online")).toBeInTheDocument();
  });

  it("mostra o benchmark de sessão e omite os que não têm fonte", () => {
    renderDados("psicologo");

    expect(screen.getByText("Valor Médio por Sessão (R$)")).toBeInTheDocument();
    expect(screen.getByText("Ocupação da Agenda (%)")).toBeInTheDocument();
    // Único benchmark com fonte real (tabela CFP/FENAPSI)
    expect(screen.getByText(/Benchmark Raiz: 258/)).toBeInTheDocument();
    // Benchmarks de dentista não aparecem no ramo psicologia
    expect(screen.queryByText(/Benchmark Raiz: 2000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Benchmark Raiz: 75%/)).not.toBeInTheDocument();
  });
});

describe("tela de dados: ramos existentes seguem intactos", () => {
  it("odontologia mantém cadeiras, ticket e benchmarks originais", () => {
    renderDados("dentista");

    expect(screen.getByText("Ticket médio")).toBeInTheDocument();
    expect(screen.getByText("Cadeiras / consultórios")).toBeInTheDocument();
    expect(screen.getByText("Pacientes ativos / mês")).toBeInTheDocument();
    expect(screen.getByText("Ocupação de Cadeiras (%)")).toBeInTheDocument();
    expect(screen.getByText(/Benchmark Raiz: 2000/)).toBeInTheDocument();

    expect(screen.queryByText("Modalidade de atendimento")).not.toBeInTheDocument();
    expect(screen.queryByText("Sessões por semana")).not.toBeInTheDocument();
  });

  it("medicina mantém convênio e proporção particular", () => {
    renderDados("medico");

    expect(screen.getByText("% de receita por convênio")).toBeInTheDocument();
    expect(screen.getByText("Proporção Particular (%)")).toBeInTheDocument();
    expect(screen.getByText("Taxa de Agendamento (%)")).toBeInTheDocument();

    expect(screen.queryByText("Modalidade de atendimento")).not.toBeInTheDocument();
    expect(screen.queryByText("% de receita de convênios/plataformas")).not.toBeInTheDocument();
  });
});
