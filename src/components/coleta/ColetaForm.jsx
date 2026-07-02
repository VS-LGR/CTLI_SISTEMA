import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  TIPO_BALANCA_OPTIONS,
  TIPO_PLATAFORMA_OPTIONS,
  TRI_STATE_OPTIONS,
  BINARY_OPTIONS,
  UNIDADE_OPTIONS,
  envCertIdentification,
  applyEndCustomerToCliente,
  resolveEndCustomerId,
  syncCalPointNominal,
  syncEccValorAplicado,
  sanitizeMassNumericInput,
} from "@/lib/coletaSchema";
import { describeWeightComposition } from "@/lib/certificateCalculations/pointCalculations";
import MassValueField from "@/components/forms/MassValueField";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import { proposalEditorPath } from "@/lib/commercialProposals/commercialProposalRoutes";
import PesoPadraoMultiSelect from "@/components/coleta/PesoPadraoMultiSelect";
import ScaleIndicationRangesFields from "@/components/forms/ScaleIndicationRangesFields";
import ColetaVersoForm from "@/components/coleta/ColetaVersoForm";
import TbhCorrectionPanel from "@/components/coleta/TbhCorrectionPanel";
import CalibracaoOrdemTooltip from "@/components/coleta/CalibracaoOrdemTooltip";
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

function SectionCard({ num, title, children, headerAction }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-display">{num}) {title}</CardTitle>
          {headerAction}
        </div>
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
  linkedProposalId = null,
  weightItems = [],
  envCerts = [],
  endCustomers = [],
  employees = [],
  isNew = false,
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const selectedEndCustomerId = resolveEndCustomerId(payload, endCustomers);
  const autoFilledSingleClient = useRef(false);
  const defaultUnit = payload.balanca?.unidade || "g";

  useEffect(() => {
    if (!isNew || endCustomers.length !== 1 || autoFilledSingleClient.current) return;
    if (!(payload.cliente?.cliente || "").trim() && !payload.cliente?.end_customer_id) {
      autoFilledSingleClient.current = true;
      onChange(applyEndCustomerToCliente(payload, endCustomers[0]));
    }
  }, [isNew, endCustomers, payload, onChange]);

  const onSelectEndCustomer = (id) => {
    if (!id) {
      onChange({
        ...payload,
        cliente: { ...payload.cliente, end_customer_id: "", cliente: "", responsavel: "" },
      });
      return;
    }
    const ec = endCustomers.find((c) => c.id === id);
    if (ec) onChange(applyEndCustomerToCliente(payload, ec));
  };

  const setCliente = (k, v) => onChange({ ...payload, cliente: { ...payload.cliente, [k]: v } });
  const setBalanca = (k, v) => onChange({ ...payload, balanca: { ...payload.balanca, [k]: v } });
  const AMBIENTE_READING_KEYS = [
    "temp_inicial", "temp_final", "umidade_inicial", "umidade_final", "pressao_inicial", "pressao_final",
  ];

  const setAmbiente = (k, v) => {
    const next = { ...payload.ambiente, [k]: v };
    if (AMBIENTE_READING_KEYS.includes(k) && payload.ambiente.tbh_correction_applied) {
      next.tbh_correction_applied = false;
      const raw = { ...(next.tbh_correction_raw || {}) };
      delete raw[k];
      next.tbh_correction_raw = raw;
    }
    onChange({ ...payload, ambiente: next });
  };
  const setControle = (k, v) => onChange({ ...payload, controle: { ...payload.controle, [k]: v } });

  const setEccPonto = (idx, k, v) => {
    const pontos = [...payload.excentricidade.pontos];
    pontos[idx] = { ...pontos[idx], [k]: sanitizeMassNumericInput(v) };
    onChange({ ...payload, excentricidade: { ...payload.excentricidade, pontos } });
  };

  const setCalPonto = (idx, k, v) => {
    const pontos = [...payload.calibracao.pontos];
    pontos[idx] = { ...pontos[idx], [k]: v };
    onChange({ ...payload, calibracao: { ...payload.calibracao, pontos } });
  };

  const setCalPontoReading = (idx, k, v) => {
    setCalPonto(idx, k, sanitizeMassNumericInput(v));
  };

  const setCalPontoNominal = (idx, valor, unidade) => {
    const pontos = [...payload.calibracao.pontos];
    pontos[idx] = syncCalPointNominal(
      { ...pontos[idx], peso_nominal_valor: valor, peso_nominal_unidade: unidade || defaultUnit },
      defaultUnit,
    );
    onChange({ ...payload, calibracao: { ...payload.calibracao, pontos } });
  };

  const setCalPontoPesos = (idx, ids) => {
    const pontos = [...payload.calibracao.pontos];
    const pt = { ...pontos[idx], pesos_padrao_ids: ids };
    const comp = describeWeightComposition(ids, weightItems, { targetUnit: defaultUnit });
    if (comp.valid && comp.total != null) {
      const valorStr = String(comp.total).replace(".", ",");
      pontos[idx] = syncCalPointNominal(
        { ...pt, peso_nominal_valor: valorStr, peso_nominal_unidade: defaultUnit },
        defaultUnit,
      );
    } else {
      pontos[idx] = pt;
    }
    onChange({ ...payload, calibracao: { ...payload.calibracao, pontos } });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-slate-50 px-4 py-3 text-center">
        <p className="text-xs text-slate-600">Referente à Proposta Comercial:</p>
        {linkedProposalId ? (
          <div className="mt-1 space-y-1">
            <p className="font-mono text-sm font-semibold">{commercialProposalRef || "—"}</p>
            <Link to={proposalEditorPath(linkedProposalId)} className="text-xs text-blue-600 hover:underline">
              Ver proposta vinculada
            </Link>
          </div>
        ) : (
          <Input
            value={commercialProposalRef}
            onChange={(e) => onProposalChange(e.target.value)}
            className="mt-1 max-w-md mx-auto text-center"
            placeholder="Nº / referência da proposta"
          />
        )}
        <p className="text-sm font-semibold mt-2">COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA</p>
        <p className="text-xs text-slate-500">Cód. RE-7.2A  Ref. PR-7.2  Rev.03 de 14/05/2026</p>
      </div>

      <SectionCard num="1" title="Dados do Cliente">
        {endCustomers.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nenhum cliente cadastrado.{" "}
            <Link to={cadastroSectionPath("clientes")} className="text-blue-600 hover:underline">
              Cadastros → Clientes
            </Link>
          </p>
        ) : (
          <Field label="Cliente (cadastro)">
            <select
              value={selectedEndCustomerId}
              onChange={(e) => onSelectEndCustomer(e.target.value)}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white"
            >
              <option value="">— Selecionar —</option>
              {endCustomers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}
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
        <div className="space-y-3">
          <ScaleIndicationRangesFields
            variant="balance"
            values={payload.balanca}
            unit={payload.balanca.unidade || "g"}
            includeVerificationDivision={false}
            onChange={(key, value) => setBalanca(key, value)}
          />
          <Field label="Unidade" className="max-w-[12rem]">
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
        <p className="text-xs text-slate-500 mt-1">Unidade padrão dos pontos de calibração (secção 6).</p>
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
                <option key={e.id} value={e.id}>{envCertIdentification(e)}</option>
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
                <option key={e.id} value={e.id}>{envCertIdentification(e)}</option>
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
        <TbhCorrectionPanel
          mode="coleta"
          ambiente={payload.ambiente}
          envCerts={envCerts}
          onAmbienteChange={(ambiente) => onChange({ ...payload, ambiente })}
        />
        <RadioRow label="A balança foi ajustada?" options={TRI_STATE_OPTIONS} value={payload.ambiente.balanca_ajustada} onChange={(v) => setAmbiente("balanca_ajustada", v)} />
        <RadioRow label="A balança foi nivelada?" options={TRI_STATE_OPTIONS} value={payload.ambiente.balanca_nivelada} onChange={(v) => setAmbiente("balanca_nivelada", v)} />
        <RadioRow label="Existe vibração no local?" options={BINARY_OPTIONS} value={payload.ambiente.existe_vibracao} onChange={(v) => setAmbiente("existe_vibracao", v)} />
        <RadioRow label="Existe corrente de ar no local?" options={BINARY_OPTIONS} value={payload.ambiente.existe_corrente_ar} onChange={(v) => setAmbiente("existe_corrente_ar", v)} />
        <Field label="Observações">
          <Textarea
            value={payload.ambiente.observacoes || ""}
            onChange={(e) => setAmbiente("observacoes", e.target.value)}
            rows={2}
          />
        </Field>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard
          num="4"
          title="Ensaio de Excentricidade"
          headerAction={<CalibracaoOrdemTooltip tipoPlataforma={payload.balanca.tipo_plataforma} />}
        >
          <Field label="Valor Aplicado">
            <MassValueField
              compact={!isDesktop}
              value={payload.excentricidade.valor_aplicado_valor || ""}
              unit={payload.excentricidade.valor_aplicado_unidade || defaultUnit}
              defaultUnit={defaultUnit}
              onValueChange={(v) => onChange({
                ...payload,
                excentricidade: syncEccValorAplicado({
                  ...payload.excentricidade,
                  valor_aplicado_valor: v,
                }, defaultUnit),
              })}
              onUnitChange={(u) => onChange({
                ...payload,
                excentricidade: syncEccValorAplicado({
                  ...payload.excentricidade,
                  valor_aplicado_unidade: u,
                }, defaultUnit),
              })}
            />
          </Field>
          {!isDesktop && (
            <div className="space-y-3">
              {payload.excentricidade.pontos.map((pt, i) => (
                <FormRowCard key={i} label={`Ponto ${i + 1}`} readOnly>
                  <Field label="Antes do ajuste">
                    <Input value={pt.antes} onChange={(e) => setEccPonto(i, "antes", e.target.value)} className="h-10" />
                  </Field>
                  <Field label="Depois do ajuste">
                    <Input value={pt.depois} onChange={(e) => setEccPonto(i, "depois", e.target.value)} className="h-10" />
                  </Field>
                </FormRowCard>
              ))}
            </div>
          )}
          {isDesktop && (
            <FormRowsTableShell tableMinWidth="400px">
              <FormRowsTableHead>
                <tr>
                  <th className="p-2 text-left w-12 font-semibold sticky left-0 z-[1] bg-slate-50">Ponto</th>
                  <th className="p-2 text-left font-semibold">Antes do ajuste</th>
                  <th className="p-2 text-left font-semibold">Depois do ajuste</th>
                </tr>
              </FormRowsTableHead>
              <FormRowsTableBody>
                {payload.excentricidade.pontos.map((pt, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="p-2 font-mono sticky left-0 z-[1] bg-white">{i + 1}</td>
                    <td className="p-2">
                      <Input value={pt.antes} onChange={(e) => setEccPonto(i, "antes", e.target.value)} className="h-10" />
                    </td>
                    <td className="p-2">
                      <Input value={pt.depois} onChange={(e) => setEccPonto(i, "depois", e.target.value)} className="h-10" />
                    </td>
                  </tr>
                ))}
              </FormRowsTableBody>
            </FormRowsTableShell>
          )}
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
            <Field label="Técnico executor">
              <select
                value={payload.controle.executor_id || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const emp = employees.find((x) => x.id === id);
                  onChange({
                    ...payload,
                    controle: {
                      ...payload.controle,
                      executor_id: id,
                      nome_executor: emp?.full_name || "",
                    },
                  });
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Selecionar colaborador…</option>
                {employees
                  .filter((e) => ["tecnico_em_balancas", "gerente_tecnico", "signatario"].includes(e.job_role))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
              </select>
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

      <SectionCard
        num="6"
        title="Calibração da Balança"
      >
        <p className="text-xs text-slate-500 -mt-2">
          A identificação do peso padrão não altera o valor nominal — preencha-o separadamente.
        </p>
        {!isDesktop && (
          <div className="space-y-3">
            {payload.calibracao.pontos.map((pt, i) => (
              <FormRowCard key={i} label={`Ponto P${i + 1}`} readOnly>
                <Field label="Valor nominal do Peso de Referência">
                  <MassValueField
                    value={pt.peso_nominal_valor || ""}
                    unit={pt.peso_nominal_unidade || defaultUnit}
                    defaultUnit={defaultUnit}
                    onValueChange={(v) => setCalPontoNominal(i, v, pt.peso_nominal_unidade || defaultUnit)}
                    onUnitChange={(u) => setCalPontoNominal(i, pt.peso_nominal_valor || "", u)}
                  />
                </Field>
                <Field label="Leitura antes do ajuste">
                  <Input inputMode="decimal" value={pt.leitura_antes} onChange={(e) => setCalPontoReading(i, "leitura_antes", e.target.value)} className="h-10" />
                </Field>
                <Field label="Leitura 1">
                  <Input inputMode="decimal" value={pt.rep1} onChange={(e) => setCalPontoReading(i, "rep1", e.target.value)} className="h-10" />
                </Field>
                <Field label="Leitura 2">
                  <Input inputMode="decimal" value={pt.rep2} onChange={(e) => setCalPontoReading(i, "rep2", e.target.value)} className="h-10" />
                </Field>
                <Field label="Leitura 3">
                  <Input inputMode="decimal" value={pt.rep3} onChange={(e) => setCalPontoReading(i, "rep3", e.target.value)} className="h-10" />
                </Field>
                <Field label="Identificação do(s) Peso(s) Padrão">
                  <PesoPadraoMultiSelect
                    weightItems={weightItems}
                    value={pt.pesos_padrao_ids || []}
                    onChange={(ids) => setCalPontoPesos(i, ids)}
                    unit={pt.peso_nominal_unidade || defaultUnit}
                  />
                </Field>
              </FormRowCard>
            ))}
          </div>
        )}
        {isDesktop && (
          <FormRowsTableShell tableMinWidth="800px">
            <FormRowsTableHead>
              <tr>
                <th className="p-2 font-semibold sticky left-0 z-[1] bg-slate-50">Ponto</th>
                <th className="p-2 font-semibold" title="Valor nominal do Peso de Referência aplicado">Valor nominal</th>
                <th className="p-2 font-semibold w-16" title="Unidade de massa">Un.</th>
                <th className="p-2 font-semibold">Leitura antes do ajuste</th>
                <th className="p-2 font-semibold">Leitura 1</th>
                <th className="p-2 font-semibold">Leitura 2</th>
                <th className="p-2 font-semibold">Leitura 3</th>
                <th className="p-2 min-w-[180px] font-semibold">Identificação do(s) Peso(s) Padrão</th>
              </tr>
            </FormRowsTableHead>
            <FormRowsTableBody>
              {payload.calibracao.pontos.map((pt, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2 font-mono align-top sticky left-0 z-[1] bg-white">P{i + 1}</td>
                  <td className="p-1 align-top min-w-[88px]">
                    <Input
                      inputMode="decimal"
                      value={pt.peso_nominal_valor || ""}
                      onChange={(e) => setCalPontoNominal(i, e.target.value, pt.peso_nominal_unidade || defaultUnit)}
                      className="h-10 text-sm"
                    />
                  </td>
                  <td className="p-1 align-top w-16">
                    <select
                      value={pt.peso_nominal_unidade || defaultUnit}
                      onChange={(e) => setCalPontoNominal(i, pt.peso_nominal_valor || "", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-1 text-xs shadow-sm"
                    >
                      {UNIDADE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.leitura_antes} onChange={(e) => setCalPontoReading(i, "leitura_antes", e.target.value)} className="h-10 text-sm" /></td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.rep1} onChange={(e) => setCalPontoReading(i, "rep1", e.target.value)} className="h-10 text-sm" /></td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.rep2} onChange={(e) => setCalPontoReading(i, "rep2", e.target.value)} className="h-10 text-sm" /></td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.rep3} onChange={(e) => setCalPontoReading(i, "rep3", e.target.value)} className="h-10 text-sm" /></td>
                  <td className="p-1 align-top min-w-[180px]">
                    <PesoPadraoMultiSelect
                      weightItems={weightItems}
                      value={pt.pesos_padrao_ids || []}
                      onChange={(ids) => setCalPontoPesos(i, ids)}
                      unit={pt.peso_nominal_unidade || defaultUnit}
                    />
                  </td>
                </tr>
              ))}
            </FormRowsTableBody>
          </FormRowsTableShell>
        )}
      </SectionCard>

      <ColetaVersoForm payload={payload} onChange={onChange} defaultUnit={defaultUnit} />
    </div>
  );
}
