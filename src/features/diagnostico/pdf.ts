import { jsPDF } from "jspdf";
import simbolo from "@/assets/simbolo.png";
import { KPI_INIT_FIELDS } from "./data";
import {
  getActivePilares, getScore, getSortedByPct, getStatus,
} from "./logic";
import type { DiagnosticoSnapshot, Ramo } from "./types";

/* Paleta de marca */
const GREEN: [number, number, number] = [28, 61, 46];
const GOLD: [number, number, number] = [201, 168, 76];
const LINHO: [number, number, number] = [245, 237, 212];
const DARK: [number, number, number] = [26, 26, 24];
const GRAY: [number, number, number] = [113, 128, 150];
const LIGHT: [number, number, number] = [240, 237, 234];
const TRACK: [number, number, number] = [226, 232, 240];

const STATUS_COLORS: Record<string, [number, number, number]> = {
  critico: [197, 48, 48],
  atencao: [192, 86, 33],
  regular: [183, 121, 31],
  bom: [64, 145, 108],
  otimo: [49, 151, 149],
};
const STATUS_PILL_BG: Record<string, [number, number, number]> = {
  critico: [250, 232, 232],
  atencao: [251, 240, 228],
  regular: [248, 242, 225],
  bom: [228, 242, 234],
  otimo: [228, 244, 243],
};

/* jsPDF não tipa GState no instance; helper mínimo e isolado. */
type GStateCapable = {
  GState: new (o: { opacity: number }) => unknown;
  setGState: (g: unknown) => void;
};
function withOpacity(doc: jsPDF, opacity: number, draw: () => void) {
  const d = doc as unknown as GStateCapable;
  if (typeof d.GState === "function") {
    doc.saveGraphicsState();
    d.setGState(new d.GState({ opacity }));
    draw();
    doc.restoreGraphicsState();
  } else {
    draw();
  }
}

/* Carrega o símbolo da marca e o tinge na cor alvo, preservando o alpha. */
async function loadTintedSymbol(rgb: [number, number, number]): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = simbolo;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 300;
    canvas.height = img.naturalHeight || 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/* Extrai número de strings tipo "R$ 25.000", "55%", "2.000" */
function parseNum(s?: string): number {
  if (!s) return NaN;
  const cleaned = String(s)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
function fmtMoney(n: number): string {
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}

export async function generatePDF(snapshot: DiagnosticoSnapshot, notas?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 16;
  const CW = W - 2 * M;
  const BOTTOM = H - 22; // limite inferior do conteúdo (acima do rodapé)
  let y = M;

  const ramo: Ramo = snapshot.ramo ?? "dentista";
  const sel = snapshot.selOpts ?? {};
  const scores = snapshot.scores;
  const activePilares = getActivePilares(sel, ramo);
  const sorted = getSortedByPct(scores, sel, ramo);
  const { totalPct, classif, plano, client } = snapshot;

  const setFont = (size: number, style: "normal" | "bold" | "italic" = "normal", color: [number, number, number] = DARK) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const addPage = () => { doc.addPage(); y = M; };
  /* Regra Máquina de Orçamentos: bloco nunca parte entre páginas.
     Antes de desenhar um bloco atômico, garanta espaço para ele inteiro. */
  const ensure = (need: number) => { if (y + need > BOTTOM) addPage(); };

  // Título de seção. `follow` = altura do primeiro bloco, para o título
  // nunca ficar órfão no fim da página (regra break-after: avoid).
  const sectionTitle = (label: string, follow = 16) => {
    ensure(11 + follow);
    setFont(12.5, "bold", GREEN);
    doc.text(label, M, y);
    stroke(GOLD);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2.5, W - M, y + 2.5);
    doc.setLineWidth(0.2);
    y += 11;
  };

  /* Arco e medidor circular */
  const drawArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
    const steps = Math.max(2, Math.ceil(Math.abs(endDeg - startDeg) / 4));
    let prev: { x: number; y: number } | null = null;
    for (let i = 0; i <= steps; i++) {
      const a = ((startDeg + (endDeg - startDeg) * (i / steps)) * Math.PI) / 180;
      const x = cx + r * Math.cos(a);
      const yy = cy + r * Math.sin(a);
      if (prev) doc.line(prev.x, prev.y, x, yy);
      prev = { x, y: yy };
    }
  };
  const setCap = (s: "round" | "butt") =>
    (doc as unknown as { setLineCap: (v: string) => void }).setLineCap(s);
  const drawGauge = (cx: number, cy: number, r: number, pct: number) => {
    doc.setLineWidth(r * 0.18);
    setCap("round");
    withOpacity(doc, 0.2, () => { stroke(LINHO); drawArc(cx, cy, r, 0, 360); });
    stroke(GOLD);
    drawArc(cx, cy, r, -90, -90 + 360 * Math.max(pct, 0.001));
    setCap("butt");
    doc.setLineWidth(0.2);
    setFont(20, "bold", LINHO);
    doc.text(`${Math.round(pct * 100)}%`, cx, cy + 1, { align: "center" });
    setFont(6.5, "normal", [220, 210, 180]);
    doc.text("MATURIDADE", cx, cy + 6, { align: "center" });
  };

  // Caixa de texto que pagina mantendo o fundo por página (evita retângulo
  // vazando para fora e evita órfão de 1-2 linhas no fim da página).
  const drawTextBox = (lines: string[]) => {
    const lineH = 4.8;
    const padV = 4;
    let i = 0;
    while (i < lines.length) {
      let cap = Math.max(1, Math.floor((BOTTOM - y - padV * 2) / lineH));
      const remaining = lines.length - i;
      // se só cabe um resto pequeno e não estamos no topo, joga tudo pra próxima
      if (cap < remaining && cap < 3 && y > M) { addPage(); continue; }
      cap = Math.min(cap, remaining);
      const chunk = lines.slice(i, i + cap);
      const boxH = chunk.length * lineH + padV * 2;
      fill(LIGHT);
      doc.roundedRect(M, y, CW, boxH, 2, 2, "F");
      setFont(9, "normal", DARK);
      let ty = y + padV + 3.2;
      chunk.forEach((l) => { doc.text(l, M + 5, ty); ty += lineH; });
      y += boxH;
      i += cap;
      if (i < lines.length) addPage();
    }
    y += 6;
  };

  /* ========== PÁGINA 1: capa + panorama ========== */
  const heroH = 82;
  fill(GREEN);
  doc.rect(0, 0, W, heroH, "F");

  const sym = await loadTintedSymbol(LINHO);
  if (sym) withOpacity(doc, 0.08, () => doc.addImage(sym, "PNG", W - 70, -8, 70, 70));

  setFont(9, "normal", [200, 220, 210]);
  doc.text("RAIZ CONSULTORIA ESTRATÉGICA · CONFIDENCIAL", M, 13);
  setFont(27, "bold", GOLD);
  doc.text("Diagnóstico 360°", M, 31);
  setFont(11, "normal", LINHO);
  doc.text("Planejamento Estratégico & Próximos Passos", M, 39);

  const dataStr = client.data
    ? new Date(client.data + "T12:00").toLocaleDateString("pt-BR")
    : new Date(snapshot.timestamp).toLocaleDateString("pt-BR");
  setFont(9, "normal", [210, 225, 215]);
  doc.text(`${client.name}    ·    ${dataStr}${client.cidade ? "    ·    " + client.cidade : ""}`, M, 48);

  // selo de classificação
  const classifLabel = classif.label.replace(/[🚧⚡📈✅🏆]/g, "").trim();
  setFont(10, "bold", GOLD);
  const clW = doc.getTextWidth(classifLabel) + 10;
  stroke(GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, 55, clW, 8, 4, 4, "S");
  doc.setLineWidth(0.2);
  doc.text(classifLabel, M + 5, 60.3);
  setFont(8.5, "normal", [205, 220, 212]);
  doc.text(doc.splitTextToSize(classif.desc, 120), M, 71);

  // medidor à direita
  drawGauge(W - M - 22, 41, 22, totalPct);

  // perfil da clínica
  y = heroH + 12;
  const chips = [
    { label: "Perfil", value: client.tipo },
    { label: "Especialidade", value: client.especialidade || client.proc },
    { label: "Tempo de atuação", value: client.tempo },
    { label: "Pacientes / mês", value: client.pacientes },
    { label: ramo === "medico" ? "Salas" : "Cadeiras", value: client.cadeiras },
    { label: "Faturamento atual", value: client.fat },
  ].filter((c) => c.value && String(c.value).trim());
  const cols = 3;
  const gap = 4;
  const cardW = (CW - gap * (cols - 1)) / cols;
  const cardH = 17;
  const chipRows = Math.ceil(chips.length / cols);
  sectionTitle("PERFIL DA CLÍNICA", chipRows * (cardH + gap));
  chips.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = M + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    fill(LIGHT);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, "F");
    setFont(7, "bold", GRAY);
    doc.text(c.label.toUpperCase(), cx + 4, cy + 6);
    setFont(10, "bold", GREEN);
    doc.text(doc.splitTextToSize(String(c.value), cardW - 8)[0], cx + 4, cy + 13);
  });
  y += chipRows * (cardH + gap) + 4;

  // resumo da meta / dor
  if (client.meta || client.dor) {
    const faixaH = client.meta && client.dor ? 22 : 15;
    ensure(faixaH);
    fill(GREEN);
    doc.roundedRect(M, y, CW, faixaH, 2, 2, "F");
    let ly = y + 7;
    if (client.dor) {
      setFont(8, "bold", GOLD);
      doc.text("DOR RELATADA", M + 5, ly);
      setFont(8.5, "normal", LINHO);
      doc.text(doc.splitTextToSize(client.dor, CW - 50)[0], M + 38, ly);
      ly += 8;
    }
    if (client.meta) {
      setFont(8, "bold", GOLD);
      doc.text("META", M + 5, ly);
      setFont(8.5, "normal", LINHO);
      doc.text(doc.splitTextToSize(client.meta, CW - 50)[0], M + 38, ly);
    }
    y += faixaH + 8;
  }

  /* ========== Resultado por pilar (flui, não força página) ========== */
  sectionTitle("RESULTADO POR PILAR", 15);
  activePilares.forEach((p) => {
    ensure(15);
    const { pct } = getScore(scores, p.id, ramo);
    const st = getStatus(pct);
    const sc = STATUS_COLORS[st.cls] ?? GREEN;
    setFont(10, "bold", DARK);
    doc.text(`${p.num} · ${p.name}`, M, y);

    const pillBg = STATUS_PILL_BG[st.cls] ?? LIGHT;
    setFont(8, "bold", sc);
    const stW = doc.getTextWidth(st.label) + 7;
    fill(pillBg);
    doc.roundedRect(W - M - stW, y - 3.5, stW, 5.5, 2.5, 2.5, "F");
    doc.text(st.label, W - M - stW + 3.5, y + 0.3);
    setFont(9, "bold", sc);
    doc.text(`${Math.round(pct * 100)}%`, W - M - stW - 4, y, { align: "right" });

    y += 3.5;
    fill(TRACK);
    doc.roundedRect(M, y, CW, 3.5, 1.5, 1.5, "F");
    fill(sc);
    doc.roundedRect(M, y, Math.max(CW * pct, 1.5), 3.5, 1.5, 1.5, "F");
    y += 11;
  });
  y += 4;

  /* ========== Radar / mapa de maturidade (bloco atômico) ========== */
  const radarR = 38;
  const radarBlockH = radarR * 2 + 24;
  sectionTitle("MAPA DE MATURIDADE", radarBlockH);
  const rcx = W / 2;
  const rcy = y + radarR + 4;
  const radarPilares = activePilares;
  const n = radarPilares.length;
  const ang = (i: number) => ((-90 + (i * 360) / n) * Math.PI) / 180;
  const ptAt = (i: number, rad: number) => ({ x: rcx + rad * Math.cos(ang(i)), y: rcy + rad * Math.sin(ang(i)) });

  stroke([215, 220, 226]);
  doc.setLineWidth(0.2);
  [0.25, 0.5, 0.75, 1].forEach((lvl) => {
    for (let i = 0; i < n; i++) {
      const a = ptAt(i, radarR * lvl);
      const b = ptAt((i + 1) % n, radarR * lvl);
      doc.line(a.x, a.y, b.x, b.y);
    }
  });
  for (let i = 0; i < n; i++) {
    const a = ptAt(i, radarR);
    doc.line(rcx, rcy, a.x, a.y);
  }
  const pts = radarPilares.map((p, i) => {
    const { pct } = getScore(scores, p.id, ramo);
    return ptAt(i, radarR * Math.max(pct, 0.03));
  });
  withOpacity(doc, 0.25, () => {
    fill(GOLD);
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      doc.triangle(rcx, rcy, a.x, a.y, b.x, b.y, "F");
    }
  });
  stroke(GOLD);
  doc.setLineWidth(0.8);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    doc.line(a.x, a.y, b.x, b.y);
  }
  fill(GREEN);
  pts.forEach((pt) => doc.circle(pt.x, pt.y, 0.9, "F"));
  setFont(7, "bold", DARK);
  radarPilares.forEach((p, i) => {
    const lp = ptAt(i, radarR + 7);
    const label = p.name.split("&")[0].trim();
    const a = ang(i);
    const align = Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center";
    doc.text(label, lp.x, lp.y + 1, { align: align as "left" | "right" | "center", maxWidth: 34 });
  });
  doc.setLineWidth(0.2);
  y = rcy + radarR + 12;

  /* ========== Análise + prioridades + evidências ========== */
  const dor = client.dor || "não informada";
  const meta = client.meta || "não informada";
  const criticos = sorted.filter((p) => getScore(scores, p.id, ramo).pct < 0.35);
  const analiseTxt = (notas && notas.trim())
    || (snapshot.analise && snapshot.analise.trim())
    || (criticos.length > 0
      ? `Com base no diagnóstico de ${client.name}, identificamos ${criticos.length} pilar(es) crítico(s) que explicam diretamente a dor relatada: "${dor}". Os gargalos mais urgentes estão em ${criticos.slice(0, 2).map((p) => p.name.split("&")[0].trim()).join(" e ")}. Estruturar essas áreas é o próximo passo antes de escalar investimento. Para alcançar a meta de ${meta}, o caminho passa por organizar atendimento, conversão e financeiro com previsibilidade.`
      : `${client.name} apresenta boa maturidade nos pilares fundamentais. O foco agora é consolidar os pontos de atenção e escalar com consistência para alcançar a meta de ${meta}.`);

  const analiseLines = doc.splitTextToSize(analiseTxt, CW - 10);
  // título + ao menos as 3 primeiras linhas juntos
  sectionTitle("ANÁLISE ESTRATÉGICA", Math.min(analiseLines.length, 3) * 4.8 + 8);
  drawTextBox(analiseLines);

  // Prioridades
  setFont(11, "bold", GREEN);
  ensure(7 + 17);
  doc.text("Prioridades", M, y);
  y += 7;
  const prioInsights = [
    "Maior oportunidade imediata de impacto no faturamento. Ação urgente.",
    "Gargalo que bloqueia a escala do negócio. Resolver em seguida.",
    "Área importante para solidificar e sustentar o crescimento.",
    "Atenção estratégica para manter o avanço conquistado.",
  ];
  const prioCols: [number, number, number][] = [STATUS_COLORS.critico, STATUS_COLORS.atencao, STATUS_COLORS.regular, STATUS_COLORS.regular];
  sorted.slice(0, 4).forEach((p, i) => {
    ensure(17);
    const { pct } = getScore(scores, p.id, ramo);
    const c = prioCols[i];
    fill([249, 248, 246]);
    doc.roundedRect(M, y, CW, 14, 2, 2, "F");
    fill(c);
    doc.roundedRect(M, y, 2.5, 14, 1, 1, "F");
    setFont(7, "bold", GRAY);
    doc.text(`PRIORIDADE ${i + 1}`, M + 6, y + 5);
    setFont(9.5, "bold", DARK);
    doc.text(p.name, M + 6, y + 9.5);
    setFont(8.5, "normal", GRAY);
    doc.text(`${Math.round(pct * 100)}%`, W - M - 5, y + 5, { align: "right" });
    doc.text(doc.splitTextToSize(prioInsights[i], CW - 60)[0], M + 6, y + 12.5);
    y += 17;
  });
  y += 4;

  // Evidências do diagnóstico
  const evidencias: { pilar: string; q: string; label: string }[] = [];
  const pilaresById = new Map(activePilares.map((p) => [p.id, p]));
  criticos.slice(0, 3).forEach((cp) => {
    const def = pilaresById.get(cp.id);
    if (!def) return;
    def.questions.forEach((q, i) => {
      const v = scores[cp.id]?.[i];
      if (typeof v === "number" && v <= 1) {
        evidencias.push({ pilar: cp.name.split("&")[0].trim(), q: q.text, label: q.labels[v] });
      }
    });
  });
  if (evidencias.length > 0) {
    setFont(11, "bold", GREEN);
    ensure(7 + 12);
    doc.text("Evidências do diagnóstico", M, y);
    y += 7;
    evidencias.slice(0, 6).forEach((e) => {
      ensure(12);
      fill(STATUS_PILL_BG.critico);
      doc.circle(M + 1.5, y - 1, 1, "F");
      setFont(8, "bold", STATUS_COLORS.critico);
      doc.text(e.pilar, M + 5, y);
      setFont(8, "normal", DARK);
      doc.text(doc.splitTextToSize(e.q, CW - 8)[0], M + 5, y + 4);
      setFont(8, "italic", GRAY);
      doc.text(doc.splitTextToSize(`Resposta: "${e.label}"`, CW - 8)[0], M + 5, y + 8);
      y += 12;
    });
    y += 2;
  }

  /* ========== Indicadores vs mercado ========== */
  const kpis = snapshot.kpisIniciais ?? {};
  const fatAtual = parseNum(kpis.fat);
  const fatMeta = parseNum(kpis.meta_fat) || parseNum(client.meta);
  const kpiFields = KPI_INIT_FIELDS.filter((f) => f.key !== "fat" && f.key !== "meta_fat");
  const kpiRows = kpiFields
    .map((f) => {
      const val = parseNum(kpis[f.key]);
      const bench = parseNum(ramo === "medico" ? (f.benchmarkMed ?? f.benchmarkDent) : f.benchmarkDent);
      const label = ramo === "medico" && f.labelMedico ? f.labelMedico : f.label;
      return { label, val, bench, lowerBetter: f.key === "noshow", type: f.type };
    })
    .filter((r) => Number.isFinite(r.val));
  const hasFat = Number.isFinite(fatAtual) && Number.isFinite(fatMeta) && fatMeta > 0;

  if (hasFat || kpiRows.length > 0) {
    sectionTitle("INDICADORES vs MERCADO", hasFat ? 32 : 16);
    if (hasFat) {
      const pctMeta = Math.min(fatAtual / fatMeta, 1);
      ensure(26);
      fill(LIGHT);
      doc.roundedRect(M, y, CW, 26, 2, 2, "F");
      setFont(8, "bold", GRAY);
      doc.text("DA SITUAÇÃO ATUAL ATÉ A META", M + 5, y + 7);
      setFont(8.5, "bold", GREEN);
      doc.text(`Hoje: ${fmtMoney(fatAtual)}`, M + 5, y + 14);
      doc.text(`Meta: ${fmtMoney(fatMeta)}`, W - M - 5, y + 14, { align: "right" });
      const bw = CW - 10;
      fill(TRACK);
      doc.roundedRect(M + 5, y + 17, bw, 4, 2, 2, "F");
      fill(GOLD);
      doc.roundedRect(M + 5, y + 17, Math.max(bw * pctMeta, 2), 4, 2, 2, "F");
      setFont(7.5, "normal", GRAY);
      doc.text(`${Math.round(pctMeta * 100)}% do caminho até a meta`, M + 5, y + 24.5);
      y += 32;
    }
    kpiRows.forEach((r) => {
      ensure(16);
      const good = r.lowerBetter ? r.val <= r.bench : r.val >= r.bench;
      const c = good ? STATUS_COLORS.bom : STATUS_COLORS.atencao;
      const unit = r.type === "percent" ? "%" : "";
      const fmtV = r.type === "money" ? fmtMoney(r.val) : `${r.val}${unit}`;
      const fmtB = r.type === "money" ? fmtMoney(r.bench) : `${r.bench}${unit}`;
      setFont(9, "bold", DARK);
      doc.text(r.label, M, y);
      setFont(8.5, "bold", c);
      doc.text(fmtV, W - M, y, { align: "right" });
      y += 3.5;
      const scaleMax = Math.max(r.val, r.bench) * 1.25 || 1;
      fill(TRACK);
      doc.roundedRect(M, y, CW, 3.5, 1.5, 1.5, "F");
      fill(c);
      doc.roundedRect(M, y, Math.max(CW * (r.val / scaleMax), 1.5), 3.5, 1.5, 1.5, "F");
      const bx = M + CW * (r.bench / scaleMax);
      stroke(GREEN);
      doc.setLineWidth(0.6);
      doc.line(bx, y - 1, bx, y + 4.5);
      doc.setLineWidth(0.2);
      setFont(6.5, "normal", GRAY);
      doc.text(`mercado: ${fmtB}`, bx, y + 8, { align: bx > W / 2 ? "right" : "left" });
      y += 12;
    });
    y += 2;
  }

  /* ========== Plano + cronograma (sem valor/ROI) ========== */
  sectionTitle("PLANO RECOMENDADO", 30);
  fill(GOLD);
  doc.roundedRect(M, y, CW, 8, 2, 2, "F");
  setFont(10, "bold", GREEN);
  doc.text(plano.badge, M + 6, y + 5.5);
  y += 13;
  setFont(17, "bold", GREEN);
  doc.text(plano.name, M, y);
  y += 8;
  setFont(9, "normal", DARK);
  const dl = doc.splitTextToSize(plano.desc, CW);
  doc.text(dl, M, y);
  y += dl.length * 4.8 + 7;

  ensure(7 + 7);
  setFont(10, "bold", DARK);
  doc.text("Frentes de trabalho:", M, y);
  y += 7;
  plano.modulos.forEach((mod) => {
    ensure(7);
    fill(GREEN);
    doc.circle(M + 2, y - 1, 1, "F");
    setFont(9.5, "normal", DARK);
    doc.text(mod, M + 6, y);
    y += 6.5;
  });
  y += 4;
  ensure(13);
  fill(LIGHT);
  doc.roundedRect(M, y, CW, 13, 2, 2, "F");
  setFont(8, "bold", GRAY);
  doc.text("DURAÇÃO ESTIMADA", M + 6, y + 5.5);
  setFont(10, "bold", GREEN);
  doc.text(plano.duracao, M + 6, y + 10.5);
  y += 20;

  // Cronograma
  sectionTitle("CRONOGRAMA DE EXECUÇÃO", 13);
  const fases = [
    { n: "1", p: "Semanas 1–2", t: "Diagnóstico Profundo & Kickoff" },
    { n: "2", p: "Meses 1–2", t: `Estruturação: ${sorted[0]?.name.split("&")[0].trim() ?? ""}` },
    { n: "3", p: "Mês 2–3", t: `Ativação: ${sorted[1]?.name.split("&")[0].trim() ?? ""}` },
    { n: "4", p: "Mês 3+", t: "Aceleração & Consolidação" },
    { n: "5", p: "Resultado Final", t: "Crescimento Sustentável" },
  ];
  fases.forEach((f, idx) => {
    ensure(12);
    fill(GREEN);
    doc.circle(M + 4, y + 1, 4, "F");
    setFont(9, "bold", LINHO);
    doc.text(f.n, M + 4, y + 2.3, { align: "center" });
    if (idx < fases.length - 1 && y + 12 <= BOTTOM) {
      stroke([200, 210, 200]);
      doc.setLineWidth(0.4);
      doc.line(M + 4, y + 5.5, M + 4, y + 11.5);
      doc.setLineWidth(0.2);
    }
    setFont(7, "bold", GOLD);
    doc.text(f.p.toUpperCase(), M + 12, y);
    setFont(10, "bold", DARK);
    doc.text(f.t, M + 12, y + 4.5);
    y += 12;
  });

  /* ========== Rodapé em todas as páginas ========== */
  const pc = doc.internal.pages.length - 1;
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    fill(GREEN);
    doc.rect(0, H - 11, W, 11, "F");
    setFont(7.5, "normal", [200, 220, 210]);
    doc.text(`RAIZ CONSULTORIA ESTRATÉGICA · DIAGNÓSTICO 360° · ${client.name}`, M, H - 4);
    doc.text(`Pág. ${i}/${pc}`, W - M, H - 4, { align: "right" });
  }

  doc.save(`Diagnostico360_${client.name.replace(/\s+/g, "_")}_${dataStr.replace(/\//g, "-")}.pdf`);
}
