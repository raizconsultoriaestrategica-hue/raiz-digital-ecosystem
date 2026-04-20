import { cn } from "@/lib/utils";

interface ScoreButtonsProps {
  labels: [string, string, string, string];
  value: number | null | "SKIP";
  onChange: (score: number) => void;
}

const STYLES = [
  { active: "border-destructive bg-destructive/10 text-destructive", num: "text-destructive" },
  { active: "border-caramelo bg-caramelo/10 text-caramelo", num: "text-caramelo" },
  { active: "border-dourado bg-dourado/15 text-dourado", num: "text-dourado" },
  { active: "border-verde-musgo bg-verde-menta text-verde-raiz", num: "text-verde-musgo" },
];

export function ScoreButtons({ labels, value, onChange }: ScoreButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {[0, 1, 2, 3].map((s) => {
        const selected = value === s;
        const st = STYLES[s];
        return (
          <button
            type="button"
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "rounded-lg border-[1.5px] border-border bg-card p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-verde-musgo hover:shadow-soft",
              selected && st.active,
            )}
          >
            <span className={cn("block text-lg font-bold", selected ? st.num : "text-quase-preto/70")}>{s}</span>
            <span className="block text-[10px] leading-tight text-quase-preto/60">{labels[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
