import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "@phosphor-icons/react";
import { emptyWeightProposalItem } from "@/lib/commercialProposals/commercialProposalSchema";
import { MASS_UNIT_OPTIONS, sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { WEIGHT_CLASSES } from "@/lib/weightCalibration/weightCertificateSchema";

export default function ProposalWeightsTable({
  weightItems = [],
  onChange,
  standardWeights = [],
}) {
  const [open, setOpen] = useState(weightItems.length > 0);

  const updateItem = (index, patch) => {
    const next = weightItems.map((w, i) => (i === index ? { ...w, ...patch } : w));
    onChange(next);
  };

  const addItem = () => {
    const next = [...weightItems, emptyWeightProposalItem(weightItems.length + 1)];
    onChange(next);
    setOpen(true);
  };

  const removeItem = (index) => {
    const next = weightItems
      .filter((_, i) => i !== index)
      .map((w, i) => ({ ...w, item_number: i + 1 }));
    onChange(next);
  };

  const applyStandard = (index, standardId) => {
    const sw = standardWeights.find((s) => s.id === standardId);
    if (!sw) {
      updateItem(index, { standard_weight_item_id: "" });
      return;
    }
    updateItem(index, {
      standard_weight_item_id: sw.id,
      identification: sw.identification || "",
      nominal_value: sw.nominal_value || "",
      nominal_unit: sw.unit || "g",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Pesos-padrão</h3>
          <p className="text-xs text-slate-600">
            Itens desta proposta de calibração de pesos (RE-5.4.2A).
          </p>
        </div>
        <div className="flex gap-2">
          {weightItems.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
              {open ? "Recolher" : "Expandir"}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus size={14} className="mr-1" /> Adicionar peso
          </Button>
        </div>
      </div>

      {!weightItems.length ? (
        <p className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-md px-3 py-4">
          Nenhum peso-padrão nesta proposta.
        </p>
      ) : open ? (
        <ul className="space-y-4">
          {weightItems.map((item, index) => (
            <li
              key={item.id || `weight-${index}`}
              className="rounded-md border border-slate-200 bg-slate-50/40 p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">Peso {index + 1}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => removeItem(index)}
                  disabled={Boolean(item.collection_id)}
                  title={item.collection_id ? "Remova a coleta vinculada antes" : "Remover"}
                >
                  <Trash size={14} />
                </Button>
              </div>

              {standardWeights.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-600">Cadastro de peso-padrão</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    value={item.standard_weight_item_id || ""}
                    onChange={(e) => applyStandard(index, e.target.value)}
                  >
                    <option value="">— Manual / sem cadastro —</option>
                    {standardWeights.map((sw) => (
                      <option key={sw.id} value={sw.id}>
                        {sw.identification || "—"}
                        {sw.nominal_value ? ` (${sw.nominal_value} ${sw.unit || "g"})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Identificação</Label>
                  <Input
                    className="mt-1"
                    value={item.identification || ""}
                    onChange={(e) => updateItem(index, { identification: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor nominal</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={item.nominal_value || ""}
                    onChange={(e) =>
                      updateItem(index, { nominal_value: sanitizeMassNumericInput(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Unidade</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    value={item.nominal_unit || "g"}
                    onChange={(e) => updateItem(index, { nominal_unit: e.target.value })}
                  >
                    {MASS_UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Classe</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    value={item.uut_class || ""}
                    onChange={(e) => updateItem(index, { uut_class: e.target.value })}
                  >
                    <option value="">—</option>
                    {WEIGHT_CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Material</Label>
                  <Input
                    className="mt-1"
                    value={item.uut_material || ""}
                    onChange={(e) => updateItem(index, { uut_material: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fabricante</Label>
                  <Input
                    className="mt-1"
                    value={item.manufacturer || ""}
                    onChange={(e) => updateItem(index, { manufacturer: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nº série</Label>
                  <Input
                    className="mt-1"
                    value={item.serial_number || ""}
                    onChange={(e) => updateItem(index, { serial_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor unitário (R$)</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={item.unit_value ?? ""}
                    onChange={(e) => updateItem(index, { unit_value: e.target.value })}
                  />
                </div>
              </div>
              {item.collection_id && (
                <p className="text-xs text-green-700">Coleta de pesos vinculada</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-600">
          {weightItems.length} peso(s) na proposta — expanda para editar.
        </p>
      )}
    </div>
  );
}
