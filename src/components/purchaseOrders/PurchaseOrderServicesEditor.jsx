import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash } from "@phosphor-icons/react";
import { emptyPurchaseOrderItem, getTypeMeta, getServiceFieldConfig } from "@/lib/purchaseOrderTypes";
import { recalcItem } from "@/lib/purchaseOrderCalculations";
import { ENV_EQUIPMENT_TYPES } from "@/lib/cadastroConstants";
import PurchaseOrderItemsFooter from "./PurchaseOrderItemsFooter";
import { orderFinal, orderSubtotal } from "@/lib/purchaseOrderCalculations";

const MAGNITUDES = ["Temperatura", "Umidade", "Pressão atmosférica"];

export default function PurchaseOrderServicesEditor({
  type,
  items,
  onChange,
  envCerts = [],
  orderMeta,
  onOrderMetaChange,
  readOnly = false,
}) {
  const meta = getTypeMeta(type);
  const fieldCfg = getServiceFieldConfig(type);

  const setItems = (next) => onChange?.(next.map((it, i) => recalcItem({ ...it, item_number: i + 1 })));

  const updateItem = (idx, patch) => {
    const next = [...items];
    next[idx] = recalcItem({ ...next[idx], ...patch });
    setItems(next);
  };

  const addRow = () => setItems([...items, emptyPurchaseOrderItem(items.length + 1)]);

  const removeRow = (idx) => setItems(items.filter((_, i) => i !== idx));

  const applyEnvCert = (idx, certId) => {
    const c = envCerts.find((x) => x.id === certId);
    if (!c) return;
    const typeLabel = ENV_EQUIPMENT_TYPES.find((t) => t.value === c.equipment_type)?.label || c.equipment_type;
    updateItem(idx, {
      equipment: c.equipment_name || typeLabel,
      identification_codes: c.certificate_number || "",
      magnitude: typeLabel,
      linked_env_cert_id: c.id,
    });
  };

  const subtotal = orderSubtotal(items);
  const finalValue = orderFinal(orderMeta, items);

  const cell = (idx, field, props = {}) => (
    <Input
      value={items[idx]?.[field] ?? ""}
      disabled={readOnly}
      onChange={(e) => updateItem(idx, { [field]: e.target.value })}
      className="h-9 text-xs"
      {...props}
    />
  );

  const numCell = (idx, field) => (
    <Input
      type="number"
      min={0}
      step={field === "quantity" ? "1" : "0.01"}
      value={items[idx]?.[field] ?? 0}
      disabled={readOnly}
      onChange={(e) => updateItem(idx, { [field]: e.target.value })}
      className="h-9 text-xs"
    />
  );

  return (
    <div className="space-y-4 min-w-0">
      {meta?.serviceTypeLabel && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          Tipo de serviço: <strong>{meta.serviceTypeLabel}</strong>
        </p>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-2 w-10">Item</th>
              {(type === "calibracao_pesos_padrao" || type === "compra_pesos") && (
                <>
                  <th className="p-2">Equipamento</th>
                  <th className="p-2">Material</th>
                  <th className="p-2">Código(s)</th>
                  <th className="p-2">{fieldCfg.columns.nominalLabel}</th>
                  <th className="p-2">{fieldCfg.columns.errorLabel}</th>
                </>
              )}
              {(type === "calibracao_termo_baro_higrometro" || type === "compra_termo_baro_higrometro") && (
                <>
                  <th className="p-2">Equipamento</th>
                  <th className="p-2">Código</th>
                  <th className="p-2">Grandeza</th>
                  <th className="p-2">{fieldCfg.columns.nominalLabel}</th>
                  <th className="p-2">{fieldCfg.columns.errorLabel}</th>
                </>
              )}
              {type === "auditoria_interna" && (
                <>
                  <th className="p-2 min-w-[200px]">Escopo da auditoria</th>
                  <th className="p-2">Critério</th>
                </>
              )}
              {type === "ensaio_proficiencia" && (
                <>
                  <th className="p-2">Programa</th>
                  <th className="p-2 min-w-[180px]">Artefatos</th>
                  <th className="p-2">Critério</th>
                </>
              )}
              <th className="p-2 w-16">Qtd</th>
              <th className="p-2 w-24">V. unit.</th>
              <th className="p-2 w-20">Impostos</th>
              <th className="p-2 w-24">Total</th>
              {!readOnly && <th className="p-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100 align-top">
                <td className="p-2 text-center">{idx + 1}</td>
                {(type === "calibracao_pesos_padrao" || type === "compra_pesos") && (
                  <>
                    <td className="p-2">{cell(idx, "equipment")}</td>
                    <td className="p-2">{cell(idx, "material")}</td>
                    <td className="p-2">{cell(idx, "identification_codes")}</td>
                    <td className="p-2">{cell(idx, "nominal_values")}</td>
                    <td className="p-2">{cell(idx, type === "compra_pesos" ? "hiring_criteria" : "max_error_uncertainty")}</td>
                  </>
                )}
                {(type === "calibracao_termo_baro_higrometro" || type === "compra_termo_baro_higrometro") && (
                  <>
                    <td className="p-2">
                      {!readOnly && type === "calibracao_termo_baro_higrometro" && (
                        <select
                          className="w-full border rounded h-9 px-1 mb-1 text-xs"
                          value=""
                          onChange={(e) => e.target.value && applyEnvCert(idx, e.target.value)}
                        >
                          <option value="">+ equipamento</option>
                          {envCerts.map((c) => (
                            <option key={c.id} value={c.id}>{c.equipment_name} ({c.certificate_number})</option>
                          ))}
                        </select>
                      )}
                      {cell(idx, "equipment")}
                    </td>
                    <td className="p-2">{cell(idx, "identification_codes")}</td>
                    <td className="p-2">
                      {type === "compra_termo_baro_higrometro" ? (
                        <select
                          className="w-full border rounded h-9 px-1 text-xs"
                          value={items[idx]?.magnitude || ""}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { magnitude: e.target.value })}
                        >
                          <option value="">—</option>
                          {MAGNITUDES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      ) : (
                        cell(idx, "magnitude")
                      )}
                    </td>
                    <td className="p-2">
                      {cell(idx, type === "compra_termo_baro_higrometro" ? "minimum_reading_range" : "nominal_values")}
                    </td>
                    <td className="p-2">
                      {cell(idx, type === "compra_termo_baro_higrometro" ? "acceptable_resolution" : "max_error_uncertainty")}
                    </td>
                  </>
                )}
                {type === "auditoria_interna" && (
                  <>
                    <td className="p-2">
                      <Textarea
                        rows={2}
                        value={items[idx]?.audit_scope || ""}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { audit_scope: e.target.value })}
                        className="text-xs min-h-[60px]"
                      />
                    </td>
                    <td className="p-2">{cell(idx, "hiring_criteria")}</td>
                  </>
                )}
                {type === "ensaio_proficiencia" && (
                  <>
                    <td className="p-2">{cell(idx, "program_name")}</td>
                    <td className="p-2">
                      <Textarea
                        rows={2}
                        value={items[idx]?.artifacts_description || ""}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { artifacts_description: e.target.value })}
                        className="text-xs min-h-[60px]"
                      />
                    </td>
                    <td className="p-2">{cell(idx, "hiring_criteria")}</td>
                  </>
                )}
                <td className="p-2">{numCell(idx, "quantity")}</td>
                <td className="p-2">{numCell(idx, "unit_value")}</td>
                <td className="p-2">
                  <Input
                    value={items[idx]?.taxes_included ? "incluso" : `${items[idx]?.taxes_percent || 0}%`}
                    disabled={readOnly}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase();
                      if (v.includes("inclus")) updateItem(idx, { taxes_included: true, taxes_percent: 0 });
                      else updateItem(idx, { taxes_included: false, taxes_percent: parseFloat(v) || 0 });
                    }}
                    className="h-9 text-xs"
                  />
                </td>
                <td className="p-2 font-medium whitespace-nowrap">
                  {(row.total_value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                {!readOnly && (
                  <td className="p-2">
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeRow(idx)}>
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
          <Plus size={16} className="mr-1" /> Adicionar linha
        </Button>
      )}

      <PurchaseOrderItemsFooter
        items={items}
        discount={orderMeta?.discount ?? 0}
        taxesMode={orderMeta?.taxes_mode ?? "incluso"}
        subtotal={subtotal}
        finalValue={finalValue}
        readOnly={readOnly}
        onDiscountChange={(v) => onOrderMetaChange?.({ discount: v })}
        onTaxesModeChange={(v) => onOrderMetaChange?.({ taxes_mode: v })}
      />
    </div>
  );
}
