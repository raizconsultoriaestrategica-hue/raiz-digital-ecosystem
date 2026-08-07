import { describe, expect, it } from "vitest";
import {
  fromRamoCanonico,
  getPilaresByRamo,
  getPlanosByRamo,
  kpiBenchmarkByRamo,
  kpiCampoByRamo,
  kpiLabelByRamo,
  KPI_INIT_FIELDS,
  PILARES,
  PILARES_MEDICO,
  PILARES_PSICOLOGO,
  toRamoCanonico,
} from "@/features/diagnostico/data";
import {
  getActivePilares,
  getPlano,
  getTotals,
  initScores,
  isAutonomo,
  shouldSkipExpansao,
} from "@/features/diagnostico/logic";
import type { Ramo, ScoresMap, SelOpts } from "@/features/diagnostico/types";

const SEL_AUTONOMO: SelOpts = {
  tipo: "Psicólogo(a) Autônomo(a)",
  func: "Nenhum (só eu)",
};

const SEL_CLINICA: SelOpts = {
  tipo: "Clínica de Psicologia (3+ profissionais)",
  func: "4–6 funcionários",
};

/** Preenche todas as perguntas não puladas com a nota máxima (3). */
function preencherTudo(scores: ScoresMap): ScoresMap {
  const out: ScoresMap = {};
  Object.entries(scores).forEach(([pid, arr]) => {
    out[pid] = arr.map((v) => (v === "SKIP" ? "SKIP" : 3));
  });
  return out;
}

describe("ramo psicologia: estrutura dos pilares", () => {
  it("tem 7 pilares, 33 perguntas e a mesma pontuação máxima dos outros ramos", () => {
    expect(PILARES_PSICOLOGO).toHaveLength(7);

    const totalPerguntas = PILARES_PSICOLOGO.reduce((s, p) => s + p.questions.length, 0);
    expect(totalPerguntas).toBe(33);
    expect(totalPerguntas).toBe(PILARES.reduce((s, p) => s + p.questions.length, 0));
    expect(totalPerguntas).toBe(PILARES_MEDICO.reduce((s, p) => s + p.questions.length, 0));

    // ids alinhados com PILAR_MAP (p01..p07) e com os demais ramos
    expect(PILARES_PSICOLOGO.map((p) => p.id)).toEqual(PILARES.map((p) => p.id));
  });

  it("toda pergunta tem exatamente 4 opções de resposta", () => {
    PILARES_PSICOLOGO.forEach((p) => {
      p.questions.forEach((q) => {
        expect(q.labels).toHaveLength(4);
        expect(q.text.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it("marca como onlyWithTeam apenas as duas perguntas de equipe, todas no pilar 05", () => {
    const comEquipe = PILARES_PSICOLOGO.flatMap((p) =>
      p.questions.filter((q) => q.onlyWithTeam).map((q) => p.id),
    );
    expect(comEquipe).toEqual(["p05", "p05"]);
  });

  it("getPilaresByRamo devolve o conjunto certo por ramo", () => {
    expect(getPilaresByRamo("psicologo")).toBe(PILARES_PSICOLOGO);
    expect(getPilaresByRamo("medico")).toBe(PILARES_MEDICO);
    expect(getPilaresByRamo("dentista")).toBe(PILARES);
  });
});

describe("ramo psicologia: psicólogo autônomo", () => {
  it("é detectado como autônomo e pula o pilar de expansão", () => {
    expect(isAutonomo(SEL_AUTONOMO)).toBe(true);
    expect(shouldSkipExpansao(SEL_AUTONOMO)).toBe(true);

    const ativos = getActivePilares(SEL_AUTONOMO, "psicologo");
    expect(ativos).toHaveLength(6);
    expect(ativos.some((p) => p.id === "p07")).toBe(false);
  });

  it("responde 28 perguntas: 33 menos as 2 de equipe e as 3 de expansão", () => {
    const scores = initScores(SEL_AUTONOMO, "psicologo");
    const respondiveis = Object.values(scores)
      .flat()
      .filter((v) => v !== "SKIP").length;
    expect(respondiveis).toBe(28);
  });

  it("pontua 100% quando tudo é respondido com nota máxima", () => {
    const scores = preencherTudo(initScores(SEL_AUTONOMO, "psicologo"));
    const { totalScore, totalMax, totalPct } = getTotals(scores, SEL_AUTONOMO, "psicologo");

    expect(totalMax).toBe(28 * 3);
    expect(totalScore).toBe(totalMax);
    expect(totalPct).toBe(1);
  });
});

describe("ramo psicologia: clínica com equipe", () => {
  it("mantém os 7 pilares e as 33 perguntas", () => {
    expect(isAutonomo(SEL_CLINICA)).toBe(false);
    expect(shouldSkipExpansao(SEL_CLINICA)).toBe(false);
    expect(getActivePilares(SEL_CLINICA, "psicologo")).toHaveLength(7);

    const scores = initScores(SEL_CLINICA, "psicologo");
    const respondiveis = Object.values(scores)
      .flat()
      .filter((v) => v !== "SKIP").length;
    expect(respondiveis).toBe(33);
  });

  it("chega ao máximo de 99 pontos", () => {
    const scores = preencherTudo(initScores(SEL_CLINICA, "psicologo"));
    const { totalMax, totalPct } = getTotals(scores, SEL_CLINICA, "psicologo");
    expect(totalMax).toBe(33 * 3);
    expect(totalPct).toBe(1);
  });
});

describe("ramo psicologia: planos", () => {
  it("segue a mesma régua de faixas dos outros ramos", () => {
    expect(getPlano(0.2, "psicologo").name).toBe("Raiz de Base");
    expect(getPlano(0.5, "psicologo").name).toBe("Raiz de Crescimento");
    expect(getPlano(0.9, "psicologo").name).toBe("Raiz de Expansão");
  });

  it("não expõe faixa de preço: investimento vai só no planejamento", () => {
    getPlanosByRamo("psicologo").forEach((plano) => {
      expect(plano.valor).not.toMatch(/R\$/);
      expect(plano.valor).toContain("planejamento personalizado");
    });
  });

  it("mantém as faixas de preço nos ramos já existentes", () => {
    getPlanosByRamo("dentista").forEach((p) => expect(p.valor).toMatch(/R\$/));
    getPlanosByRamo("medico").forEach((p) => expect(p.valor).toMatch(/R\$/));
  });
});

describe("ramo psicologia: vocabulário de ramo no banco", () => {
  it("converte psicologo <-> psicologia sem afetar os outros ramos", () => {
    expect(toRamoCanonico("psicologo")).toBe("psicologia");
    expect(toRamoCanonico("medico")).toBe("medicina");
    expect(toRamoCanonico("dentista")).toBe("odontologia");

    expect(fromRamoCanonico("psicologia")).toBe("psicologo");
    expect(fromRamoCanonico("psicologo")).toBe("psicologo");
  });

  it("preserva o mapeamento legado dos ramos antigos", () => {
    (["medico", "medicina", "estetica", "outros"] as const).forEach((r) => {
      expect(fromRamoCanonico(r)).toBe("medico");
    });
    expect(fromRamoCanonico("odontologia")).toBe("dentista");
    expect(fromRamoCanonico("dentista")).toBe("dentista");
    expect(fromRamoCanonico(null)).toBe("dentista");
    expect(fromRamoCanonico(undefined)).toBe("dentista");
  });

  it("faz round-trip para todo ramo interno", () => {
    (["dentista", "medico", "psicologo"] as Ramo[]).forEach((r) => {
      expect(fromRamoCanonico(toRamoCanonico(r))).toBe(r);
    });
  });
});

describe("ramo psicologia: KPIs", () => {
  it("usa os rótulos do segmento sem quebrar os outros ramos", () => {
    const ticket = KPI_INIT_FIELDS.find((f) => f.key === "ticket")!;
    expect(kpiLabelByRamo(ticket, "psicologo")).toBe("Valor Médio por Sessão (R$)");
    expect(kpiLabelByRamo(ticket, "dentista")).toBe("Ticket Médio (R$)");

    const ocupacao = KPI_INIT_FIELDS.find((f) => f.key === "ocupacao")!;
    expect(kpiLabelByRamo(ocupacao, "psicologo")).toBe("Ocupação da Agenda (%)");
    expect(kpiLabelByRamo(ocupacao, "medico")).toBe("Proporção Particular (%)");
    expect(kpiLabelByRamo(ocupacao, "dentista")).toBe("Ocupação de Cadeiras (%)");
  });

  it("só traz benchmark de psicologia onde existe fonte real", () => {
    const ticket = KPI_INIT_FIELDS.find((f) => f.key === "ticket")!;
    // R$ 258: média da tabela de referência CFP/FENAPSI
    expect(kpiBenchmarkByRamo(ticket, "psicologo")).toBe("258");

    // Sem fonte pública confiável: ficam vazios até calibrarmos com clientes
    (["conversao", "ocupacao", "noshow", "margem"] as const).forEach((key) => {
      const f = KPI_INIT_FIELDS.find((x) => x.key === key)!;
      expect(kpiBenchmarkByRamo(f, "psicologo")).toBeUndefined();
    });
  });

  it("preserva os benchmarks de dentista e médico", () => {
    const conversao = KPI_INIT_FIELDS.find((f) => f.key === "conversao")!;
    expect(kpiBenchmarkByRamo(conversao, "dentista")).toBe("55");
    expect(kpiBenchmarkByRamo(conversao, "medico")).toBe("60");
  });

  it("grava a ocupação em campo próprio no ramo psicologia", () => {
    const ocupacao = KPI_INIT_FIELDS.find((f) => f.key === "ocupacao")!;
    expect(kpiCampoByRamo(ocupacao, "psicologo")).toBe("ocupacao_agenda");
    expect(kpiCampoByRamo(ocupacao, "medico")).toBe("proporcao_particular");
    expect(kpiCampoByRamo(ocupacao, "dentista")).toBe("ocupacao_cadeiras");
  });
});
