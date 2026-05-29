import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash } from "@phosphor-icons/react";
import { getItemColumns, emptyQuotationRequestItem } from "@/lib/quotationRequestTypes";
import QuotationEquipmentPicker from "@/components/quotationRequests/QuotationEquipmentPicker";

const selectClass = "w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

function FieldInput({ col, value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <span className="text-sm text-slate-800 whitespace-pre-wrap block min-h-[1.25rem]">
        {String(value ?? "—")}
      </span>
    );
  }
  if (col.type === "textarea") {
    return (
      <textarea
        className="w-full min-h-[72px] border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Preencha ${col.label.toLowerCase()}…`}
      />
    );
  }
  return (
    <Input
      type={col.type === "number" ? "number" : "text"}
      className="h-10"
      value={value ?? ""}
      onChange={(e) => onChange(col.type === "number" ? Number(e.target.value) : e.target.value)}
      placeholder={`${col.label}…`}
    />
  );
}

export default function QuotationRequestItemsTable({
  sectionType,
  items,
  onChange,
  readOnly = false,
  cadastro,
}) {
  const columns = getItemColumns(sectionType).filter((c) => !c.readOnly);

  const patchItem = (idx, patch) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addRow = () => {
    onChange([...items, emptyQuotationRequestItem(sectionType, items.length + 1)]);
  };

  const removeRow = (idx) => {
    const next = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, item_number: i + 1 }));
    onChange(next.length ? next : [emptyQuotationRequestItem(sectionType, 1)]);
  };

  return (
    <div className="space-y-4 min-w-0">
      {!readOnly && cadastro && (
        <QuotationEquipmentPicker
          sectionType={sectionType}
          cadastro={cadastro}
          onImport={(patch) => {
            const target = items[items.length - 1];
            const isEmpty = !target?.equipment && !target?.identification_codes && !target?.training_name;
            if (isEmpty && items.length) {
              patchItem(items.length - 1, patch);
            } else {
              onChange([...items, { ...emptyQuotationRequestItem(sectionType, items.length + 1), ...patch }]);
            }
          }}
        />
      )}

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {items.map((item, idx) => (
          <Card key={idx} className="border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-slate-50/80 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Item {item.item_number ?? idx + 1}</span>
              {!readOnly && items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removeRow(idx)}>
                  <Trash size={16} />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {columns.map((col) => (
                <div key={col.key}>
                  <Label className="text-xs text-slate-500 mb-1 block">{col.label}</Label>
                  <FieldInput
                    col={col}
                    value={item[col.key]}
                    readOnly={readOnly}
                    onChange={(v) => patchItem(idx, { [col.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-3 text-left w-10 font-semibold">#</th>
              {columns.map((c) => (
                <th key={c.key} className="p-3 text-left font-semibold whitespace-nowrap">{c.label}</th>
              ))}
              {!readOnly && <th className="p-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-slate-100 align-top hover:bg-slate-50/40">
                <td className="p-3 text-slate-500 font-medium">{item.item_number ?? idx + 1}</td>
                {columns.map((col) => (
                  <td key={col.key} className="p-3 min-w-[140px]">
                    <FieldInput
                      col={col}
                      value={item[col.key]}
                      readOnly={readOnly}
                      onChange={(v) => patchItem(idx, { [col.key]: v })}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="p-3">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removeRow(idx)} disabled={items.length <= 1}>
                      <Trash size={16} />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full sm:w-auto">
          <Plus size={16} className="mr-1.5" /> Adicionar linha
        </Button>
      )}
    </div>
  );
}

export { selectClass };
