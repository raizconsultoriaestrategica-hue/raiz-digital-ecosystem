import { jsPDF } from "jspdf";
import type { CalcResult, DiagFinForm } from "./logic";
import { fmtBRL, fmtPct } from "./logic";

const GREEN: [number, number, number] = [28, 61, 46];
const GOLD: [number, number, number] = [201, 168, 76];
const DARK: [number, number, number] = [26, 26, 24];
const GRAY: [number, number, number] = [113, 128, 150];
const LIGHT: [number, number, number] = [240, 237, 234];
const STATUS: Record<string, [number, number, number]> = {
  verde: [64, 145, 108],
  amarelo: [192, 138, 33],
  vermelho: [197, 48, 48],
};

export function generateDiagFinPDF(form: DiagFinForm, calc: CalcResult, clienteNome?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 18;
  let y = M;

  const ensure = (need = 12) => {
    if (y + need > H - M) { doc.addPage(); y = M; }
  };

  // Header
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Diagnóstico Financeiro", M, 14);
  doc.setTextColor(240, 237, 234);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(clienteNome || form.dados.nome_profissional || "Cliente", M, 22);
  doc.text(new Date().toLocaleDateString("pt-BR"), W - M, 22, { align: "right" });
  y = 42;

  // Resumo executivo
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Resumo Executivo", M, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const status = calc.margemLiquida >= 20 ? "saudável" : calc.margemLiquida >= 10 ? "em alerta" : "crítica";
  const resumo =
    `Faturamento mensal de ${fmtBRL(calc.faturamento)} e custos totais de ${fmtBRL(calc.custosTotais)}, gerando lucro líquido de ${fmtBRL(calc.lucroLiquido)} (${fmtPct(calc.margemLiquida)}). ` +
    `Situação financeira ${status}. Ponto de equilíbrio atingido por volta do dia ${calc.diaPontoEquilibrio} do mês. ` +
    `${calc.alertas.length} indicador(es) requerem atenção.`;
  const lines = doc.splitTextToSize(resumo, W - 2 * M);
  doc.text(lines, M, y); y += lines.length * 5 + 4;

  // Indicadores
  ensure(20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text("Indicadores", M, y); y += 6;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  calc.indicadores.forEach((ind) => {
    ensure(8);
    if (ind.semaforo) {
      doc.setFillColor(...STATUS[ind.semaforo]);
      doc.circle(M + 2, y - 1.5, 1.6, "F");
    }
    doc.setTextColor(...DARK);
    doc.text(ind.label, M + 7, y);
    const val = ind.unidade === "%"
      ? fmtPct(ind.valor)
      : ind.unidade.startsWith("R$")
        ? fmtBRL(ind.valor) + (ind.unidade !== "R$" ? "/" + ind.unidade.split("/")[1] : "")
        : String(ind.valor);
    doc.setFont("helvetica", "bold");
    doc.text(val, W - M, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 6;
  });

  // Composição de custos
  y += 4;
  ensure(20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text("Composição de Custos", M, y); y += 6;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const composicao = [
    ["Custos fixos", calc.totalFixos],
    ["Custos variáveis", calc.totalVariaveis],
    ["Financiamentos", calc.totalFinanciamentos],
    ["TOTAL", calc.custosTotais],
  ];
  composicao.forEach(([label, val], i) => {
    ensure(7);
    if (i === composicao.length - 1) doc.setFont("helvetica", "bold");
    doc.text(String(label), M, y);
    doc.text(fmtBRL(Number(val)), W - M, y, { align: "right" });
    y += 6;
    doc.setFont("helvetica", "normal");
  });

  // Ranking
  y += 4;
  ensure(20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text("Maiores Custos", M, y); y += 6;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  calc.rankingCustos.slice(0, 10).forEach((r, i) => {
    ensure(6);
    doc.setTextColor(...GRAY);
    doc.text(`${i + 1}.`, M, y);
    doc.setTextColor(...DARK);
    doc.text(`${r.nome} (${r.tipo})`, M + 8, y);
    doc.text(fmtBRL(r.valor), W - M, y, { align: "right" });
    y += 5.5;
  });

  // Alertas
  if (calc.alertas.length) {
    y += 4;
    ensure(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.setTextColor(...GREEN);
    doc.text("Alertas e Recomendações", M, y); y += 6;
    calc.alertas.forEach((a) => {
      ensure(22);
      const color = STATUS[a.nivel];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(M, y - 3, 2, 16, "F");
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(a.titulo, M + 5, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const t = doc.splitTextToSize(a.texto, W - 2 * M - 5);
      doc.text(t, M + 5, y); y += t.length * 4.5;
      doc.setTextColor(...GREEN);
      const r = doc.splitTextToSize("→ " + a.recomendacao, W - 2 * M - 5);
      doc.text(r, M + 5, y); y += r.length * 4.5 + 4;
      doc.setTextColor(...DARK);
    });
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
