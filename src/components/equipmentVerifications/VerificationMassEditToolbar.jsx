import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowsLeftRight, CaretDown, CheckCircle, Stack, User,
} from "@phosphor-icons/react";
import {
  MONTH_KEYS,
  MONTH_LABELS,
  getVerificationChecklist,
  verificationValueOptions,
} from "@/lib/equipmentVerifications/verificationChecklist";
import { cn } from "@/lib/utils";

const MONTH_SHORT = MONTH_LABELS.map((m) => m.slice(0, 3));

function Field({ label, className, children }) {
  return (
    <div className={cn("space-y-1 min-w-0", className)}>
      <Label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ActionBlock({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4 space-y-3 min-w-0">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <Icon size={16} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

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
  const checklist = useMemo(() => getVerificationChecklist(kind), [kind]);
  const valueOpts = useMemo(
    () => verificationValueOptions(kind).filter((o) => o.value),
    [kind],
  );

  const [open, setOpen] = useState(true);
  const [month, setMonth] = useState("1");
  const [itemKey, setItemKey] = useState(checklist[0]?.key || "");
  const [value, setValue] = useState(valueOpts[0]?.value || "ok");
  const [fromMonth, setFromMonth] = useState("1");
  const [toMonth, setToMonth] = useState("2");
  const [responsibleName, setResponsibleName] = useState("");

  useEffect(() => {
    if (!checklist.some((i) => i.key === itemKey)) {
      setItemKey(checklist[0]?.key || "");
    }
  }, [checklist, itemKey]);

  useEffect(() => {
    if (!valueOpts.some((o) => o.value === value)) {
      setValue(valueOpts[0]?.value || "ok");
    }
  }, [valueOpts, value]);

  if (!assetIds.length) return null;

  const count = assetIds.length;
  const countLabel = count === 1 ? "1 equipamento" : `${count} equipamentos`;
  const monthLabel = MONTH_SHORT[Number(month) - 1] || month;
  const itemLabel = checklist.find((i) => i.key === itemKey)?.label || itemKey;
  const valueLabel = valueOpts.find((o) => o.value === value)?.label || value;
  const copyDisabled = fromMonth === toMonth;
  const responsibleDisabled = !responsibleName.trim();

  return (
    <div
      className="sticky top-2 z-20 rounded-xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90"
      data-testid="verification-mass-edit"
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 rounded-xl transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Stack size={18} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Edição em massa</span>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">
              {countLabel}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Preencher item, copiar mês ou definir responsável em todos de uma vez.
          </p>
        </div>
        <CaretDown
          size={16}
          className={cn(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 sm:px-4 pb-4 pt-3 space-y-3">
          <ActionBlock
            icon={CheckCircle}
            title="Preencher item do checklist"
            description={`Aplica o mesmo valor a «${itemLabel}» em ${monthLabel} nos ${countLabel}.`}
          >
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
              <Field label="Item" className="sm:flex-[2] sm:min-w-[200px]">
                <Select value={itemKey} onValueChange={setItemKey}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Item" />
                  </SelectTrigger>
                  <SelectContent>
                    {checklist.map((i) => (
                      <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mês" className="sm:w-[110px]">
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_KEYS.map((m, idx) => (
                      <SelectItem key={m} value={m}>{MONTH_SHORT[idx]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor" className="sm:w-[120px]">
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {valueOpts.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => onApplyCells?.({ assetIds, itemKey, month, value })}
              >
                Aplicar «{valueLabel}»
              </Button>
            </div>
          </ActionBlock>

          <ActionBlock
            icon={ArrowsLeftRight}
            title="Copiar mês inteiro"
            description="Replica todos os itens e o responsável de um mês para outro."
          >
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
              <Field label="De" className="sm:w-[120px]">
                <Select value={fromMonth} onValueChange={setFromMonth}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_KEYS.map((m, idx) => (
                      <SelectItem key={m} value={m}>{MONTH_LABELS[idx]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Para" className="sm:w-[120px]">
                <Select value={toMonth} onValueChange={setToMonth}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_KEYS.map((m, idx) => (
                      <SelectItem key={m} value={m}>{MONTH_LABELS[idx]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0"
                disabled={copyDisabled}
                onClick={() => onCopyMonth?.({ assetIds, fromMonth, toMonth })}
              >
                Copiar mês
              </Button>
              {copyDisabled && (
                <p className="text-[11px] text-amber-700 sm:self-center">Escolha meses diferentes.</p>
              )}
            </div>
          </ActionBlock>

          <ActionBlock
            icon={User}
            title="Definir responsável"
            description={`Preenche o responsável de ${monthLabel} em todos os equipamentos.`}
          >
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
              <Field label="Mês" className="sm:w-[110px]">
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_KEYS.map((m, idx) => (
                      <SelectItem key={m} value={m}>{MONTH_SHORT[idx]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nome" className="sm:flex-1 sm:min-w-[200px]">
                <Input
                  className="h-9"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Nome do responsável"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !responsibleDisabled) {
                      e.preventDefault();
                      onApplyResponsible?.({ assetIds, month, value: responsibleName.trim() });
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0"
                disabled={responsibleDisabled}
                onClick={() => onApplyResponsible?.({
                  assetIds,
                  month,
                  value: responsibleName.trim(),
                })}
              >
                Preencher responsável
              </Button>
            </div>
          </ActionBlock>
        </div>
      )}
    </div>
  );
}
