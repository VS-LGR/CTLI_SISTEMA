import React, { useEffect, useState } from "react";
import { Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  perPointFormulas,
  conformityFormulas,
  dataRequirements,
  notYetImplemented,
  conformityChecklist,
  calculationNotes,
} from "@/lib/certificateCalculations/calculationDocs";
import { cn } from "@/lib/utils";

function FormulaTable({ rows }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-xs sm:text-sm min-w-[280px]">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-medium">Resultado</th>
            <th className="py-2 pr-2 font-medium">Fórmula</th>
            <th className="py-2 font-medium hidden sm:table-cell">Origem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-2 font-medium text-slate-800 align-top whitespace-nowrap">
                {row.result}
              </td>
              <td className="py-2 pr-2 text-slate-700 align-top font-mono text-[11px] sm:text-xs leading-relaxed">
                {row.formula}
              </td>
              <td className="py-2 text-slate-500 align-top hidden sm:table-cell text-xs">
                {row.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DialogBody({ initialSection = "pontos" }) {
  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
      <section id="calc-section-pontos" className={initialSection === "pontos" ? "ring-1 ring-blue-100 rounded-lg p-3 -m-1" : ""}>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Por ponto de calibração (P1–P10)
        </h3>
        <FormulaTable rows={perPointFormulas} />
      </section>

      <section id="calc-section-conformidade" className={initialSection === "conformidade" ? "ring-1 ring-blue-100 rounded-lg p-3 -m-1" : ""}>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Metrologia legal / conformidade
        </h3>
        <p className="text-xs text-slate-600 mb-2">
          Aplicável quando o certificado marca metrologia legal (portaria INmetro ou etiqueta IPEM).
        </p>
        <FormulaTable rows={conformityFormulas} />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Pré-requisitos para Calcular</h3>
        <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-700">
          {dataRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Comportamento do sistema</h3>
        <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-600">
          {calculationNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="calc-section-checklist">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Checklist Matriz (2)</h3>
        <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-600">
          {conformityChecklist.map((row) => (
            <li key={row.id}>
              <span className="font-medium">{row.item}</span>
              <span className="text-slate-400"> — {row.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50/80 p-3">
        <h3 className="text-xs font-semibold text-amber-900 mb-1">Em evolução</h3>
        <ul className="list-disc pl-4 space-y-0.5 text-[11px] sm:text-xs text-amber-900/90">
          {notYetImplemented.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Botão de ajuda com fórmulas de cálculo do certificado RE-7.2B.
 * @param {{ iconOnly?: boolean, initialSection?: 'pontos' | 'conformidade', variant?: 'button' | 'link' }} props
 */
export default function CertificateCalculationsHelp({
  iconOnly = false,
  initialSection = "pontos",
  variant = "button",
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || initialSection === "pontos") return;
    const t = setTimeout(() => {
      document.getElementById(`calc-section-${initialSection}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [open, initialSection]);

  const trigger = variant === "link" ? (
    <button
      type="button"
      className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left"
      aria-label="Ver fórmulas de conformidade"
    >
      Ver fórmulas de conformidade
    </button>
  ) : (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "outline"}
      size="sm"
      className={cn(
        "shrink-0",
        iconOnly ? "h-8 w-8 p-0" : "h-9 gap-1.5",
      )}
      aria-label="Ver fórmulas de cálculo do certificado"
    >
      <Info size={16} weight="duotone" className="text-blue-600 shrink-0" />
      {!iconOnly && (
        <>
          <span className="hidden sm:inline">Como calculamos</span>
          <span className="sm:hidden">Cálculos</span>
        </>
      )}
    </Button>
  );

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg sm:max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg pr-6">
            Cálculos do certificado de calibração
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Fórmulas aplicadas ao clicar em Calcular, conforme a planilha de emissão e o motor em{" "}
            <code className="text-[10px] bg-slate-100 px-1 rounded">pointCalculations.js</code>.
          </DialogDescription>
        </DialogHeader>
        <DialogBody initialSection={initialSection} />
      </DialogContent>
    </Dialog>
  );

  if (iconOnly) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{dialog}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Ver fórmulas de cálculo
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return dialog;
}
