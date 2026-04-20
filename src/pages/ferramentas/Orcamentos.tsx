import { useEffect } from "react";
import { useOrcamento } from "@/features/orcamentos/hooks/useOrcamento";
import { OrcamentoSidebar } from "@/features/orcamentos/components/OrcamentoSidebar";
import { OrcamentoPreview } from "@/features/orcamentos/components/OrcamentoPreview";
import "@/features/orcamentos/print.css";

export default function Orcamentos() {
  const orc = useOrcamento();

  // SEO
  useEffect(() => {
    const prev = document.title;
    document.title = "Máquina de Orçamentos · Raiz Consultoria";
    return () => { document.title = prev; };
  }, []);

  const handlePrint = () => {
    document.body.classList.add("printing-orcamento");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-orcamento");
    }, 50);
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
          onPrint={handlePrint}
        />
        <OrcamentoPreview form={orc.form} />
      </div>
    </div>
  );
}
