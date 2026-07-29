import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MONTH_KEYS,
  MONTH_LABELS,
  getVerificationChecklist,
  verificationValueOptions,
} from "@/lib/equipmentVerifications/verificationChecklist";

/**
 * Toolbar de edição em massa para checklists de verificação.
 */
export default function VerificationMassEditToolbar({
  kind,
  assetIds = [],
  onApplyCells,
  onApplyResponsible,
  onCopyMonth,
}) {
  const checklist = getVerificationChecklist(kind);
  const valueOpts = verificationValueOptions(kind).filter((o) => o.value);
  const [month, setMonth] = useState("1");
  const [itemKey, setItemKey] = useState(checklist[0]?.key || "");
  const [value, setValue] = useState("ok");
  const [fromMonth, setFromMonth] = useState("1");
  const [toMonth, setToMonth] = useState("2");
  const [responsibleName, setResponsibleName] = useState("");

  if (!assetIds.length) return null;

  return (
    <Card className="border-slate-200 bg-slate-50/60">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold">Edição em massa</CardTitle>
        <p className="text-xs text-slate-500 font-normal">
          Aplica o mesmo valor a todos os {assetIds.length} conjunto(s)/equipamento(s) vinculados.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Item</Label>
            <select
              className="h-9 rounded border border-slate-200 bg-white px-2 text-sm min-w-[180px]"
              value={itemKey}
              onChange={(e) => setItemKey(e.target.value)}
            >
              {checklist.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mês</Label>
            <select
              className="h-9 rounded border border-slate-200 bg-white px-2 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {MONTH_KEYS.map((m, idx) => (
                <option key={m} value={m}>{MONTH_LABELS[idx]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor</Label>
            <select
              className="h-9 rounded border border-slate-200 bg-white px-2 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            >
              {valueOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onApplyCells?.({ assetIds, itemKey, month, value })}
          >
            Aplicar a todos
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-end border-t border-slate-200 pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Copiar de</Label>
            <select
              className="h-9 rounded border border-slate-200 bg-white px-2 text-sm"
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
            >
              {MONTH_KEYS.map((m, idx) => (
                <option key={m} value={m}>{MONTH_LABELS[idx]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Para</Label>
            <select
              className="h-9 rounded border border-slate-200 bg-white px-2 text-sm"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
            >
              {MONTH_KEYS.map((m, idx) => (
                <option key={m} value={m}>{MONTH_LABELS[idx]}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCopyMonth?.({ assetIds, fromMonth, toMonth })}
          >
            Copiar mês
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-end border-t border-slate-200 pt-3">
          <div className="space-y-1 flex-1 min-w-[180px]">
            <Label className="text-xs">Responsável (mês selecionado acima)</Label>
            <Input
              className="h-9"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApplyResponsible?.({ assetIds, month, value: responsibleName })}
          >
            Preencher responsável
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
