import logoPrincipal from "@/assets/logo_principal.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** true se for exibido sobre fundo escuro (aplica brightness/invert para virar branco) */
  onDark?: boolean;
  className?: string;
  alt?: string;
}

/**
 * Logo oficial Raiz Consultoria Estratégica.
 * Sobre fundo escuro: aplica filter brightness(0) invert(1) → branco.
 * Sobre fundo claro: usa as cores originais (preto).
 */
export default function BrandLogo({ onDark = false, className, alt = "Raiz Consultoria Estratégica" }: BrandLogoProps) {
  return (
    <img
      src={logoPrincipal}
      alt={alt}
      draggable={false}
      className={cn("h-auto w-auto select-none object-contain", className)}
      style={onDark ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}
