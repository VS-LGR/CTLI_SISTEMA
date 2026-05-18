import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-600">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const SIM_NAO = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

function SimNaoRow({ label, value, onChange }) {
  const gid = label.replace(/\s/g, "-");
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-2 block">{label}</Label>
      <RadioGroup value={value || ""} onValueChange={onChange} className="flex gap-4">
        {SIM_NAO.map((o) => (
          <div className="flex items-center gap-1.5" key={o.value}>
            <RadioGroupItem value={o.value} id={`${gid}-${o.value}`} />
            <Label htmlFor={`${gid}-${o.value}`} className="text-sm font-normal cursor-pointer">
              {o.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export default function ColetaVersoForm({ payload, onChange }) {
  const verso = payload.verso || {};
  const q = verso.questoes_carga || {};
  const rep = verso.repetitividade || {};
  const lotes = rep.lotes || [];

  const setVerso = (patch) => onChange({ ...payload, verso: { ...verso, ...patch } });
  const setQuestao = (k, v) => setVerso({ questoes_carga: { ...q, [k]: v } });
  const setRep = (k, v) => setVerso({ repetitividade: { ...rep, [k]: v } });

  const setLote = (idx, patch) => {
    const next = [...lotes];
    next[idx] = { ...next[idx], ...patch };
    setRep("lotes", next);
  };

  const setLoteLeitura = (idx, li, v) => {
    const lote = { ...lotes[idx] };
    const leituras = [...(lote.leituras || ["", "", ""])];
    leituras[li] = v;
    setLote(idx, { leituras });
  };

  return (
    <div className="space-y-6 border-t pt-6">
      <p className="text-center text-sm font-semibold text-slate-800">Verso — Repetitividade com Carga de Substituição</p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Descrição da Carga</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={verso.descricao_carga || ""}
            onChange={(e) => setVerso({ descricao_carga: e.target.value })}
            rows={4}
            placeholder="Descreva a carga utilizada no ensaio…"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Questões sobre a carga (2.1 – 2.3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimNaoRow
            label="2.1 A carga possui fácil manuseio?"
            value={q.facil_manuseio}
            onChange={(v) => setQuestao("facil_manuseio", v)}
          />
          <SimNaoRow
            label="2.2 A carga possui fácil definição do centro de gravidade?"
            value={q.facil_centro_gravidade}
            onChange={(v) => setQuestao("facil_centro_gravidade", v)}
          />
          <SimNaoRow
            label="2.3 A massa da carga é constante durante o ensaio?"
            value={q.massa_constante}
            onChange={(v) => setQuestao("massa_constante", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Repetitividade com Carga de Substituição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Formação da carga">
              <Input value={rep.formacao_carga || ""} onChange={(e) => setRep("formacao_carga", e.target.value)} />
            </Field>
            <Field label="Massa específica estimada (kg/m³)">
              <Input value={rep.massa_especifica_estimada || ""} onChange={(e) => setRep("massa_especifica_estimada", e.target.value)} />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea value={rep.observacoes || ""} onChange={(e) => setRep("observacoes", e.target.value)} rows={2} />
          </Field>
          <Field label="P1* — Valor indicado pela balança (kg)">
            <Input value={rep.p1_valor_balanca || ""} onChange={(e) => setRep("p1_valor_balanca", e.target.value)} />
          </Field>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-2">Lote</th>
                  <th className="p-2">Leitura 1</th>
                  <th className="p-2">Leitura 2</th>
                  <th className="p-2">Leitura 3</th>
                  <th className="p-2">Depois do ajuste</th>
                  <th className="p-2">Valor nominal carga</th>
                  <th className="p-2">Massa específica</th>
                  <th className="p-2">°C</th>
                  <th className="p-2">%ur</th>
                  <th className="p-2">hPa</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-mono align-top">L{i + 1}</td>
                    {[0, 1, 2].map((li) => (
                      <td key={li} className="p-1 align-top">
                        <Input
                          value={lote.leituras?.[li] || ""}
                          onChange={(e) => setLoteLeitura(i, li, e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                    ))}
                    <td className="p-1 align-top">
                      <Input value={lote.depois_ajuste || ""} onChange={(e) => setLote(i, { depois_ajuste: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={lote.valor_nominal_carga || ""} onChange={(e) => setLote(i, { valor_nominal_carga: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={lote.massa_especifica || ""} onChange={(e) => setLote(i, { massa_especifica: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={lote.temp || ""} onChange={(e) => setLote(i, { temp: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={lote.umidade || ""} onChange={(e) => setLote(i, { umidade: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={lote.pressao || ""} onChange={(e) => setLote(i, { pressao: e.target.value })} className="h-8 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
