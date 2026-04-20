import { cn } from "@/lib/utils";

interface SelectOptsProps {
  group: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  cols?: 2 | 3;
}

export function SelectOpts({ group, options, value, onChange, cols = 2 }: SelectOptsProps) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            type="button"
            key={`${group}-${opt}`}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-lg border-[1.5px] border-border bg-card px-2 py-2.5 text-xs font-medium text-quase-preto/70 transition-all hover:border-verde-musgo hover:text-verde-raiz",
              selected && "border-verde-musgo bg-verde-menta font-semibold text-verde-raiz",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
