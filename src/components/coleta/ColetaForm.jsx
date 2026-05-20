import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  TIPO_BALANCA_OPTIONS,
  TIPO_PLATAFORMA_OPTIONS,
  TRI_STATE_OPTIONS,
  BINARY_OPTIONS,
  UNIDADE_OPTIONS,
  envCertLabel,
} from "@/lib/coletaSchema";
import PesoPadraoMultiSelect from "@/components/coleta/PesoPadraoMultiSelect";
import ColetaVersoForm from "@/components/coleta/ColetaVersoForm";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-600">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SectionCard({ num, title, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">{num}) {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function RadioRow({ label, options, value, onChange }) {
  const gid = label.replace(/\s/g, "-");
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-2 block">{label}</Label>
      <RadioGroup value={value || ""} onValueChange={onChange} className="flex flex-wrap gap-3">
        {options.map((o) => (
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

export default function ColetaForm({
  payload,
  onChange,
  commercialProposalRef,
  onProposalChange,
  weightItems = [],
  envCerts = [],
}) {
  const setCliente = (k, v) => onChange({ ...payload, cliente: { ...payload.cliente, [k]: v } });
  const setBalanca = (k, v) => onChange({ ...payload, balanca: { ...payload.balanca, [k]: v } });
  const setAmbiente = (k, v) => onChange({ ...payload, ambiente: { ...payload.ambiente, [k]: v } });
  const setControle = (k, v) => onChange({ ...payload, controle: { ...payload.controle, [k]: v } });

  const setEccPonto = (idx, k, v) => {
    const pontos = [...payload.excentricidade.pontos];
    pontos[idx] = { ...pontos[idx], [k]: v };
    onChange({ ...payload, excentricidade: { ...payload.excentricidade, pontos } });
  };

  const setCalPonto = (idx, k, v) => {
    const pontos = [...payload.calibracao.pontos];
    pontos[idx] = { ...pontos[idx], [k]: v };
    onChange({ ...payload, calibracao: { ...payload.calibracao, pontos } });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-slate-50 px-4 py-3 text-center">
        <p className="text-xs text-slate-600">Referente à Proposta Comercial:</p>
        <Input
          value={commercialProposalRef}
          onChange={(e) => onProposalChange(e.target.value)}
          className="mt-1 max-w-md mx-auto text-center"
          placeholder="Nº / referência da proposta"
        />
        <p className="text-sm font-semibold mt-2">COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA</p>
        <p className="text-xs text-slate-500">Cód. RE-7.2A  Ref. PR-7.2  Rev.03 de 14/05/2026</p>
      </div>

      <SectionCard num="1" title="Dados do Cliente">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Cliente">
            <Input value={payload.cliente.cliente} onChange={(e) => setCliente("cliente", e.target.value)} />
          </Field>
          <Field label="Responsável">
            <Input value={payload.cliente.responsavel} onChange={(e) => setCliente("responsavel", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard num="2" title="Informações da Balança">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Fabricante", "fabricante"],
            ["Modelo", "modelo"],
            ["Nº de série", "serie"],
            ["Tag / Código Interno", "tag"],
            ["Local da Calibração", "local"],
            ["Etiqueta IPEM", "etiqueta_ipem"],
            ["Portaria Inmetro", "portaria_inmetro"],
          ].map(([lbl, key]) => (
            <Field key={key} label={lbl}>
              <Input value={payload.balanca[key]} onChange={(e) => setBalanca(key, e.target.value)} />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-3 items-end">
          <Field label="Capacidade" className="col-span-12 sm:col-span-5">
            <Input value={payload.balanca.capacidade} onChange={(e) => setBalanca("capacidade", e.target.value)} />
          </Field>
          <Field label="Resolução" className="col-span-12 sm:col-span-5">
            <Input value={payload.balanca.resolucao} onChange={(e) => setBalanca("resolucao", e.target.value)} />
          </Field>
          <Field label="Unidade" className="col-span-12 sm:col-span-2">
            <select
              value={payload.balanca.unidade || ""}
              onChange={(e) => setBalanca("unidade", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
            >
              <option value="">—</option>
              {UNIDADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <RadioRow
          label="Tipo de balança"
          options={TIPO_BALANCA_OPTIONS}
          value={payload.balanca.tipo_balanca}
          onChange={(v) => setBalanca("tipo_balanca", v)}
        />
        {payload.balanca.tipo_balanca === "outros" && (
          <Field label="Outros (especificar)">
            <Input
              value={payload.balanca.tipo_balanca_outros}
              onChange={(e) => setBalanca("tipo_balanca_outros", e.target.value)}
            />
          </Field>
        )}
        <RadioRow
          label="Tipo de plataforma"
          options={TIPO_PLATAFORMA_OPTIONS}
          value={payload.balanca.tipo_plataforma}
          onChange={(v) => setBalanca("tipo_plataforma", v)}
        />
      </SectionCard>

      <SectionCard num="3" title="Condições Ambientais Durante a Calibração">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Identificação 1 (termo-baro-higrômetro)">
            <select
              value={payload.ambiente.thermo_cert_id || ""}
              onChange={(e) => setAmbiente("thermo_cert_id", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecionar equipamento…</option>
              {envCerts.map((e) => (
                <option key={e.id} value={e.id}>{envCertLabel(e)}</option>
              ))}
            </select>
          </Field>
          <Field label="Identificação 2 (termo-baro-higrômetro)">
            <select
              value={payload.ambiente.thermo_cert_id_2 || ""}
              onChange={(e) => setAmbiente("thermo_cert_id_2", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecionar equipamento…</option>
              {envCerts.map((e) => (
                <option key={e.id} value={e.id}>{envCertLabel(e)}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Horário inicial">
            <Input type="time" value={payload.ambiente.horario_inicial} onChange={(ev) => setAmbiente("horario_inicial", ev.target.value)} />
          </Field>
          <Field label="Horário final">
            <Input type="time" value={payload.ambiente.horario_final} onChange={(ev) => setAmbiente("horario_final", ev.target.value)} />
          </Field>
          <Field label="Temperatura inicial (°C)">
            <Input value={payload.ambiente.temp_inicial} onChange={(ev) => setAmbiente("temp_inicial", ev.target.value)} />
          </Field>
          <Field label="Temperatura final (°C)">
            <Input value={payload.ambiente.temp_final} onChange={(ev) => setAmbiente("temp_final", ev.target.value)} />
          </Field>
          <Field label="Umidade inicial (%ur)">
            <Input value={payload.ambiente.umidade_inicial} onChange={(ev) => setAmbiente("umidade_inicial", ev.target.value)} />
          </Field>
          <Field label="Umidade final (%ur)">
            <Input value={payload.ambiente.umidade_final} onChange={(ev) => setAmbiente("umidade_final", ev.target.value)} />
          </Field>
          <Field label="Pressão inicial (hPa)">
            <Input value={payload.ambiente.pressao_inicial} onChange={(ev) => setAmbiente("pressao_inicial", ev.target.value)} />
          </Field>
          <Field label="Pressão final (hPa)">
            <Input value={payload.ambiente.pressao_final} onChange={(ev) => setAmbiente("pressao_final", ev.target.value)} />
          </Field>
        </div>
        <RadioRow label="A balança foi ajustada?" options={TRI_STATE_OPTIONS} value={payload.ambiente.balanca_ajustada} onChange={(v) => setAmbiente("balanca_ajustada", v)} />
        <RadioRow label="A balança foi nivelada?" options={TRI_STATE_OPTIONS} value={payload.ambiente.balanca_nivelada} onChange={(v) => setAmbiente("balanca_nivelada", v)} />
        <RadioRow label="Existe vibração no local?" options={BINARY_OPTIONS} value={payload.ambiente.existe_vibracao} onChange={(v) => setAmbiente("existe_vibracao", v)} />
        <RadioRow label="Existe corrente de ar no local?" options={BINARY_OPTIONS} value={payload.ambiente.existe_corrente_ar} onChange={(v) => setAmbiente("existe_corrente_ar", v)} />
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard num="4" title="Ensaio de Excentricidade">
          <Field label="Valor Aplicado">
            <Input
              value={payload.excentricidade.valor_aplicado}
              onChange={(e) => onChange({
                ...payload,
                excentricidade: { ...payload.excentricidade, valor_aplicado: e.target.value },
              })}
            />
          </Field>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-2 text-left w-12">Ponto</th>
                  <th className="p-2 text-left">Antes do ajuste</th>
                  <th className="p-2 text-left">Depois do ajuste</th>
                </tr>
              </thead>
              <tbody>
                {payload.excentricidade.pontos.map((pt, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-mono">{i + 1}</td>
                    <td className="p-2">
                      <Input value={pt.antes} onChange={(e) => setEccPonto(i, "antes", e.target.value)} className="h-8" />
                    </td>
                    <td className="p-2">
                      <Input value={pt.depois} onChange={(e) => setEccPonto(i, "depois", e.target.value)} className="h-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard num="5" title="Controle">
          <div className="grid gap-4">
            <Field label="Representante do Cliente">
              <Input value={payload.controle.representante_cliente} onChange={(e) => setControle("representante_cliente", e.target.value)} />
            </Field>
            <Field label="Conferido e Transcrito por">
              <Input value={payload.controle.conferido_por} onChange={(e) => setControle("conferido_por", e.target.value)} />
            </Field>
            <Field label="Número do Certificado Emitido">
              <Input value={payload.controle.numero_certificado} onChange={(e) => setControle("numero_certificado", e.target.value)} />
            </Field>
            <Field label="Nome do Executor">
              <Input value={payload.controle.nome_executor} onChange={(e) => setControle("nome_executor", e.target.value)} />
            </Field>
            <Field label="Data da Calibração">
              <Input type="date" value={payload.controle.data_calibracao} onChange={(e) => setControle("data_calibracao", e.target.value)} />
            </Field>
            <RadioRow
              label="Pontos de Calibração Solicitados pelo Cliente"
              options={[{ value: "sim", label: "SIM" }, { value: "nao", label: "NÃO" }]}
              value={payload.controle.pontos_solicitados}
              onChange={(v) => setControle("pontos_solicitados", v)}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard num="6" title="Calibração da Balança">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-2">Ponto</th>
                <th className="p-2">Valor nominal do Peso de Referência</th>
                <th className="p-2">Leitura antes do ajuste</th>
                <th className="p-2">Leitura 1</th>
                <th className="p-2">Leitura 2</th>
                <th className="p-2">Leitura 3</th>
                <th className="p-2 min-w-[180px]">Identificação do(s) Peso(s) Padrão</th>
              </tr>
            </thead>
            <tbody>
              {payload.calibracao.pontos.map((pt, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 font-mono align-top">P{i + 1}</td>
                  <td className="p-1 align-top"><Input value={pt.peso_nominal} onChange={(e) => setCalPonto(i, "peso_nominal", e.target.value)} className="h-8 text-xs" /></td>
                  <td className="p-1 align-top"><Input value={pt.leitura_antes} onChange={(e) => setCalPonto(i, "leitura_antes", e.target.value)} className="h-8 text-xs" /></td>
                  <td className="p-1 align-top"><Input value={pt.rep1} onChange={(e) => setCalPonto(i, "rep1", e.target.value)} className="h-8 text-xs" /></td>
                  <td className="p-1 align-top"><Input value={pt.rep2} onChange={(e) => setCalPonto(i, "rep2", e.target.value)} className="h-8 text-xs" /></td>
                  <td className="p-1 align-top"><Input value={pt.rep3} onChange={(e) => setCalPonto(i, "rep3", e.target.value)} className="h-8 text-xs" /></td>
                  <td className="p-1 align-top min-w-[180px]">
                    <PesoPadraoMultiSelect
                      weightItems={weightItems}
                      value={pt.pesos_padrao_ids || []}
                      onChange={(ids) => setCalPonto(i, "pesos_padrao_ids", ids)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <ColetaVersoForm payload={payload} onChange={onChange} />
    </div>
  );
}
