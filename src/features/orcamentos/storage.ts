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

/**
 * Salva o orçamento atual no Supabase Storage + tabela orcamentos.
 * Requer cliente vinculado.
 */
export async function saveOrcamento(form: OrcamentoForm, clienteId: string) {
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

  const { error: insErr } = await supabase.from("orcamentos").insert({
    cliente_id: clienteId,
    plano: form.plano,
    plano_nome: planoInfo?.name ?? null,
    valor: planoInfo?.valor ?? null,
    score: form.score ? Number(form.score) : null,
    score_max: form.scoreMax ? Number(form.scoreMax) : null,
    storage_path: storagePath,
    file_name: fileName,
    created_by: userRes.user?.id ?? null,
  });
  if (insErr) {
    // rollback do arquivo
    await supabase.storage.from("orcamentos").remove([storagePath]);
    throw insErr;
  }

  return { fileName, storagePath };
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
