import { useState } from "react";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/brand/BrandLogo";
import BrandSymbolBg from "@/components/brand/BrandSymbolBg";
import { cn } from "@/lib/utils";
import type { Ramo } from "../types";
import { getPilaresByRamo } from "../logic";
import { RepositorioDiagnosticos } from "./RepositorioDiagnosticos";

interface IntroScreenProps {
  ramo: Ramo;
  onRamoChange: (r: Ramo) => void;
  onStart: () => void;
}

export function IntroScreen({ ramo, onRamoChange, onStart }: IntroScreenProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const pilares = getPilaresByRamo(ramo);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-screen flex-col bg-verde-raiz text-linho"
    >
      <BrandSymbolBg size={500} opacity={0.05} position="center" white />

      {/* Top bar — Modo Admin */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-10">
        <BrandLogo onDark className="h-9" />
        <Sheet open={adminOpen} onOpenChange={setAdminOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="border border-linho/15 bg-linho/5 text-linho/80 hover:bg-linho/10 hover:text-linho"
            >
              Modo Admin
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
            <SheetHeader className="mb-4">
              <SheetTitle className="font-display text-2xl">Diagnósticos salvos</SheetTitle>
            </SheetHeader>
            <RepositorioDiagnosticos />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main 2 cols */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-12 md:px-10 lg:grid-cols-2">
        {/* Left: branding + CTA */}
        <div>
          <span className="inline-block rounded-full border border-dourado/25 bg-dourado/12 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-dourado">
            Diagnóstico 360° · Raiz Consultoria
          </span>
          <h1
            className="mt-5 font-display font-semibold leading-[1.05] text-linho"
            style={{ fontSize: "clamp(38px, 5.4vw, 62px)" }}
          >
            Diagnóstico 360°
          </h1>
          <p className="mt-4 max-w-md font-light text-linho/65">
            Avaliação estratégica em 7 pilares que mostra exatamente onde está o gargalo do seu
            faturamento — e qual o caminho mais curto para destravar.
          </p>

          {/* Ramo selector */}
          <div className="mt-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-linho/45">
              Selecione o ramo
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              {(["dentista", "medico"] as Ramo[]).map((r) => {
                const sel = ramo === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRamoChange(r)}
                    className={cn(
                      "rounded-xl border-[1.5px] border-linho/15 bg-linho/5 px-4 py-4 text-left transition-all hover:border-linho/35 hover:bg-linho/10",
                      sel && "border-dourado bg-dourado/15",
                    )}
                  >
                    <div className="text-2xl">{r === "dentista" ? "🦷" : "🩺"}</div>
                    <div className={cn("mt-1 text-sm font-semibold", sel ? "text-dourado" : "text-linho")}>
                      {r === "dentista" ? "Odontologia" : "Saúde / Medicina"}
                    </div>
                    <div className="text-[11px] text-linho/55">
                      {r === "dentista" ? "Clínicas e dentistas" : "Consultórios e clínicas médicas"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={onStart}
            size="lg"
            className="mt-7 h-12 bg-dourado px-8 text-base font-semibold text-verde-raiz hover:bg-dourado/90"
          >
            Iniciar Diagnóstico →
          </Button>
        </div>

        {/* Right: pilares grid */}
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-linho/45">
            Os 7 pilares avaliados
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {pilares.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-linho/10 bg-linho/[0.07] px-3.5 py-3 backdrop-blur-sm"
              >
                <div className="text-lg font-bold text-dourado">{p.num}</div>
                <div className="mt-0.5 text-[12px] font-medium leading-tight text-linho/85">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-linho/45">
            ~10 min · {pilares.reduce((s, p) => s + p.questions.length, 0)} perguntas
          </p>
        </div>
      </div>
    </motion.section>
  );
}
