import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash } from "@phosphor-icons/react";
import { getItemColumns, emptyQuotationRequestItem } from "@/lib/quotationRequestTypes";
import FormDynamicRows from "@/components/forms/FormDynamicRows";
import FormRowCard from "@/components/forms/FormRowCard";

const selectClass = "w-full h-10 border border-border rounded-md px-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary";

function FieldInput({ col, value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <span className="text-sm text-foreground whitespace-pre-wrap block min-h-[1.25rem]">
        {String(value ?? "—")}
      </span>
    );
  }
  if (col.type === "textarea") {
    return (
      <textarea
        className="w-full min-h-[72px] min-w-0 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Preencha ${col.label.toLowerCase()}…`}
      />
    );
  }
  return (
    <Input
      type={col.type === "number" ? "number" : "text"}
      className="h-10 min-w-0"
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
    <FormDynamicRows
      items={items}
      readOnly={readOnly}
      onAdd={addRow}
      tableMinWidth="640px"
      renderMobileRow={(item, idx) => (
        <FormRowCard
          key={idx}
          index={idx}
          label={`Item ${item.item_number ?? idx + 1}`}
          readOnly={readOnly}
          canRemove={items.length > 1}
          onRemove={() => removeRow(idx)}
        >
          {columns.map((col) => (
            <div key={col.key} className="min-w-0">
              <Label className="text-xs text-muted-foreground mb-1 block break-words">{col.label}</Label>
              <FieldInput
                col={col}
                value={item[col.key]}
                readOnly={readOnly}
                onChange={(v) => patchItem(idx, { [col.key]: v })}
              />
            </div>
          ))}
        </FormRowCard>
      )}
      renderTableHeader={() => (
        <>
          <th className="p-3 text-left w-10 font-semibold">#</th>
          {columns.map((c) => (
            <th key={c.key} className="p-3 text-left font-semibold whitespace-nowrap">
              {c.label}
            </th>
          ))}
          {!readOnly && <th className="p-3 w-10" />}
        </>
      )}
      renderTableRow={(item, idx) => (
        <tr
          key={idx}
          className={`border-t border-border align-top hover:bg-accent/40 ${
            idx % 2 === 1 ? "bg-background/30" : ""
          }`}
        >
          <td className="p-3 text-muted-foreground font-medium">{item.item_number ?? idx + 1}</td>
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={() => removeRow(idx)}
                disabled={items.length <= 1}
              >
                <Trash size={16} />
              </Button>
            </td>
          )}
        </tr>
      )}
    />
  );
}

export { selectClass };
