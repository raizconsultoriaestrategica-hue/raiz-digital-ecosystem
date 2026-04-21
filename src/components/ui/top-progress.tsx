import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Barra de progresso global no topo (estilo NProgress) na cor dourada.
 * Controlada por prop `active`. Anima até ~90% enquanto ativo e completa
 * para 100% quando desativado, depois desaparece.
 */
export function TopProgress({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    if (active) {
      setVisible(true);
      setProgress(8);
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          // desacelera conforme se aproxima de 90
          const inc = Math.max(1, (90 - p) / 12);
          return Math.min(90, p + inc);
        });
      }, 200);
    } else if (visible) {
      setProgress(100);
      hideTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] bg-transparent"
      role="progressbar"
      aria-label="Carregando"
    >
      <div
        className={cn(
          "h-full bg-dourado shadow-[0_0_8px_hsl(var(--dourado)/0.6)] transition-[width,opacity] duration-300 ease-out",
          progress >= 100 && "opacity-0",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
