import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash } from "@phosphor-icons/react";
import { emptyPurchaseOrderItem, getTypeMeta, getServiceFieldConfig } from "@/lib/purchaseOrderTypes";
import { recalcItem } from "@/lib/purchaseOrderCalculations";
import { ENV_EQUIPMENT_TYPES } from "@/lib/cadastroConstants";
import PurchaseOrderItemsFooter from "./PurchaseOrderItemsFooter";
import { orderFinal, orderSubtotal } from "@/lib/purchaseOrderCalculations";
import FormDynamicRows from "@/components/forms/FormDynamicRows";
import FormRowCard from "@/components/forms/FormRowCard";

const MAGNITUDES = ["Temperatura", "Umidade", "Pressão atmosférica"];

function MobileField({ label, children }) {
  return (
    <div className="min-w-0">
      <Label className="text-xs text-slate-500 mb-1 block break-words">{label}</Label>
      {children}
    </div>
  );
}

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

  const inputCls = "h-10 text-sm";

  const cell = (idx, field, props = {}) => (
    <Input
      value={items[idx]?.[field] ?? ""}
      disabled={readOnly}
      onChange={(e) => updateItem(idx, { [field]: e.target.value })}
      className={inputCls}
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
      className={inputCls}
    />
  );

  const renderTypeFieldsMobile = (idx) => {
    if (type === "calibracao_pesos_padrao" || type === "compra_pesos") {
      return (
        <>
          <MobileField label="Equipamento">{cell(idx, "equipment")}</MobileField>
          <MobileField label="Material">{cell(idx, "material")}</MobileField>
          <MobileField label="Código(s)">{cell(idx, "identification_codes")}</MobileField>
          <MobileField label={fieldCfg.columns.nominalLabel}>{cell(idx, "nominal_values")}</MobileField>
          <MobileField label={fieldCfg.columns.errorLabel}>
            {cell(idx, type === "compra_pesos" ? "hiring_criteria" : "max_error_uncertainty")}
          </MobileField>
        </>
      );
    }
    if (type === "calibracao_termo_baro_higrometro" || type === "compra_termo_baro_higrometro") {
      return (
        <>
          {!readOnly && type === "calibracao_termo_baro_higrometro" && (
            <MobileField label="Certificado ambiente">
              <select
                className="w-full border border-slate-200 rounded-md h-10 px-2 text-sm bg-white"
                value=""
                onChange={(e) => e.target.value && applyEnvCert(idx, e.target.value)}
              >
                <option value="">+ equipamento do cadastro</option>
                {envCerts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.equipment_name} ({c.certificate_number})
                  </option>
                ))}
              </select>
            </MobileField>
          )}
          <MobileField label="Equipamento">{cell(idx, "equipment")}</MobileField>
          <MobileField label="Código">{cell(idx, "identification_codes")}</MobileField>
          <MobileField label="Grandeza">
            {type === "compra_termo_baro_higrometro" ? (
              <select
                className="w-full border border-slate-200 rounded-md h-10 px-2 text-sm bg-white"
                value={items[idx]?.magnitude || ""}
                disabled={readOnly}
                onChange={(e) => updateItem(idx, { magnitude: e.target.value })}
              >
                <option value="">—</option>
                {MAGNITUDES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              cell(idx, "magnitude")
            )}
          </MobileField>
          <MobileField label={fieldCfg.columns.nominalLabel}>
            {cell(idx, type === "compra_termo_baro_higrometro" ? "minimum_reading_range" : "nominal_values")}
          </MobileField>
          <MobileField label={fieldCfg.columns.errorLabel}>
            {cell(idx, type === "compra_termo_baro_higrometro" ? "acceptable_resolution" : "max_error_uncertainty")}
          </MobileField>
        </>
      );
    }
    if (type === "auditoria_interna") {
      return (
        <>
          <MobileField label="Escopo da auditoria">
            <Textarea
              rows={3}
              value={items[idx]?.audit_scope || ""}
              disabled={readOnly}
              onChange={(e) => updateItem(idx, { audit_scope: e.target.value })}
              className="text-sm min-h-[72px]"
            />
          </MobileField>
          <MobileField label="Critério">{cell(idx, "hiring_criteria")}</MobileField>
        </>
      );
    }
    if (type === "ensaio_proficiencia") {
      return (
        <>
          <MobileField label="Programa">{cell(idx, "program_name")}</MobileField>
          <MobileField label="Artefatos">
            <Textarea
              rows={3}
              value={items[idx]?.artifacts_description || ""}
              disabled={readOnly}
              onChange={(e) => updateItem(idx, { artifacts_description: e.target.value })}
              className="text-sm min-h-[72px]"
            />
          </MobileField>
          <MobileField label="Critério">{cell(idx, "hiring_criteria")}</MobileField>
        </>
      );
    }
    return null;
  };

  const renderTypeFieldsTable = (idx) => {
    if (type === "calibracao_pesos_padrao" || type === "compra_pesos") {
      return (
        <>
          <td className="p-2">{cell(idx, "equipment")}</td>
          <td className="p-2">{cell(idx, "material")}</td>
          <td className="p-2">{cell(idx, "identification_codes")}</td>
          <td className="p-2">{cell(idx, "nominal_values")}</td>
          <td className="p-2">{cell(idx, type === "compra_pesos" ? "hiring_criteria" : "max_error_uncertainty")}</td>
        </>
      );
    }
    if (type === "calibracao_termo_baro_higrometro" || type === "compra_termo_baro_higrometro") {
      return (
        <>
          <td className="p-2">
            {!readOnly && type === "calibracao_termo_baro_higrometro" && (
              <select
                className="w-full border border-slate-200 rounded-md h-10 px-1 mb-1 text-xs bg-white"
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
                className="w-full border border-slate-200 rounded-md h-10 px-1 text-sm bg-white"
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
      );
    }
    if (type === "auditoria_interna") {
      return (
        <>
          <td className="p-2">
            <Textarea
              rows={2}
              value={items[idx]?.audit_scope || ""}
              disabled={readOnly}
              onChange={(e) => updateItem(idx, { audit_scope: e.target.value })}
              className="text-sm min-h-[60px]"
            />
          </td>
          <td className="p-2">{cell(idx, "hiring_criteria")}</td>
        </>
      );
    }
    if (type === "ensaio_proficiencia") {
      return (
        <>
          <td className="p-2">{cell(idx, "program_name")}</td>
          <td className="p-2">
            <Textarea
              rows={2}
              value={items[idx]?.artifacts_description || ""}
              disabled={readOnly}
              onChange={(e) => updateItem(idx, { artifacts_description: e.target.value })}
              className="text-sm min-h-[60px]"
            />
          </td>
          <td className="p-2">{cell(idx, "hiring_criteria")}</td>
        </>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 min-w-0">
      {meta?.serviceTypeLabel && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          Tipo de serviço: <strong>{meta.serviceTypeLabel}</strong>
        </p>
      )}

      <FormDynamicRows
        items={items}
        readOnly={readOnly}
        onAdd={addRow}
        tableMinWidth="720px"
        renderMobileRow={(row, idx) => (
          <FormRowCard
            key={idx}
            index={idx}
            label={`Item ${idx + 1}`}
            readOnly={readOnly}
            onRemove={() => removeRow(idx)}
          >
            {renderTypeFieldsMobile(idx)}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <MobileField label="Quantidade">{numCell(idx, "quantity")}</MobileField>
              <MobileField label="Valor unitário">{numCell(idx, "unit_value")}</MobileField>
              <MobileField label="Impostos">
                <Input
                  value={items[idx]?.taxes_included ? "incluso" : `${items[idx]?.taxes_percent || 0}%`}
                  disabled={readOnly}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase();
                    if (v.includes("inclus")) updateItem(idx, { taxes_included: true, taxes_percent: 0 });
                    else updateItem(idx, { taxes_included: false, taxes_percent: parseFloat(v) || 0 });
                  }}
                  className={inputCls}
                />
              </MobileField>
              <MobileField label="Total">
                <p className="text-sm font-semibold text-slate-900 py-2">
                  {(row.total_value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </MobileField>
            </div>
          </FormRowCard>
        )}
        renderTableHeader={() => (
          <>
            <th className="p-2 w-10 font-semibold">Item</th>
            {(type === "calibracao_pesos_padrao" || type === "compra_pesos") && (
              <>
                <th className="p-2 font-semibold">Equipamento</th>
                <th className="p-2 font-semibold">Material</th>
                <th className="p-2 font-semibold">Código(s)</th>
                <th className="p-2 font-semibold">{fieldCfg.columns.nominalLabel}</th>
                <th className="p-2 font-semibold">{fieldCfg.columns.errorLabel}</th>
              </>
            )}
            {(type === "calibracao_termo_baro_higrometro" || type === "compra_termo_baro_higrometro") && (
              <>
                <th className="p-2 font-semibold">Equipamento</th>
                <th className="p-2 font-semibold">Código</th>
                <th className="p-2 font-semibold">Grandeza</th>
                <th className="p-2 font-semibold">{fieldCfg.columns.nominalLabel}</th>
                <th className="p-2 font-semibold">{fieldCfg.columns.errorLabel}</th>
              </>
            )}
            {type === "auditoria_interna" && (
              <>
                <th className="p-2 min-w-[200px] font-semibold">Escopo da auditoria</th>
                <th className="p-2 font-semibold">Critério</th>
              </>
            )}
            {type === "ensaio_proficiencia" && (
              <>
                <th className="p-2 font-semibold">Programa</th>
                <th className="p-2 min-w-[180px] font-semibold">Artefatos</th>
                <th className="p-2 font-semibold">Critério</th>
              </>
            )}
            <th className="p-2 w-16 font-semibold">Qtd</th>
            <th className="p-2 w-24 font-semibold">V. unit.</th>
            <th className="p-2 w-20 font-semibold">Impostos</th>
            <th className="p-2 w-24 font-semibold">Total</th>
            {!readOnly && <th className="p-2 w-10" />}
          </>
        )}
        renderTableRow={(row, idx) => (
          <tr
            key={idx}
            className={`border-t border-slate-100 align-top ${idx % 2 === 1 ? "bg-slate-50/40" : ""}`}
          >
            <td className="p-2 text-center font-medium text-slate-600">{idx + 1}</td>
            {renderTypeFieldsTable(idx)}
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
                className={inputCls}
              />
            </td>
            <td className="p-2 font-semibold whitespace-nowrap text-slate-900">
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
        )}
      />

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
