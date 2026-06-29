import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { SUBSTITUICAO_LINHA_DEFS, isSubstituicaoLinhaSoloL, syncLinhaValorNominal } from "@/lib/coletaSchema";
import MassValueField from "@/components/forms/MassValueField";
import { calculateAirDensityFromEnvironmental, formatAirDensityDisplay } from "@/lib/certificateCalculations/environmentalCalculations";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import FormRowCard from "@/components/forms/FormRowCard";
import FormRowsTableShell, { FormRowsTableHead, FormRowsTableBody } from "@/components/forms/FormRowsTableShell";

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

function SimNaoRow({ label, value, onChange, disabled }) {
  const gid = label.replace(/\s/g, "-");
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-2 block">{label}</Label>
      <RadioGroup
        value={value || ""}
        onValueChange={onChange}
        className="flex gap-4"
        disabled={disabled}
      >
        {SIM_NAO.map((o) => (
          <div className="flex items-center gap-1.5" key={o.value}>
            <RadioGroupItem value={o.value} id={`${gid}-${o.value}`} disabled={disabled} />
            <Label htmlFor={`${gid}-${o.value}`} className="text-sm font-normal cursor-pointer">
              {o.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function RepetitividadeLinhaFields({ def, row, soloL, aplicavel, setLinha, globalAirDensity, defaultUnit }) {
  const inputCls = "h-10 text-sm";
  const lineAirDensity = (!soloL && (row.temp || row.umidade || row.pressao))
    ? calculateAirDensityFromEnvironmental({
      initial_temperature: row.temp,
      final_temperature: row.temp,
      initial_humidity: row.umidade,
      final_humidity: row.umidade,
      initial_pressure: row.pressao,
      final_pressure: row.pressao,
    })
    : globalAirDensity;
  const ambientField = (field, label) => (
    <Field key={field} label={label}>
      {soloL ? (
        <span className="text-slate-400 block text-center py-2 text-sm">—</span>
      ) : (
        <Input
          value={row[field] || ""}
          onChange={(e) => setLinha(def.key, { [field]: e.target.value })}
          className={inputCls}
          disabled={!aplicavel}
        />
      )}
    </Field>
  );

  return (
    <>
      <Field label="Valor nominal">
        <MassValueField
          compact
          value={row.valor_nominal_valor || ""}
          unit={row.valor_nominal_unidade || defaultUnit}
          defaultUnit={defaultUnit}
          disabled={!aplicavel}
          onValueChange={(v) => setLinha(def.key, syncLinhaValorNominal({
            ...row,
            valor_nominal_valor: v,
          }, defaultUnit))}
          onUnitChange={(u) => setLinha(def.key, syncLinhaValorNominal({
            ...row,
            valor_nominal_unidade: u,
          }, defaultUnit))}
        />
      </Field>
      {[0, 1, 2].map((i) => (
        def.leituras3 || i === 0 ? (
          <Field key={`leitura-${i}`} label={`Leitura ${i + 1}`}>
            <Input
              value={row[`leitura${i + 1}`] || ""}
              onChange={(e) => setLinha(def.key, { [`leitura${i + 1}`]: e.target.value })}
              className={inputCls}
              disabled={!aplicavel}
            />
          </Field>
        ) : null
      ))}
      {ambientField("temp", "°C")}
      {ambientField("umidade", "% ur")}
      {ambientField("pressao", "hPa")}
      <Field label="Massa específica (calc.)">
        {soloL ? (
          <span className="text-slate-400 block text-center py-2 text-sm">—</span>
        ) : (
          <Input
            readOnly
            className={`${inputCls} bg-slate-50`}
            value={`${formatAirDensityDisplay(lineAirDensity.valid ? lineAirDensity.value : null)} kg/m³`}
            disabled={!aplicavel}
          />
        )}
      </Field>
    </>
  );
}

export default function ColetaVersoForm({ payload, onChange, defaultUnit = "g" }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
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

  const ambiente = payload.ambiente || {};
  const globalAirDensity = calculateAirDensityFromEnvironmental({
    initial_temperature: ambiente.temp_inicial,
    final_temperature: ambiente.temp_final,
    initial_humidity: ambiente.umidade_inicial,
    final_humidity: ambiente.umidade_final,
    initial_pressure: ambiente.pressao_inicial,
    final_pressure: ambiente.pressao_final,
  });

  return (
    <div className="space-y-6 border-t pt-6">
      <p className="text-center text-sm font-semibold text-slate-800">
        Verso — Repetitividade com Lote de Carga
      </p>

      <label className="flex items-center gap-2 text-sm cursor-pointer justify-center sm:justify-start">
        <Checkbox
          checked={!aplicavel}
          onCheckedChange={(c) => setRep("aplicavel", !c)}
        />
        <span>Ensaio de repetitividade com lote de carga não aplicável</span>
      </label>

      <div
        className={`space-y-6 ${!aplicavel ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={!aplicavel}
      >
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
              disabled={!aplicavel}
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
              disabled={!aplicavel}
            />
            <SimNaoRow
              label="2.2 A carga possui fácil definição do centro de gravidade?"
              value={q.facil_centro_gravidade}
              onChange={(v) => setQuestao("facil_centro_gravidade", v)}
              disabled={!aplicavel}
            />
            <SimNaoRow
              label="2.3 A massa da carga é constante durante o ensaio?"
              value={q.massa_constante}
              onChange={(v) => setQuestao("massa_constante", v)}
              disabled={!aplicavel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">
              Repetitividade com Lote de Carga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Formação da carga">
                <Input
                  value={rep.formacao_carga || ""}
                  onChange={(e) => setRep("formacao_carga", e.target.value)}
                  disabled={!aplicavel}
                />
              </Field>
              <Field label="Massa específica estimada (kg/m³) — calculada">
                <Input
                  readOnly
                  className="bg-slate-50"
                  value={`${formatAirDensityDisplay(globalAirDensity.valid ? globalAirDensity.value : null)} kg/m³`}
                  disabled={!aplicavel}
                />
              </Field>
            </div>
            <Field label="Observações">
              <Textarea
                value={rep.observacoes || ""}
                onChange={(e) => setRep("observacoes", e.target.value)}
                rows={2}
                disabled={!aplicavel}
              />
            </Field>

            {!isDesktop && (
              <div className="space-y-3">
                {SUBSTITUICAO_LINHA_DEFS.map((def) => {
                  const row = linhaByKey(def.key);
                  const soloL = isSubstituicaoLinhaSoloL(def);
                  return (
                    <FormRowCard key={def.key} label={def.label} readOnly>
                      <RepetitividadeLinhaFields
                        def={def}
                        row={row}
                        soloL={soloL}
                        aplicavel={aplicavel}
                        setLinha={setLinha}
                        globalAirDensity={globalAirDensity}
                        defaultUnit={defaultUnit}
                      />
                    </FormRowCard>
                  );
                })}
              </div>
            )}

            {isDesktop && (
              <FormRowsTableShell tableMinWidth="960px">
                <FormRowsTableHead>
                  <tr>
                    <th className="p-2 text-left sticky left-0 z-[1] bg-slate-50 font-semibold">Linha</th>
                    <th className="p-2 font-semibold">Valor</th>
                    <th className="p-2 font-semibold w-14">Un.</th>
                    <th className="p-2 font-semibold">Leitura 1</th>
                    <th className="p-2 font-semibold">Leitura 2</th>
                    <th className="p-2 font-semibold">Leitura 3</th>
                    <th className="p-2 font-semibold">Massa específica</th>
                    <th className="p-2 font-semibold">°C</th>
                    <th className="p-2 font-semibold">%ur</th>
                    <th className="p-2 font-semibold">hPa</th>
                  </tr>
                </FormRowsTableHead>
                <FormRowsTableBody>
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
                          className="h-10 text-sm"
                          disabled={!aplicavel}
                        />
                      )
                    );
                    const lineAirDensity = (!soloL && (row.temp || row.umidade || row.pressao))
                      ? calculateAirDensityFromEnvironmental({
                        initial_temperature: row.temp,
                        final_temperature: row.temp,
                        initial_humidity: row.umidade,
                        final_humidity: row.umidade,
                        initial_pressure: row.pressao,
                        final_pressure: row.pressao,
                      })
                      : globalAirDensity;
                    return (
                      <tr key={def.key} className="border-b border-slate-100">
                        <td className="p-2 font-mono align-top whitespace-nowrap sticky left-0 z-[1] bg-white font-medium">
                          {def.label}
                        </td>
                        <td className="p-1 align-top">
                          <Input
                            inputMode="decimal"
                            value={row.valor_nominal_valor || ""}
                            onChange={(e) => setLinha(def.key, syncLinhaValorNominal({
                              ...row,
                              valor_nominal_valor: e.target.value,
                            }, defaultUnit))}
                            className="h-10 text-sm"
                            disabled={!aplicavel}
                          />
                        </td>
                        <td className="p-1 align-top w-14">
                          <select
                            value={row.valor_nominal_unidade || defaultUnit}
                            onChange={(e) => setLinha(def.key, syncLinhaValorNominal({
                              ...row,
                              valor_nominal_unidade: e.target.value,
                            }, defaultUnit))}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-1 text-xs shadow-sm"
                            disabled={!aplicavel}
                          >
                            <option value="mg">mg</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                          </select>
                        </td>
                        {[0, 1, 2].map((i) => (
                          <td key={i} className="p-1 align-top">
                            {def.leituras3 || i === 0 ? (
                              <Input
                                value={row[`leitura${i + 1}`] || ""}
                                onChange={(e) => setLinha(def.key, { [`leitura${i + 1}`]: e.target.value })}
                                className="h-10 text-sm"
                                disabled={!aplicavel}
                              />
                            ) : (
                              <span className="text-slate-300 block text-center py-2">—</span>
                            )}
                          </td>
                        ))}
                        <td className="p-1 align-top text-xs text-slate-700">
                          {soloL ? "—" : `${formatAirDensityDisplay(lineAirDensity.valid ? lineAirDensity.value : null)} kg/m³`}
                        </td>
                        <td className="p-1 align-top">{ambientCell("temp")}</td>
                        <td className="p-1 align-top">{ambientCell("umidade")}</td>
                        <td className="p-1 align-top">{ambientCell("pressao")}</td>
                      </tr>
                    );
                  })}
                </FormRowsTableBody>
              </FormRowsTableShell>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
