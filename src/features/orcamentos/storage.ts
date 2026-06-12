import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PLANOS } from "./data";
import type { OrcamentoForm } from "./types";

export interface OrcamentoSalvo {
  id: string;
  cliente_id: string;
  plano: string;
  plano_nome: string | null;
  valor: string | null;
  score: number | null;
  score_max: number | null;
  storage_path: string;
  file_name: string;
  created_at: string;
}

/**
 * Captura o nó .orc-doc do DOM e gera um Blob PDF (A4, multi-página).
 * Requer que o preview esteja renderizado na página.
 */
export async function generateOrcamentoPDFBlob(): Promise<Blob> {
  const node = document.querySelector<HTMLElement>(".orc-doc");
  if (!node) throw new Error("Preview do orçamento não encontrado na tela.");

  // Sanitiza imagens quebradas no DOM original (evita erro de createPattern)
  const imgsLive = node.querySelectorAll("img");
  imgsLive.forEach((img) => {
    const i = img as HTMLImageElement;
    if (!i.complete || i.naturalWidth === 0 || i.naturalHeight === 0) {
      i.src = "";
    }
  });

  const scale = 2.5;
  const canvas = await html2canvas(node, {
    useCORS: true,
    allowTaint: false,
    imageTimeout: 15000,
    foreignObjectRendering: false,
    scale,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc) => {
      const imgs = clonedDoc.querySelectorAll(".orc-doc img");
      imgs.forEach((img) => {
        const i = img as HTMLImageElement;
        if (!i.complete || i.naturalWidth === 0 || i.naturalHeight === 0) {
          i.src = "";
        }
      });
    },
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWmm = pdf.internal.pageSize.getWidth();
  const pageHmm = pdf.internal.pageSize.getHeight();
  const pxPerMm = canvas.width / pageWmm;
  const pageHpx = Math.floor(pageHmm * pxPerMm);

  // Pontos de quebra permitidos: topo da capa e de cada seção, em px do canvas.
  // Quebrar nesses limites evita cortar conteúdo no meio.
  const breakEls = Array.from(node.querySelectorAll<HTMLElement>(".pg-cover, .orc-section"));
  const breakSet = new Set<number>([0, canvas.height]);
  for (const el of breakEls) breakSet.add(Math.round(el.offsetTop * scale));
  const breaks = Array.from(breakSet)
    .filter((b) => b >= 0 && b <= canvas.height)
    .sort((a, b) => a - b);

  // Paginação gulosa: empacota o máximo de seções por página sem estourar a A4.
  const slice = document.createElement("canvas");
  const ctx = slice.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a página do PDF.");

  let pageStart = 0;
  let first = true;
  let guard = 0;
  while (pageStart < canvas.height - 1 && guard++ < 100) {
    const maxEnd = pageStart + pageHpx;
    // maior ponto de quebra que cabe nesta página
    let pageEnd = -1;
    for (const b of breaks) {
      if (b > pageStart && b <= maxEnd) pageEnd = b;
    }
    // Seção mais alta que uma página: corte forçado (inevitável)
    if (pageEnd <= pageStart) pageEnd = Math.min(maxEnd, canvas.height);

    const sliceH = pageEnd - pageStart;
    slice.width = canvas.width;
    slice.height = sliceH;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, sliceH);
    ctx.drawImage(canvas, 0, pageStart, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const imgData = slice.toDataURL("image/jpeg", 0.95);
    const imgHmm = sliceH / pxPerMm;
    if (!first) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pageWmm, imgHmm);
    first = false;
    pageStart = pageEnd;
  }

  return pdf.output("blob");
}

export interface ModuloSelecionado {
  id: string;   // UUID da tabela modulos
  fase: number; // 1 | 2 | 3
}

/**
 * Distribui módulos por mês de execução baseado na fase:
 * - Fase 1 → meses 1 e 2 (split ~meio a meio)
 * - Fase 2 → mês 3
 * - Fase 3 → mês 4 em diante (1 por mês)
 */
function distribuirMesesExecucao(
  modulos: ModuloSelecionado[]
): Array<ModuloSelecionado & { mes_execucao: number }> {
  const f1 = modulos.filter((m) => m.fase === 1);
  const f2 = modulos.filter((m) => m.fase === 2);
  const f3 = modulos.filter((m) => m.fase === 3);

  const result: Array<ModuloSelecionado & { mes_execucao: number }> = [];

  // Fase 1 → divide entre mês 1 e mês 2
  const meio = Math.ceil(f1.length / 2);
  f1.forEach((m, i) => {
    result.push({ ...m, mes_execucao: i < meio ? 1 : 2 });
  });

  // Fase 2 → todos no mês 3
  f2.forEach((m) => {
    result.push({ ...m, mes_execucao: 3 });
  });

  // Fase 3 → 1 por mês a partir do mês 4 (clamp em 12. Constraint do banco)
  f3.forEach((m, i) => {
    result.push({ ...m, mes_execucao: Math.min(4 + i, 12) });
  });

  return result;
}

/**
 * Salva o orçamento atual no Supabase Storage + tabela orcamentos.
 * Em seguida cria os registros em cliente_modulos e ativa o projeto.
 * Requer cliente vinculado.
 */
export async function saveOrcamento(
  form: OrcamentoForm,
  clienteId: string,
  modulosSelecionados: ModuloSelecionado[] = []
): Promise<{
  orcamentoId: string;
  fileName: string | null;
  storagePath: string | null;
  pdfFailed: boolean;
}> {
  try {
    if (!clienteId) throw new Error("Selecione um cliente vinculado antes de salvar.");

    console.log("[saveOrcamento] início", {
      clienteId,
      modulosRecebidos: modulosSelecionados.length,
      amostra: modulosSelecionados.slice(0, 3),
    });

    const planoInfo = PLANOS[form.plano];
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeNome = (form.nomeClinica || form.nomeCliente || "cliente")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `orcamento-${safeNome}-${ts}.pdf`;
    const storagePath = `${clienteId}/${fileName}`;

    // === PDF + Upload (best-effort, não bloqueia o salvamento) ===
    let pdfFailed = false;
    let savedFileName: string | null = null;
    let savedStoragePath: string | null = null;

    try {
      const blob = await generateOrcamentoPDFBlob();
      console.log("[saveOrcamento] PDF gerado", blob.size);

      const { error: upErr } = await supabase.storage
        .from("orcamentos")
        .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      console.log("[saveOrcamento] upload ok", storagePath);
      savedFileName = fileName;
      savedStoragePath = storagePath;
    } catch (pdfErr) {
      pdfFailed = true;
      console.warn("[saveOrcamento] PDF/upload falhou. Prosseguindo sem PDF", pdfErr);
    }

    const { data: userRes } = await supabase.auth.getUser();

    // Valor final numérico (parse robusto)
    const valorFinalNum = form.valorFinal ? Number(String(form.valorFinal).replace(/[^\d.,-]/g, "").replace(",", ".")) : null;
    const valorFinalNumerico = valorFinalNum && !isNaN(valorFinalNum) && valorFinalNum > 0 ? valorFinalNum : null;

    // === Passo C. Insert do orçamento (com ou sem PDF) ===
    const { data: orcInserted, error: insErr } = await supabase
      .from("orcamentos")
      .insert({
        cliente_id: clienteId,
        plano: form.plano,
        plano_nome: planoInfo?.name ?? null,
        valor: form.valorFinal
          ? `R$ ${Number(form.valorFinal).toLocaleString("pt-BR")}`
          : (planoInfo?.valor ?? null),
        score: form.score ? Number(form.score) : null,
        score_max: form.scoreMax ? Number(form.scoreMax) : null,
        storage_path: savedStoragePath,
        file_name: savedFileName,
        created_by: userRes.user?.id ?? null,
        analise_ia: form.analise || null,
        ancoragem_ia: form.ancoragemIA || null,
        valor_final_numerico: valorFinalNumerico,
        dor_principal: form.dor || null,
      })
      .select("id")
      .single();
    if (insErr || !orcInserted) {
      // se o PDF foi enviado mas o insert falhou, limpa o arquivo órfão
      if (savedStoragePath) {
        await supabase.storage.from("orcamentos").remove([savedStoragePath]);
      }
      throw insErr ?? new Error("Falha ao inserir orçamento.");
    }
    console.log("[saveOrcamento] orcamento inserido", orcInserted);

    const orcamentoId = orcInserted.id;

    // === Passo D. Cliente_modulos ===
    if (modulosSelecionados.length > 0) {
      const distribuidos = distribuirMesesExecucao(modulosSelecionados);
      const rows = distribuidos.map((m) => ({
        cliente_id: clienteId,
        modulo_id: m.id,
        orcamento_id: orcamentoId,
        mes_execucao: m.mes_execucao,
        status: "pendente",
      }));

      console.log("[saveOrcamento] inserindo cliente_modulos", rows.length, rows);

      const { data: cmData, error: cmErr } = await supabase
        .from("cliente_modulos")
        .upsert(rows, {
          onConflict: "cliente_id,modulo_id",
          ignoreDuplicates: true,
        })
        .select();
      if (cmErr) throw cmErr;
      console.log("[saveOrcamento] cliente_modulos inseridos", cmData);
    } else {
      console.log("[saveOrcamento] nenhum módulo selecionado");
    }

    // === Passo E. Avançar funil para "proposta enviada" ===
    // Gerar orçamento NÃO ativa o cliente. Ativar é uma ação explícita
    // ("Ativar como cliente"), que exige plano/valor. Aqui só avançamos o
    // funil de lead/diagnóstico para proposta_enviada, sem rebaixar quem
    // já está ativo ou encerrado.
    const { data: updData, error: updErr } = await supabase
      .from("clientes")
      .update({ status: "proposta_enviada" })
      .eq("id", clienteId)
      .in("status", ["lead", "diagnostico_feito"])
      .select("id, status");
    if (updErr) throw updErr;
    console.log("[saveOrcamento] cliente atualizado", updData);

    // === Passo F. Criar contrato em contratos_raiz ===
    try {
      const DURACAO_MESES: Record<string, number> = { base: 4, crescimento: 5, expansao: 6 };
      const duracao = DURACAO_MESES[form.plano] ?? 5;
      // valorFinal é a MENSALIDADE (o PDF mostra "R$ X/mês"), não o total do ciclo.
      // valor_mensal do contrato deve ser igual à mensalidade, sem dividir pela
      // duração: caso contrário o MRR do painel admin fica subestimado.
      const valorMensal = valorFinalNumerico && valorFinalNumerico > 0 ? Math.round(valorFinalNumerico) : 0;

      const dataInicioStr = form.data || new Date().toISOString().slice(0, 10);
      const dataInicio = new Date(dataInicioStr + "T12:00:00");
      const dataFim = new Date(dataInicio);
      dataFim.setMonth(dataFim.getMonth() + duracao);

      const clienteNome = form.nomeClinica || form.nomeCliente || "Cliente";

      const { error: contratoErr } = await supabase
        .from("contratos_raiz")
        .insert({
          cliente_id: clienteId,
          cliente_nome: clienteNome,
          plano: planoInfo?.name ?? form.plano,
          valor_mensal: valorMensal,
          data_inicio: dataInicioStr,
          data_fim: dataFim.toISOString().slice(0, 10),
          status: "ativo",
        });
      if (contratoErr) {
        console.warn("[saveOrcamento] falha ao criar contrato_raiz", contratoErr);
      } else {
        console.log("[saveOrcamento] contrato_raiz criado");
      }
    } catch (cErr) {
      console.warn("[saveOrcamento] erro inesperado ao criar contrato_raiz", cErr);
    }

    return {
      orcamentoId,
      fileName: savedFileName,
      storagePath: savedStoragePath,
      pdfFailed,
    };
  } catch (error) {
    console.error("[saveOrcamento] ERRO", error);
    throw error;
  }
}

export async function listOrcamentosByCliente(clienteId: string): Promise<OrcamentoSalvo[]> {
  const { data, error } = await supabase
    .from("orcamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as OrcamentoSalvo[];
}

export async function downloadOrcamento(orc: OrcamentoSalvo) {
  const { data, error } = await supabase.storage
    .from("orcamentos")
    .createSignedUrl(orc.storage_path, 60);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("URL não disponível.");
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = orc.file_name;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function deleteOrcamento(orc: OrcamentoSalvo) {
  await supabase.storage.from("orcamentos").remove([orc.storage_path]);
  const { error } = await supabase.from("orcamentos").delete().eq("id", orc.id);
  if (error) throw error;
}
