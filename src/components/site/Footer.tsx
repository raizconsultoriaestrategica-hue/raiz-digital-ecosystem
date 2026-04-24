import BrandLogo from "@/components/brand/BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-verde-raiz text-linho">
      <div className="container-editorial flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          <BrandLogo onDark className="h-10" />
          <p className="mt-3 max-w-sm font-body text-sm text-linho/75">
            Consultoria estratégica para clínicas que crescem com profundidade.
          </p>
        </div>
        <div className="font-body text-xs text-linho/60">
          © {new Date().getFullYear()} Raiz Consultoria Estratégica. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
