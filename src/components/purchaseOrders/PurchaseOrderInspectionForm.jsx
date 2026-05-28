import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function BoolSelect({ label, value, onChange, disabled }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <select
        value={value === null || value === undefined ? "" : value ? "sim" : "nao"}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "") onChange(null);
          else onChange(e.target.value === "sim");
        }}
        className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white disabled:opacity-60"
      >
        <option value="">—</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>
  );
}

export default function PurchaseOrderInspectionForm({
  type,
  inspection,
  onChange,
  employees = [],
  weightCerts = [],
  readOnly = false,
}) {
  const set = (patch) => onChange?.({ ...inspection, ...patch });

  const showCert = type === "calibracao_pesos_padrao" || type === "calibracao_termo_baro_higrometro";
  const showReport = type === "ensaio_proficiencia" || type === "auditoria_interna";

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg">Inspeção de recebimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BoolSelect
          label="O item recebido confere com a descrição do pedido de compras?"
          value={inspection?.received_matches_order}
          onChange={(v) => set({ received_matches_order: v })}
          disabled={readOnly}
        />

        {showCert && (
          <>
            <BoolSelect
              label="O certificado adquirido confere com a descrição do Pedido de Compras?"
              value={inspection?.certificate_matches_order}
              onChange={(v) => set({ certificate_matches_order: v })}
              disabled={readOnly}
            />
            <div>
              <Label>Número(s) do(s) certificado(s)</Label>
              {!readOnly && weightCerts.length > 0 && (
                <select
                  className="w-full border rounded-md h-10 px-3 mt-1 text-sm mb-2"
                  value=""
                  onChange={(e) => {
                    const c = weightCerts.find((x) => x.id === e.target.value);
                    if (c?.certificate_number) {
                      const cur = inspection?.certificate_numbers || "";
                      const next = cur ? `${cur}, ${c.certificate_number}` : c.certificate_number;
                      set({ certificate_numbers: next });
                    }
                  }}
                >
                  <option value="">+ certificado cadastrado</option>
                  {weightCerts.map((c) => (
                    <option key={c.id} value={c.id}>{c.certificate_number} — {c.set_name}</option>
                  ))}
                </select>
              )}
              <Input
                value={inspection?.certificate_numbers || ""}
                disabled={readOnly}
                onChange={(e) => set({ certificate_numbers: e.target.value })}
                className="mt-1"
              />
            </div>
          </>
        )}

        {showReport && (
          <>
            <BoolSelect
              label={type === "ensaio_proficiencia"
                ? "O fornecedor enviou relatório do PEP?"
                : "O fornecedor enviou relatório de auditoria?"}
              value={inspection?.supplier_sent_report}
              onChange={(v) => set({ supplier_sent_report: v })}
              disabled={readOnly}
            />
            {type === "ensaio_proficiencia" && (
              <BoolSelect
                label="O equipamento confere com a descrição do Pedido de Compras?"
                value={inspection?.report_matches_order}
                onChange={(v) => set({ report_matches_order: v })}
                disabled={readOnly}
              />
            )}
            {type === "auditoria_interna" && (
              <BoolSelect
                label="O relatório adquirido confere com a descrição do Pedido de Compras?"
                value={inspection?.report_matches_order}
                onChange={(v) => set({ report_matches_order: v })}
                disabled={readOnly}
              />
            )}
            <div>
              <Label>Motivo (se não enviado)</Label>
              <Textarea
                rows={2}
                value={inspection?.reason || ""}
                disabled={readOnly}
                onChange={(e) => set({ reason: e.target.value })}
                className="mt-1"
              />
            </div>
          </>
        )}

        <div>
          <Label>Resultado da inspeção</Label>
          <select
            value={inspection?.result || ""}
            disabled={readOnly}
            onChange={(e) => set({ result: e.target.value || null })}
            className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
          >
            <option value="">—</option>
            <option value="aceito">Aceito</option>
            <option value="reprovado">Reprovado, devolver para o fornecedor</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Responsável pela inspeção</Label>
            <select
              value={inspection?.inspection_responsible_id || ""}
              disabled={readOnly}
              onChange={(e) => set({ inspection_responsible_id: e.target.value || null })}
              className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
            >
              <option value="">Selecione…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Data da inspeção</Label>
            <Input
              type="date"
              value={inspection?.inspection_date || ""}
              disabled={readOnly}
              onChange={(e) => set({ inspection_date: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
