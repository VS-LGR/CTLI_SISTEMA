import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getTypeMeta, emptyQuotationRequestItem } from "@/lib/quotationRequestTypes";
import QuotationRequestItemsTable from "@/components/quotationRequests/QuotationRequestItemsTable";

export default function QuotationRequestSectionEditor({
  section,
  items,
  onSectionChange,
  onItemsChange,
  readOnly = false,
  cadastro,
}) {
  const meta = getTypeMeta(section.type);
  if (!section.is_selected) return null;

  if (section.type === "ensaio_proficiencia") {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{meta?.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-slate-500">Escopo do Ensaio</Label>
            <textarea
              className="mt-1 w-full min-h-[80px] border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={section.essay_scope || ""}
              readOnly={readOnly}
              onChange={(e) => onSectionChange({ essay_scope: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-slate-500">Critérios para Aquisição</Label>
            <textarea
              className="mt-1 w-full min-h-[80px] border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={section.custom_criteria || section.acquisition_criteria || ""}
              readOnly={readOnly}
              onChange={(e) => onSectionChange({ custom_criteria: e.target.value, acquisition_criteria: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const typeItems = items.filter((it) => it.section_type === section.type);
  const displayItems = typeItems.length ? typeItems : [emptyQuotationRequestItem(section.type, 1)];

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{meta?.label}</CardTitle>
      </CardHeader>
      <CardContent>
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
    </Card>
  );
}
