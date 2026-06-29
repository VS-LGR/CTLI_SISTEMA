import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ADJUST_OPTIONS } from "@/lib/commercialProposals/commercialProposalSchema";

export default function ProposalCommercialSection({ form, onChange, computedTotal }) {
  const set = (key, value) => onChange({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">Condições comerciais</h3>
      <div>
        <Label className="text-xs">Assunto</Label>
        <Input className="mt-1" value={form.subject || ""} onChange={(e) => set("subject", e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Calibração antes de ajustes?</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={form.adjust_before || ""}
            onChange={(e) => set("adjust_before", e.target.value)}
          >
            {ADJUST_OPTIONS.map((o) => <option key={o.value || "empty"} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Calibração depois de ajustes?</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={form.adjust_after || ""}
            onChange={(e) => set("adjust_after", e.target.value)}
          >
            {ADJUST_OPTIONS.map((o) => <option key={`a-${o.value || "empty"}`} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Observações</Label>
        <Textarea className="mt-1 min-h-[80px]" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="max-w-xs">
        <Label className="text-xs">Valor total (R$)</Label>
        <Input
          className="mt-1 font-mono"
          value={form.total_value !== "" && form.total_value != null ? form.total_value : computedTotal}
          onChange={(e) => set("total_value", e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">Soma das balanças: {computedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
}
