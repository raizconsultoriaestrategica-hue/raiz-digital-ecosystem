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

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
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

  // Fase 3 → 1 por mês a partir do mês 4
  f3.forEach((m, i) => {
    result.push({ ...m, mes_execucao: 4 + i });
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
) {
  if (!clienteId) throw new Error("Selecione um cliente vinculado antes de salvar.");

  const blob = await generateOrcamentoPDFBlob();

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

  const { error: upErr } = await supabase.storage
    .from("orcamentos")
    .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });
  if (upErr) throw upErr;

  const { data: userRes } = await supabase.auth.getUser();

  // Passo C — Insert do orçamento (retornando id)
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
      storage_path: storagePath,
      file_name: fileName,
      created_by: userRes.user?.id ?? null,
    })
    .select("id")
    .single();
  if (insErr || !orcInserted) {
    // rollback do arquivo
    await supabase.storage.from("orcamentos").remove([storagePath]);
    throw insErr ?? new Error("Falha ao inserir orçamento.");
  }

  const orcamentoId = orcInserted.id;

  // Passo D — Inserir módulos contratados em cliente_modulos
  if (modulosSelecionados.length > 0) {
    const distribuidos = distribuirMesesExecucao(modulosSelecionados);
    const rows = distribuidos.map((m) => ({
      cliente_id: clienteId,
      modulo_id: m.id,
      orcamento_id: orcamentoId,
      mes_execucao: m.mes_execucao,
      status: "pendente",
    }));

    // upsert com ignoreDuplicates para respeitar UNIQUE(cliente_id, modulo_id)
    const { error: cmErr } = await supabase
      .from("cliente_modulos")
      .upsert(rows, {
        onConflict: "cliente_id,modulo_id",
        ignoreDuplicates: true,
      });
    if (cmErr) {
      console.error("Falha ao inserir cliente_modulos:", cmErr);
      // não fazemos rollback do orçamento — apenas avisamos via throw
      throw cmErr;
    }
  }

  // Passo E — Ativar projeto do cliente
  const { error: updErr } = await supabase
    .from("clientes")
    .update({ status: "projeto_ativo" })
    .eq("id", clienteId);
  if (updErr) {
    console.error("Falha ao ativar projeto do cliente:", updErr);
    throw updErr;
  }

  return { fileName, storagePath, orcamentoId };
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
