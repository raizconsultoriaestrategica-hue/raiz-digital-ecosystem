import { jsPDF } from "jspdf";
import {
  calcular,
  fmtBRL,
  fmtPct,
  POSICIONAMENTO_LABEL,
  type PrecificacaoForm,
} from "./logic";

const GREEN: [number, number, number] = [28, 61, 46];
const GOLD: [number, number, number] = [201, 168, 76];
const DARK: [number, number, number] = [26, 26, 24];
const GRAY: [number, number, number] = [113, 128, 150];

export interface PoliticaDescontos {
  resumo?: string;
  limites_desconto?: { tipo: string; limite_pct: number; observacao?: string }[];
  parcelamento?: string[];
  desconto_estrategico?: string[];
  pacotes_combos?: string[];
  perguntas?: string[];
}

export function generatePrecificacaoPDF(
  form: PrecificacaoForm,
  politica?: PoliticaDescontos | null,
  analiseIA?: { analise: string; insights: string[] } | null,
  clienteNome?: string,
) {
  const calc = calcular(form);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 18;
  let y = M;

  const ensure = (need = 12) => {
    if (y + need > H - M) { doc.addPage(); y = M; }
  };
  const h2 = (label: string) => {
    ensure(10);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.setTextColor(...GREEN);
    doc.text(label, M, y); y += 6;
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  };

  // Header
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Simulador de Precificação", M, 14);
  doc.setTextColor(240, 237, 234);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(clienteNome || form.nome_clinica || "Cliente", M, 22);
  doc.text(new Date().toLocaleDateString("pt-BR"), W - M, 22, { align: "right" });
  y = 42;

  // Configuração
  h2("Configuração");
  const cfgLines = [
    `Segmento: ${form.segmento || "—"}`,
    `Posicionamento: ${POSICIONAMENTO_LABEL[form.posicionamento]}`,
    `Horas/dia: ${form.horas_dia}   |   Dias/mês: ${form.dias_mes}`,
  ];
  cfgLines.forEach((l) => { ensure(6); doc.text(l, M, y); y += 5; });

  // KPIs
  y += 2; h2("Indicadores globais");
  const kpis: [string, string][] = [
    ["Faturamento total estimado", fmtBRL(calc.faturamento_total)],
    ["Lucro estimado", fmtBRL(calc.lucro_total)],
    ["Margem global", fmtPct(calc.margem_global_pct)],
    ["Custo por hora clínica", fmtBRL(calc.custo_hora_clinica)],
    ["Capacidade utilizada", fmtPct(calc.capacidade_utilizada_pct)],
    ["Total de custos fixos", fmtBRL(calc.total_custos_fixos)],
  ];
  kpis.forEach(([k, v]) => {
    ensure(6);
    doc.text(k, M, y);
    doc.setFont("helvetica", "bold");
    doc.text(v, W - M, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 5.5;
  });

  // Custos fixos
  y += 2; h2("Custos fixos mensais");
  form.custos_fixos.forEach((c) => {
    if (!c.nome && !c.valor) return;
    ensure(5.5);
    doc.text(c.nome || "—", M, y);
    doc.text(fmtBRL(c.valor), W - M, y, { align: "right" });
    y += 5;
  });

  // Procedimentos
  y += 2; h2("Procedimentos");
  form.procedimentos.forEach((p, i) => {
    const r = calc.por_procedimento[p.id];
    ensure(26);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`${i + 1}. ${p.nome || "Procedimento"}`, M, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(
      `Duração ${p.duracao_horas}h · Materiais ${fmtBRL(p.materiais)} · Lab ${fmtBRL(p.laboratorio)} · ${p.sessoes} sessão(ões) · Margem ${p.margem_alvo_pct}% · ${p.frequencia_mes}x/mês`,
      M, y,
    );
    y += 4.5;
    doc.setTextColor(...DARK);
    if (r) {
      const row = [
        ["Custo total", fmtBRL(r.custo_total)],
        ["Mínimo viável", fmtBRL(r.preco_minimo)],
        ["Estratégico", fmtBRL(r.preco_estrategico)],
        ["Faturamento/mês", fmtBRL(r.faturamento_mes)],
      ];
      const colW = (W - 2 * M) / 4;
      row.forEach(([k, v], idx) => {
        const x = M + idx * colW;
        doc.setFontSize(8); doc.setTextColor(...GRAY);
        doc.text(k, x, y);
        doc.setFontSize(10); doc.setTextColor(...DARK);
        doc.setFont("helvetica", "bold");
        doc.text(v, x, y + 4);
        doc.setFont("helvetica", "normal");
      });
      y += 9;
      if (r.alerta_abaixo_minimo) {
        doc.setTextColor(197, 48, 48);
        doc.setFontSize(9);
        doc.text(
          `! Preço praticado ${fmtBRL(p.preco_praticado)} abaixo do mínimo viável.`,
          M, y,
        );
        doc.setTextColor(...DARK);
        y += 5;
      }
    }
    y += 3;
  });

  // Análise IA
  if (analiseIA?.analise) {
    y += 2; h2("Análise estratégica (IA)");
    const lines = doc.splitTextToSize(analiseIA.analise, W - 2 * M);
    lines.forEach((l: string) => { ensure(5); doc.text(l, M, y); y += 4.6; });
    if (analiseIA.insights?.length) {
      y += 2; doc.setFont("helvetica", "bold"); doc.text("Insights acionáveis:", M, y); y += 5;
      doc.setFont("helvetica", "normal");
      analiseIA.insights.forEach((ins, i) => {
        const t = doc.splitTextToSize(`${i + 1}. ${ins}`, W - 2 * M);
        ensure(t.length * 4.6 + 2);
        doc.text(t, M, y); y += t.length * 4.6 + 1;
      });
    }
  }

  // Política de descontos
  if (politica && (politica.resumo || politica.limites_desconto?.length || politica.parcelamento?.length || politica.desconto_estrategico?.length || politica.pacotes_combos?.length)) {
    y += 2; h2("Política de descontos e parcelamento");
    if (politica.resumo) {
      const t = doc.splitTextToSize(politica.resumo, W - 2 * M);
      t.forEach((l: string) => { ensure(5); doc.text(l, M, y); y += 4.6; });
      y += 2;
    }
    const block = (title: string, items?: string[]) => {
      if (!items?.length) return;
      ensure(8);
      doc.setFont("helvetica", "bold"); doc.text(title, M, y); y += 5;
      doc.setFont("helvetica", "normal");
      items.forEach((it) => {
        const t = doc.splitTextToSize("• " + it, W - 2 * M - 4);
        ensure(t.length * 4.6);
        doc.text(t, M + 2, y); y += t.length * 4.6;
      });
      y += 2;
    };
    if (politica.limites_desconto?.length) {
      ensure(8);
      doc.setFont("helvetica", "bold"); doc.text("Limites de desconto", M, y); y += 5;
      doc.setFont("helvetica", "normal");
      politica.limites_desconto.forEach((ld) => {
        const txt = `• ${ld.tipo}: até ${ld.limite_pct}%${ld.observacao ? " — " + ld.observacao : ""}`;
        const t = doc.splitTextToSize(txt, W - 2 * M - 4);
        ensure(t.length * 4.6);
        doc.text(t, M + 2, y); y += t.length * 4.6;
      });
      y += 2;
    }
    block("Parcelamento", politica.parcelamento);
    block("Desconto estratégico vs prejuízo", politica.desconto_estrategico);
    block("Pacotes e combos", politica.pacotes_combos);
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Raiz Consultoria Estratégica", M, H - 8);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 8, { align: "right" });
  }

  return doc;
}
