import { jsPDF } from "jspdf";
import { PILARES } from "./data";
import { getStatus } from "./logic";
import type { DiagnosticoSnapshot } from "./types";

const GREEN: [number, number, number] = [28, 61, 46];
const GOLD: [number, number, number] = [201, 168, 76];
const DARK: [number, number, number] = [26, 26, 24];
const GRAY: [number, number, number] = [113, 128, 150];
const LIGHT: [number, number, number] = [240, 237, 234];
const STATUS_COLORS: Record<string, [number, number, number]> = {
  critico: [197, 48, 48],
  atencao: [192, 86, 33],
  regular: [183, 121, 31],
  bom: [64, 145, 108],
  otimo: [49, 151, 149],
};

function calcSavedScore(snapshot: DiagnosticoSnapshot, pid: string) {
  const p = PILARES.find((x) => x.id === pid);
  if (!p) return { total: 0, max: 0, pct: 0 };
  let total = 0;
  let max = 0;
  p.questions.forEach((_q, i) => {
    const v = snapshot.scores[pid]?.[i];
    if (v === "SKIP") return;
    total += typeof v === "number" ? v : 0;
    max += 3;
  });
  return { total, max, pct: max > 0 ? total / max : 0 };
}

export function generatePDF(snapshot: DiagnosticoSnapshot, notas?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 20;
  const CW = W - 2 * M;
  let y = M;

  const skipExp =
    snapshot.client.tipo === "Dentista Autônomo" ||
    snapshot.client.func === "Nenhum (só eu)" ||
    snapshot.client.func === "1–2 funcionários";
  const activePilares = skipExp ? PILARES.filter((p) => p.id !== "p07") : PILARES;

  const setFont = (size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = DARK) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const addPage = () => {
    doc.addPage();
    y = M;
  };
  const check = (need = 20) => {
    if (y + need > 275) addPage();
  };

  // Cabeçalho
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.rect(0, 0, W, 60, "F");
  setFont(10, "normal", [200, 220, 210]);
  doc.text("RAIZ CONSULTORIA ESTRATÉGICA · CONFIDENCIAL", M, 12);
  setFont(26, "bold", GOLD);
  doc.text("Diagnóstico 360°", M, 28);
  setFont(13, "normal", [255, 255, 255]);
  doc.text("Planejamento Estratégico & Orçamento", M, 36);
  y = 50;
  setFont(10, "normal", [200, 220, 210]);
  const dataStr = snapshot.client.data
    ? new Date(snapshot.client.data + "T12:00").toLocaleDateString("pt-BR")
    : new Date(snapshot.timestamp).toLocaleDateString("pt-BR");
  doc.text(`Cliente: ${snapshot.client.name}   |   Data: ${dataStr}   |   ${snapshot.client.cidade || ""}`, M, y);
  y = 72;

  // Score
  const { totalPct, classif, plano } = snapshot;
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.roundedRect(M, y, CW, 22, 2, 2, "F");
  setFont(10, "bold", GREEN);
  doc.text(`Maturidade Geral: ${Math.round(totalPct * 100)}%`, M + 6, y + 7);
  setFont(9, "normal", DARK);
  doc.text(`Classificação: ${classif.label.replace(/[🚧⚡📈✅🏆]/g, "").trim()}`, M + 6, y + 14);
  y += 28;

  // Pilares
  setFont(13, "bold", GREEN);
  doc.text("RESULTADO POR PILAR", M, y);
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.line(M, y + 2, W - M, y + 2);
  y += 10;
  activePilares.forEach((p) => {
    check(14);
    const { total, max, pct } = calcSavedScore(snapshot, p.id);
    const st = getStatus(pct);
    const sc = STATUS_COLORS[st.cls] ?? GREEN;
    const bw = CW - 52;
    setFont(10, "bold", DARK);
    doc.text(`${p.num} · ${p.name}`, M, y);
    setFont(9, "normal", GRAY);
    doc.text(`${Math.round(pct * 100)}%`, W - M, y, { align: "right" });
    y += 4;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(M, y, bw, 3, 1, 1, "F");
    doc.setFillColor(sc[0], sc[1], sc[2]);
    doc.roundedRect(M, y, Math.max(bw * pct, 1), 3, 1, 1, "F");
    setFont(8, "bold", sc);
    doc.text(st.label, M + bw + 3, y + 2.5);
    y += 10;
  });
  y += 4;

  // Análise
  const sorted = [...activePilares].sort((a, b) => calcSavedScore(snapshot, a.id).pct - calcSavedScore(snapshot, b.id).pct);
  const dor = snapshot.client.dor || "não informada";
  const meta = snapshot.client.meta || "não informada";
  const criticos = sorted.filter((p) => calcSavedScore(snapshot, p.id).pct < 0.35);
  if (y > 220) addPage();
  setFont(13, "bold", GREEN);
  doc.text("ANÁLISE ESTRATÉGICA", M, y);
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.line(M, y + 2, W - M, y + 2);
  y += 10;
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.roundedRect(M, y, CW, criticos.length > 0 ? 28 : 20, 2, 2, "F");
  setFont(9, "normal", DARK);
  if (criticos.length > 0) {
    doc.text(
      `Gargalos críticos: ${criticos.slice(0, 2).map((p) => p.name.split("&")[0].trim()).join(" e ")}.`,
      M + 4, y + 6, { maxWidth: CW - 8 },
    );
    doc.text(`Dor relatada: "${dor}"`, M + 4, y + 12, { maxWidth: CW - 8 });
    doc.text(`Meta: ${meta}`, M + 4, y + 18, { maxWidth: CW - 8 });
    y += 32;
  } else {
    doc.text(`${snapshot.client.name} apresenta boa maturidade. Meta: ${meta}.`, M + 4, y + 8, { maxWidth: CW - 8 });
    y += 24;
  }

  setFont(11, "bold", GREEN);
  doc.text("Prioridades", M, y);
  y += 7;
  const prioCols: [number, number, number][] = [[197, 48, 48], [192, 86, 33], [183, 121, 31], [183, 121, 31]];
  sorted.slice(0, 4).forEach((p, i) => {
    check(12);
    const { pct } = calcSavedScore(snapshot, p.id);
    const c = prioCols[i];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(M, y, 3, 7, 1, 1, "F");
    setFont(9, "bold", DARK);
    doc.text(`${i + 1}. ${p.name}`, M + 6, y + 4);
    setFont(8, "normal", GRAY);
    doc.text(`${Math.round(pct * 100)}% de maturidade`, W - M, y + 4, { align: "right" });
    y += 11;
  });
  y += 4;

  // Plano
  if (y > 220) addPage();
  setFont(13, "bold", GREEN);
  doc.text("PLANO RECOMENDADO & ORÇAMENTO", M, y);
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.line(M, y + 2, W - M, y + 2);
  y += 12;
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.roundedRect(M, y, CW, 8, 2, 2, "F");
  setFont(10, "bold", GREEN);
  doc.text(plano.badge, M + 6, y + 5.5);
  y += 12;
  setFont(16, "bold", GREEN);
  doc.text(plano.name, M, y);
  y += 8;
  setFont(9, "normal", DARK);
  const dl = doc.splitTextToSize(plano.desc, CW);
  doc.text(dl, M, y);
  y += dl.length * 5 + 6;
  setFont(10, "bold", DARK);
  doc.text("Módulos incluídos:", M, y);
  y += 6;
  plano.modulos.forEach((mod) => {
    check(8);
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.circle(M + 2, y - 1, 1, "F");
    setFont(9, "normal", DARK);
    doc.text(mod, M + 6, y);
    y += 6;
  });
  y += 4;
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.roundedRect(M, y, CW, 24, 2, 2, "F");
  setFont(9, "bold", GRAY);
  doc.text("INVESTIMENTO MENSAL", M + 6, y + 6);
  setFont(14, "bold", GREEN);
  doc.text(plano.valor, M + 6, y + 15);
  setFont(9, "normal", GRAY);
  doc.text(plano.duracao, M + 6, y + 21);
  setFont(9, "bold", GOLD);
  doc.text(`Potencial: ${plano.roi}`, W - M, y + 12, { align: "right" });
  y += 30;

  // Cronograma
  if (y > 220) addPage();
  setFont(13, "bold", GREEN);
  doc.text("CRONOGRAMA DE EXECUÇÃO", M, y);
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.line(M, y + 2, W - M, y + 2);
  y += 10;
  const fases = [
    { n: "1", p: "Semanas 1–2", t: "Diagnóstico Profundo & Kickoff" },
    { n: "2", p: "Meses 1–2", t: `Estruturação: ${sorted[0]?.name.split("&")[0].trim() ?? ""}` },
    { n: "3", p: "Mês 2–3", t: `Ativação: ${sorted[1]?.name.split("&")[0].trim() ?? ""}` },
    { n: "4", p: "Mês 3+", t: "Aceleração & Consolidação" },
    { n: "5", p: "Resultado Final", t: "Crescimento Sustentável" },
  ];
  fases.forEach((f) => {
    check(12);
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.circle(M + 3, y - 1, 3, "F");
    setFont(8, "bold", [255, 255, 255]);
    doc.text(f.n, M + 3, y - 0.5, { align: "center" });
    setFont(9, "bold", DARK);
    doc.text(f.t, M + 10, y);
    setFont(8, "normal", GRAY);
    doc.text(f.p, W - M, y, { align: "right" });
    y += 10;
  });

  // Notas
  if (notas && notas.trim()) {
    if (y > 220) addPage();
    y += 4;
    setFont(13, "bold", GREEN);
    doc.text("NOTAS DA REUNIÃO", M, y);
    doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.line(M, y + 2, W - M, y + 2);
    y += 10;
    setFont(9, "normal", DARK);
    doc.splitTextToSize(notas, CW - 8).forEach((line: string) => {
      check(7);
      doc.text(line, M + 4, y);
      y += 5.5;
    });
  }

  // Rodapé
  const pc = doc.internal.pages.length - 1;
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.rect(0, 286, W, 11, "F");
    setFont(8, "normal", [200, 220, 210]);
    doc.text(`RAIZ CONSULTORIA ESTRATÉGICA · DIAGNÓSTICO 360° · ${snapshot.client.name}`, M, 292);
    doc.text(`Pág. ${i}/${pc}`, W - M, 292, { align: "right" });
  }

  doc.save(`Diagnostico360_${snapshot.client.name.replace(/\s+/g, "_")}_${dataStr.replace(/\//g, "-")}.pdf`);
}
