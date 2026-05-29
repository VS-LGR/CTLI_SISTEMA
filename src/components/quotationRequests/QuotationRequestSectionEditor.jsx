import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { getTypeMeta, emptyQuotationRequestItem } from "@/lib/quotationRequestTypes";
import QuotationRequestItemsTable from "@/components/quotationRequests/QuotationRequestItemsTable";
import { cn } from "@/lib/utils";

export default function QuotationRequestSectionEditor({
  section,
  items,
  onSectionChange,
  onItemsChange,
  readOnly = false,
  cadastro,
  expanded = true,
  onToggleExpand,
}) {
  const meta = getTypeMeta(section.type);
  if (!section.is_selected) return null;

  const header = (
    <button
      type="button"
      className="w-full flex items-center justify-between gap-3 text-left"
      onClick={onToggleExpand}
    >
      <div>
        <CardTitle className="text-base font-semibold text-slate-900">{meta?.label}</CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Clique para {expanded ? "recolher" : "expandir"} o preenchimento</p>
      </div>
      {expanded ? <CaretUp size={18} className="text-slate-400 shrink-0" /> : <CaretDown size={18} className="text-slate-400 shrink-0" />}
    </button>
  );

  if (section.type === "ensaio_proficiencia") {
    return (
      <Card className={cn("border-slate-200 overflow-hidden", expanded && "ring-1 ring-blue-100")}>
        <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">{header}</CardHeader>
        {expanded && (
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-slate-500 font-medium">Escopo do Ensaio</Label>
              <textarea
                className="mt-1.5 w-full min-h-[88px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={section.essay_scope || ""}
                readOnly={readOnly}
                placeholder="Descreva o escopo do ensaio de proficiência…"
                onChange={(e) => onSectionChange({ essay_scope: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-slate-500 font-medium">Critérios para Aquisição</Label>
              <textarea
                className="mt-1.5 w-full min-h-[88px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={section.custom_criteria || section.acquisition_criteria || ""}
                readOnly={readOnly}
                placeholder="Critérios de contratação do provedor…"
                onChange={(e) => onSectionChange({ custom_criteria: e.target.value, acquisition_criteria: e.target.value })}
              />
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  const typeItems = items.filter((it) => it.section_type === section.type);
  const displayItems = typeItems.length ? typeItems : [emptyQuotationRequestItem(section.type, 1)];

  return (
    <Card className={cn("border-slate-200 overflow-hidden", expanded && "ring-1 ring-blue-100")}>
      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">{header}</CardHeader>
      {expanded && (
        <CardContent className="p-5">
          <QuotationRequestItemsTable
            sectionType={section.type}
            items={displayItems}
            onChange={(next) => {
              const other = items.filter((it) => it.section_type !== section.type);
              onItemsChange([...other, ...next.map((it) => ({ ...it, section_type: section.type }))]);
            }}
            readOnly={readOnly}
            cadastro={cadastro}
          />
        </CardContent>
      )}
    </Card>
  );
}
