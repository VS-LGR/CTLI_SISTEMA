import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash } from "@phosphor-icons/react";
import { getItemColumns, emptyQuotationRequestItem } from "@/lib/quotationRequestTypes";
import QuotationEquipmentPicker from "@/components/quotationRequests/QuotationEquipmentPicker";

export default function QuotationRequestItemsTable({
  sectionType,
  items,
  onChange,
  readOnly = false,
  cadastro,
}) {
  const columns = getItemColumns(sectionType).filter((c) => !c.readOnly);

  const patchItem = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const addRow = () => {
    onChange([...items, emptyQuotationRequestItem(sectionType, items.length + 1)]);
  };

  const removeRow = (idx) => {
    const next = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, item_number: i + 1 }));
    onChange(next.length ? next : [emptyQuotationRequestItem(sectionType, 1)]);
  };

  return (
    <div className="space-y-3 min-w-0">
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
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-2 text-left w-10">#</th>
              {columns.map((c) => (
                <th key={c.key} className="p-2 text-left whitespace-nowrap">{c.label}</th>
              ))}
              {!readOnly && <th className="p-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-slate-200 align-top">
                <td className="p-2 text-slate-500">{item.item_number ?? idx + 1}</td>
                {columns.map((col) => (
                  <td key={col.key} className="p-2 min-w-[120px]">
                    {readOnly ? (
                      <span className="text-slate-800 whitespace-pre-wrap">{String(item[col.key] ?? "—")}</span>
                    ) : col.type === "textarea" ? (
                      <textarea
                        className="w-full min-h-[60px] border border-slate-200 rounded-md px-2 py-1 text-sm"
                        value={item[col.key] ?? ""}
                        onChange={(e) => patchItem(idx, { [col.key]: e.target.value })}
                      />
                    ) : (
                      <Input
                        type={col.type === "number" ? "number" : "text"}
                        className="h-9"
                        value={item[col.key] ?? ""}
                        onChange={(e) => patchItem(idx, {
                          [col.key]: col.type === "number" ? Number(e.target.value) : e.target.value,
                        })}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="p-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removeRow(idx)}>
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
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus size={16} className="mr-1.5" /> Adicionar linha
        </Button>
      )}
    </div>
  );
}
