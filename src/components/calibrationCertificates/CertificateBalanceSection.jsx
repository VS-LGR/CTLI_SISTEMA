import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FloppyDisk } from "@phosphor-icons/react";
import ScaleIndicationRangesFields from "@/components/forms/ScaleIndicationRangesFields";
import PointMaxToleranceFields from "@/components/forms/PointMaxToleranceFields";
import { TIPO_BALANCA_OPTIONS, TIPO_PLATAFORMA_OPTIONS, UNIDADE_OPTIONS } from "@/lib/coletaSchema";

const TEXT_FIELDS = [
  ["Fabricante", "fabricante"],
  ["Modelo", "modelo"],
  ["Nº de série", "serie"],
  ["Tag / Código interno", "tag"],
  ["Local da calibração", "local"],
  ["Etiqueta IPEM", "etiqueta_ipem"],
  ["Portaria INMETRO", "portaria_inmetro"],
  ["Classe", "classe"],
  ["Ponto de trabalho", "ponto_trabalho"],
];

export default function CertificateBalanceSection({
  balance = {},
  onChange,
  disabled = false,
  readOnly = false,
  scaleSerial = "",
  onScaleSerialChange,
  scaleRegistrationId = null,
  onScaleRegistrationChange,
  scales = [],
  endCustomerId = null,
  onRegisterScale,
  savingScale = false,
}) {
  const snap = balance || {};
  const locked = disabled || readOnly;
  const set = (key, value) => onChange?.({ ...snap, [key]: value });

  const scaleList = endCustomerId
    ? scales.filter((s) => s.end_customer_id === endCustomerId || !s.end_customer_id)
    : scales;

  return (
    <div className="space-y-4">
      {!readOnly && onScaleRegistrationChange && (
        <div>
          <Label>Balança (cadastro)</Label>
          <Select
            value={scaleRegistrationId || "__manual__"}
            onValueChange={onScaleRegistrationChange}
            disabled={locked}
          >
            <SelectTrigger className="h-10 mt-1">
              <SelectValue placeholder="Selecionar balança cadastrada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__manual__">— Preencher manualmente —</SelectItem>
              {scaleList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.serial_number || s.tag || "Sem série"} — {s.manufacturer} {s.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!scales.length && (
            <p className="text-xs text-amber-700 mt-1">
              Cadastre balanças em PR-7.1 → Balanças para selecionar aqui.
            </p>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Nº de série (certificado)</Label>
          <Input
            className="mt-1 h-10"
            value={scaleSerial}
            disabled={locked}
            onChange={(e) => onScaleSerialChange?.(e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEXT_FIELDS.map(([lbl, key]) => (
          <div key={key}>
            <Label className="text-xs">{lbl}</Label>
            <Input
              value={snap[key] || ""}
              disabled={locked}
              onChange={(e) => set(key, e.target.value)}
              className="mt-1 h-9"
            />
          </div>
        ))}
      </div>

      <ScaleIndicationRangesFields
        variant="balance"
        values={snap}
        unit={snap.unidade || "g"}
        includeVerificationDivision={false}
        onChange={(key, value) => set(key, value)}
      />

      <div className="max-w-[12rem]">
        <Label className="text-xs">Unidade</Label>
        <select
          value={snap.unidade || "g"}
          disabled={locked}
          onChange={(e) => set("unidade", e.target.value)}
          className="w-full border rounded-md h-9 px-2 text-sm mt-1 disabled:opacity-60"
        >
          {UNIDADE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Tipo de balança</Label>
          <select
            value={snap.tipo_balanca || ""}
            disabled={locked}
            onChange={(e) => set("tipo_balanca", e.target.value)}
            className="w-full border rounded-md h-9 px-2 text-sm mt-1 disabled:opacity-60"
          >
            <option value="">—</option>
            {TIPO_BALANCA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Tipo de plataforma</Label>
          <select
            value={snap.tipo_plataforma || ""}
            disabled={locked}
            onChange={(e) => set("tipo_plataforma", e.target.value)}
            className="w-full border rounded-md h-9 px-2 text-sm mt-1 disabled:opacity-60"
          >
            <option value="">—</option>
            {TIPO_PLATAFORMA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <p className="text-xs font-semibold text-slate-700 mb-2">
          Tolerância máxima por valor de pesagem
        </p>
        <PointMaxToleranceFields
          tolerances={snap.point_max_tolerances || []}
          unit={snap.unidade || "g"}
          readOnly={locked}
          onChange={(next) => set("point_max_tolerances", next)}
        />
      </div>

      {!readOnly && !scaleRegistrationId && onRegisterScale && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={savingScale || locked}
            onClick={onRegisterScale}
          >
            <FloppyDisk size={16} className="mr-1.5" />
            {savingScale ? "A cadastrar…" : "Cadastrar balança no cliente"}
          </Button>
          {!endCustomerId && (
            <p className="text-xs text-amber-700">Selecione o cliente na aba Dados para cadastrar a balança.</p>
          )}
        </div>
      )}

      {readOnly && (
        <p className="text-xs text-slate-500">
          Dados da balança vinculados à coleta — somente leitura.
        </p>
      )}
    </div>
  );
}
