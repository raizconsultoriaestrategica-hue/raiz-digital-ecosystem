import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, LogOut } from "lucide-react";

interface Props {
  userName: string;
  onTogglePresentation: () => void;
  onSignOut: () => void;
}

export default function TopBar({ userName, onTogglePresentation, onSignOut }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const data = now.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <header
      className="sticky top-0 z-40 flex h-[58px] items-center justify-between border-b-2 border-dourado bg-verde-raiz px-4 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl text-linho">
          Raiz<span className="text-dourado">.</span>
        </span>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <span className="rounded-full bg-dourado px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-verde-raiz">
          ● Ao vivo
        </span>
        <span className="text-xs uppercase tracking-[0.16em] text-linho/70">{data}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onTogglePresentation}
          className="hidden border border-linho/20 bg-linho/5 text-linho hover:bg-linho/15 hover:text-linho sm:inline-flex"
        >
          <Maximize2 className="mr-2 h-3.5 w-3.5" /> Modo Apresentação
        </Button>
        <span className="hidden text-xs text-linho/70 lg:inline-block max-w-[200px] truncate">
          {userName}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSignOut}
          className="text-linho hover:bg-linho/10 hover:text-linho"
        >
          <LogOut className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
