import simbolo from "@/assets/simbolo.png";
import { cn } from "@/lib/utils";

interface BrandSymbolBgProps {
  /** Tamanho em px (largura/altura iguais, mantém proporção via object-contain) */
  size?: number;
  /** Opacidade 0-1 */
  opacity?: number;
  /** Posicionamento absoluto */
  position?: "center" | "bottom-right" | "top-right" | "bottom-left" | "top-left";
  /** true para aplicar brightness(10) e ficar branco sobre fundo escuro */
  white?: boolean;
  className?: string;
}

/**
 * Símbolo decorativo Raiz aplicado como background.
 * SEMPRE: position absolute, pointer-events none, z abaixo do conteúdo, object-contain.
 * O container pai DEVE ter `position: relative` e `overflow-hidden`.
 */
export default function BrandSymbolBg({
  size = 300,
  opacity = 0.06,
  position = "center",
  white = true,
  className,
}: BrandSymbolBgProps) {
  const posClass: Record<string, string> = {
    center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
    "bottom-right": "right-0 bottom-0 translate-x-1/4 translate-y-1/4",
    "top-right": "right-0 top-0 translate-x-1/4 -translate-y-1/4",
    "bottom-left": "left-0 bottom-0 -translate-x-1/4 translate-y-1/4",
    "top-left": "left-0 top-0 -translate-x-1/4 -translate-y-1/4",
  };

  return (
    <img
      src={simbolo}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("pointer-events-none absolute z-0 select-none object-contain", posClass[position], className)}
      style={{
        width: size,
        height: size,
        opacity,
        filter: white ? "brightness(10)" : undefined,
      }}
    />
  );
}
