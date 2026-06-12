import { useEffect } from "react";
import { toast } from "sonner";
import { useOrcamento } from "@/features/orcamentos/hooks/useOrcamento";
import { OrcamentoSidebar } from "@/features/orcamentos/components/OrcamentoSidebar";
import { OrcamentoPreview } from "@/features/orcamentos/components/OrcamentoPreview";
import { generateOrcamentoPDFBlob } from "@/features/orcamentos/storage";
import "@/features/orcamentos/print.css";

export default function Orcamentos() {
  const orc = useOrcamento();

  // SEO
  useEffect(() => {
    const prev = document.title;
    document.title = "Máquina de Orçamentos · Raiz Consultoria";
    return () => { document.title = prev; };
  }, []);

  // Gera o PDF paginado (mesma engine do salvamento automático) e baixa.
  // Substitui a impressão do navegador, que quebrava cada seção numa página.
  const handlePrint = async () => {
    const tid = toast.loading("Gerando PDF…");
    try {
      const blob = await generateOrcamentoPDFBlob();
      const base = (orc.form.nomeClinica || orc.form.nomeCliente || "cliente")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orcamento - ${base || "cliente"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("PDF gerado", { id: tid });
    } catch {
      toast.error("Falha ao gerar o PDF. Tente novamente.", { id: tid });
    }
  };

  return (
    <div className="-mx-4 md:-mx-8 -my-6 md:-my-8">
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-[#E8E4E0]">
        <OrcamentoSidebar
          form={orc.form}
          setField={orc.setField}
          setPilarScore={orc.setPilarScore}
          toggleModulo={orc.toggleModulo}
          reset={orc.reset}
          clientes={orc.clientes}
          clienteId={orc.clienteId}
          selectCliente={orc.selectCliente}
          loadingClientes={orc.loadingClientes}
          loadingDiag={orc.loadingDiag}
          modulosDb={orc.modulosDb}
          loadingModulos={orc.loadingModulos}
          onPrint={handlePrint}
        />
        <OrcamentoPreview form={orc.form} modulosDb={orc.modulosDb} />
      </div>
    </div>
  );
}
