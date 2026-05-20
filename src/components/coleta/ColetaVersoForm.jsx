import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { SUBSTITUICAO_LINHA_DEFS, isSubstituicaoLinhaSoloL } from "@/lib/coletaSchema";

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
  const linhas = rep.linhas || [];
  const aplicavel = rep.aplicavel !== false;

  const setVerso = (patch) => onChange({ ...payload, verso: { ...verso, ...patch } });
  const setQuestao = (k, v) => setVerso({ questoes_carga: { ...q, [k]: v } });
  const setRep = (k, v) => setVerso({ repetitividade: { ...rep, [k]: v } });

  const linhaByKey = (key) => linhas.find((l) => l.key === key) || { key, label: key };

  const setLinha = (key, patch) => {
    const next = linhas.map((l) => (l.key === key ? { ...l, ...patch } : l));
    if (!next.some((l) => l.key === key)) {
      const def = SUBSTITUICAO_LINHA_DEFS.find((d) => d.key === key);
      next.push({ key, label: def?.label || key, ...patch });
    }
    setRep("linhas", next);
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-display">Repetitividade com Carga de Substituição</CardTitle>
          <label className="flex items-center gap-2 text-sm font-normal cursor-pointer shrink-0">
            <Checkbox
              checked={!aplicavel}
              onCheckedChange={(c) => setRep("aplicavel", !c)}
            />
            Ensaio não aplicável
          </label>
        </CardHeader>
        {aplicavel && (
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

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-2 text-left">Linha</th>
                    <th className="p-2">Valor nominal</th>
                    <th className="p-2">Leitura 1</th>
                    <th className="p-2">Leitura 2</th>
                    <th className="p-2">Leitura 3</th>
                    <th className="p-2">Massa específica</th>
                    <th className="p-2">°C</th>
                    <th className="p-2">%ur</th>
                    <th className="p-2">hPa</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBSTITUICAO_LINHA_DEFS.map((def) => {
                    const row = linhaByKey(def.key);
                    const soloL = isSubstituicaoLinhaSoloL(def);
                    const ambientCell = (field) => (
                      soloL ? (
                        <span className="text-slate-400 block text-center py-2">—</span>
                      ) : (
                        <Input
                          value={row[field] || ""}
                          onChange={(e) => setLinha(def.key, { [field]: e.target.value })}
                          className="h-8 text-xs"
                        />
                      )
                    );
                    return (
                      <tr key={def.key} className="border-b">
                        <td className="p-2 font-mono align-top whitespace-nowrap">{def.label}</td>
                        <td className="p-1 align-top">
                          <Input
                            value={row.valor_nominal || ""}
                            onChange={(e) => setLinha(def.key, { valor_nominal: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        {[0, 1, 2].map((i) => (
                          <td key={i} className="p-1 align-top">
                            {def.leituras3 || i === 0 ? (
                              <Input
                                value={row[`leitura${i + 1}`] || ""}
                                onChange={(e) => setLinha(def.key, { [`leitura${i + 1}`]: e.target.value })}
                                className="h-8 text-xs"
                              />
                            ) : (
                              <span className="text-slate-300 block text-center py-2">—</span>
                            )}
                          </td>
                        ))}
                        <td className="p-1 align-top">{ambientCell("massa_especifica")}</td>
                        <td className="p-1 align-top">{ambientCell("temp")}</td>
                        <td className="p-1 align-top">{ambientCell("umidade")}</td>
                        <td className="p-1 align-top">{ambientCell("pressao")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
