import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { FloppyDisk, CopySimple } from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { formatColetaProposalLine, formatColetaOsTitle } from "@/lib/coletaOsMeta";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import FormRowCard from "@/components/forms/FormRowCard";
import FormRowsTableShell, { FormRowsTableHead, FormRowsTableBody } from "@/components/forms/FormRowsTableShell";
import { balanceSnapshotFromScaleRegistration } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { createScaleRegistrationFromBalance } from "@/lib/scaleRegistrations/scaleRegistrationApi";

const READING_INPUT = "h-11 text-base sm:text-sm font-mono tabular-nums";

function Field({ label, children, className = "", hint }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-600">{label}</Label>
      {hint ? <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{hint}</p> : null}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SectionCard({ id, num, title, children, headerAction, emphasis = false, subtitle }) {
  return (
    <Card
      id={id}
      className={emphasis ? "border-blue-300 shadow-sm ring-1 ring-blue-100 scroll-mt-24" : "scroll-mt-24"}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-display">{num}) {title}</CardTitle>
            {subtitle ? <p className="text-xs text-slate-600 mt-1">{subtitle}</p> : null}
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FieldNav({ items }) {
  return (
    <nav
      aria-label="Secções da coleta"
      className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-white/95 backdrop-blur border-b border-slate-200 mb-4"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              item.primary
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function RadioRow({ label, options, value, onChange, disabled = false }) {
  const gid = label.replace(/\s/g, "-");
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-2 block">{label}</Label>
      <RadioGroup value={value || ""} onValueChange={onChange} disabled={disabled} className="flex flex-wrap gap-3">
        {options.map((o) => (
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

export default function ColetaForm({
  payload,
  onChange,
  commercialProposalRef,
  onProposalChange,
  linkedProposalId = null,
  headerLocked = false,
  weightItems = [],
  envCerts = [],
  endCustomers = [],
  employees = [],
  registeredScales = [],
  scaleRegistrationId = null,
  onScaleRegistrationChange,
  onRegisteredScaleCreated,
  tenantId = "",
  isNew = false,
  collectionNumber = null,
  collectionYear = null,
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const selectedEndCustomerId = resolveEndCustomerId(payload, endCustomers);
  const autoFilledSingleClient = useRef(false);
  const defaultUnit = payload.balanca?.unidade || "g";
  const [savingScale, setSavingScale] = useState(false);
  const [showAllScales, setShowAllScales] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(!headerLocked);
  const [showEmptyCalPoints, setShowEmptyCalPoints] = useState(!headerLocked);

  useEffect(() => {
    setHeaderOpen(!headerLocked);
    setShowEmptyCalPoints(!headerLocked);
  }, [headerLocked]);

  const calPointEntries = useMemo(() => {
    const pontos = payload.calibracao?.pontos || [];
    return pontos
      .map((pt, index) => ({ pt, index }))
      .filter(({ pt }) => {
        if (showEmptyCalPoints) return true;
        return String(pt.peso_nominal_valor || "").trim() !== "";
      });
  }, [payload.calibracao?.pontos, showEmptyCalPoints]);

  const useReadingCards = !isDesktop || headerLocked || calPointEntries.length <= 6;

  const filteredByClient = selectedEndCustomerId
    ? registeredScales.filter((s) => s.end_customer_id === selectedEndCustomerId || !s.end_customer_id)
    : registeredScales;
  const scaleList = showAllScales || !selectedEndCustomerId ? registeredScales : filteredByClient;
  const clientFilterEmpty = Boolean(
    selectedEndCustomerId && !showAllScales && registeredScales.length > 0 && filteredByClient.length === 0,
  );

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
        cliente: {
          ...payload.cliente,
          end_customer_id: "",
          cliente: "",
          responsavel: "",
          cnpj: "",
          endereco: "",
          cidade: "",
          estado: "",
          unidade: "",
          email: "",
          telefone: "",
        },
      });
      return;
    }
    const ec = endCustomers.find((c) => c.id === id);
    if (ec) onChange(applyEndCustomerToCliente(payload, ec));
  };

  const applyScaleRegistration = (registrationId) => {
    if (registrationId === "__manual__" || !registrationId) {
      onScaleRegistrationChange?.(null);
      return;
    }
    const reg = registeredScales.find((s) => s.id === registrationId);
    if (!reg) return;
    const snap = balanceSnapshotFromScaleRegistration(reg);
    onChange({
      ...payload,
      balanca: { ...payload.balanca, ...snap },
    });
    onScaleRegistrationChange?.(registrationId);
  };

  const registerScale = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente");
    if (!selectedEndCustomerId) return toast.error("Selecione um cliente para vincular a balança");
    if (!String(payload.balanca?.serie || "").trim()) {
      return toast.error("Informe o número de série da balança");
    }
    setSavingScale(true);
    try {
      const saved = await createScaleRegistrationFromBalance({
        tenantId,
        endCustomerId: selectedEndCustomerId,
        balanca: payload.balanca,
      });
      onRegisteredScaleCreated?.(saved);
      onScaleRegistrationChange?.(saved.id);
      toast.success("Balança cadastrada no cliente");
    } catch (e) {
      toast.error(e.message || "Falha ao cadastrar balança");
    } finally {
      setSavingScale(false);
    }
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

  const copyAmbienteInicialParaFinal = () => {
    onChange({
      ...payload,
      ambiente: {
        ...payload.ambiente,
        horario_final: payload.ambiente.horario_final || payload.ambiente.horario_inicial || "",
        temp_final: payload.ambiente.temp_final || payload.ambiente.temp_inicial || "",
        umidade_final: payload.ambiente.umidade_final || payload.ambiente.umidade_inicial || "",
        pressao_final: payload.ambiente.pressao_final || payload.ambiente.pressao_inicial || "",
      },
    });
    toast.success("Valores finais preenchidos a partir dos iniciais (pode ajustar)");
  };

  const navItems = [
    { id: "coleta-cadastro", label: "1–2 Cadastro", primary: false },
    { id: "coleta-ambiente", label: "3 Ambiente / TBH", primary: true },
    { id: "coleta-excentricidade", label: "4 Excentricidade", primary: true },
    { id: "coleta-calibracao", label: "6 Leituras", primary: true },
    { id: "coleta-controle", label: "5 Fecho", primary: false },
  ];

  return (
    <div className="space-y-5">
      <FieldNav items={navItems} />

      <div className="rounded-lg border bg-slate-50 px-4 py-3 text-center space-y-1">
        {formatColetaProposalLine(commercialProposalRef) && (
          <p className="text-xs text-slate-600">{formatColetaProposalLine(commercialProposalRef)}</p>
        )}
        {!isNew && formatColetaOsTitle({ collectionNumber, collectionYear }) && (
          <p className="text-sm font-semibold text-slate-800">
            {formatColetaOsTitle({ collectionNumber, collectionYear })}
          </p>
        )}
        {isNew && (
          <>
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
          </>
        )}
        <p className="text-sm font-semibold mt-2">COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA</p>
        <p className="text-xs text-slate-500">Cód. RE-7.2A  Ref. PR-7.2  Rev.03 de 14/05/2026</p>
        {headerLocked && (
          <p className="text-xs text-blue-800 mt-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-left sm:text-center">
            Fluxo de campo: confirme o cadastro abaixo e avance para <strong>Ambiente/TBH</strong>, depois <strong>leituras</strong>.
          </p>
        )}
      </div>

      <div id="coleta-cadastro" className="scroll-mt-24 space-y-3">
        {headerLocked && (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Dados da proposta (somente leitura)</p>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                {[payload.cliente?.cliente, payload.balanca?.serie && `Série ${payload.balanca.serie}`, payload.balanca?.fabricante, payload.balanca?.modelo]
                  .filter(Boolean)
                  .join(" · ") || "Cliente e balança pré-preenchidos"}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setHeaderOpen((v) => !v)}>
              {headerOpen ? "Ocultar detalhe" : "Ver detalhe"}
            </Button>
          </div>
        )}
        <div className={`space-y-4 ${headerLocked && !headerOpen ? "hidden" : ""}`}>
      <SectionCard num="1" title="Dados do Cliente">
        {endCustomers.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nenhum cliente cadastrado.{" "}
            <Link to={cadastroSectionPath("clientes")} className="text-blue-600 hover:underline">
              PR-7.1 → Clientes
            </Link>
          </p>
        ) : (
          <Field label="Cliente (cadastro)">
            <select
              value={selectedEndCustomerId}
              onChange={(e) => onSelectEndCustomer(e.target.value)}
              disabled={headerLocked}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-700"
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
            <Input value={payload.cliente.cliente || ""} disabled={headerLocked} onChange={(e) => setCliente("cliente", e.target.value)} />
          </Field>
          <Field label="Responsável">
            <Input value={payload.cliente.responsavel || ""} disabled={headerLocked} onChange={(e) => setCliente("responsavel", e.target.value)} />
          </Field>
          <Field label="CNPJ">
            <Input value={payload.cliente.cnpj || ""} disabled={headerLocked} onChange={(e) => setCliente("cnpj", e.target.value)} />
          </Field>
          <Field label="Unidade">
            <Input value={payload.cliente.unidade || ""} disabled={headerLocked} onChange={(e) => setCliente("unidade", e.target.value)} />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <Input value={payload.cliente.endereco || ""} disabled={headerLocked} onChange={(e) => setCliente("endereco", e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input value={payload.cliente.cidade || ""} disabled={headerLocked} onChange={(e) => setCliente("cidade", e.target.value)} />
          </Field>
          <Field label="Estado">
            <Input value={payload.cliente.estado || ""} disabled={headerLocked} onChange={(e) => setCliente("estado", e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={payload.cliente.email || ""} disabled={headerLocked} onChange={(e) => setCliente("email", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={payload.cliente.telefone || ""} disabled={headerLocked} onChange={(e) => setCliente("telefone", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard num="2" title="Informações da Balança">
        {onScaleRegistrationChange && (
          <Field label="Balança (cadastro)">
            <select
              value={scaleRegistrationId || "__manual__"}
              onChange={(e) => applyScaleRegistration(e.target.value)}
              disabled={headerLocked}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-700"
            >
              <option value="__manual__">— Preencher manualmente —</option>
              {scaleList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serial_number || s.tag || "Sem série"} — {s.manufacturer} {s.model}
                </option>
              ))}
            </select>
            {!registeredScales.length && (
              <p className="text-xs text-amber-700 mt-1">
                Cadastre balanças em{" "}
                <Link to={cadastroSectionPath("balancas")} className="underline">
                  PR-7.1 → Balanças
                </Link>{" "}
                para selecionar aqui.
              </p>
            )}
            {clientFilterEmpty && (
              <p className="text-xs text-amber-700 mt-1">
                Nenhuma balança vinculada a este cliente.{" "}
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => setShowAllScales(true)}
                >
                  Ver todas do ambiente
                </button>
                {" "}ou preencha manualmente e cadastre.
              </p>
            )}
            {showAllScales && selectedEndCustomerId && (
              <p className="text-xs text-slate-500 mt-1">
                A mostrar todas as balanças do ambiente.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setShowAllScales(false)}
                >
                  Filtrar pelo cliente
                </button>
              </p>
            )}
          </Field>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Fabricante", "fabricante"],
            ["Modelo", "modelo"],
            ["Nº de série", "serie"],
            ["Tag / Código Interno", "tag"],
            ["Local da Calibração", "local"],
            ["Etiqueta IPEM", "etiqueta_ipem"],
            ["Portaria Inmetro", "portaria_inmetro"],
            ["Classe do instrumento", "classe"],
            ["Ponto de trabalho", "ponto_trabalho"],
          ].map(([lbl, key]) => (
            <Field key={key} label={lbl}>
              <Input
                value={payload.balanca[key] || ""}
                disabled={headerLocked}
                onChange={(e) => setBalanca(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <div className="space-y-3">
          <ScaleIndicationRangesFields
            variant="balance"
            values={payload.balanca}
            unit={payload.balanca.unidade || "g"}
            includeVerificationDivision
            disabled={headerLocked}
            onChange={(key, value) => setBalanca(key, value)}
          />
          <Field label="Unidade" className="max-w-[12rem]">
            <select
              value={payload.balanca.unidade || ""}
              disabled={headerLocked}
              onChange={(e) => setBalanca("unidade", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm disabled:bg-slate-100"
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
          disabled={headerLocked}
          onChange={(v) => setBalanca("tipo_balanca", v)}
        />
        {payload.balanca.tipo_balanca === "outros" && (
          <Field label="Outros (especificar)">
            <Input
              value={payload.balanca.tipo_balanca_outros}
              disabled={headerLocked}
              onChange={(e) => setBalanca("tipo_balanca_outros", e.target.value)}
            />
          </Field>
        )}
        <RadioRow
          label="Tipo de plataforma"
          options={TIPO_PLATAFORMA_OPTIONS}
          value={payload.balanca.tipo_plataforma}
          disabled={headerLocked}
          onChange={(v) => setBalanca("tipo_plataforma", v)}
        />
        {onScaleRegistrationChange && !scaleRegistrationId && !headerLocked && (
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingScale}
              onClick={registerScale}
            >
              <FloppyDisk size={16} className="mr-1.5" />
              {savingScale ? "A cadastrar…" : "Cadastrar balança no cliente"}
            </Button>
            {!selectedEndCustomerId && (
              <p className="text-xs text-amber-700">Selecione o cliente para cadastrar a balança.</p>
            )}
          </div>
        )}
      </SectionCard>
        </div>
      </div>

      <SectionCard
        id="coleta-ambiente"
        num="3"
        title="Condições Ambientais Durante a Calibração"
        emphasis
        subtitle="Prioridade no campo — TBH e leituras ambientais"
        headerAction={(
          <Button type="button" size="sm" variant="outline" onClick={copyAmbienteInicialParaFinal}>
            <CopySimple size={14} className="mr-1" /> Copiar inicial → final
          </Button>
        )}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Identificação 1 (termo-baro-higrômetro)">
            <select
              value={payload.ambiente.thermo_cert_id || ""}
              onChange={(e) => setAmbiente("thermo_cert_id", e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
            <Input type="time" className="h-11" value={payload.ambiente.horario_inicial} onChange={(ev) => setAmbiente("horario_inicial", ev.target.value)} />
          </Field>
          <Field label="Horário final">
            <Input type="time" className="h-11" value={payload.ambiente.horario_final} onChange={(ev) => setAmbiente("horario_final", ev.target.value)} />
          </Field>
          <Field label="Temperatura inicial (°C)">
            <Input className={READING_INPUT} inputMode="decimal" value={payload.ambiente.temp_inicial} onChange={(ev) => setAmbiente("temp_inicial", ev.target.value)} />
          </Field>
          <Field label="Temperatura final (°C)">
            <Input className={READING_INPUT} inputMode="decimal" value={payload.ambiente.temp_final} onChange={(ev) => setAmbiente("temp_final", ev.target.value)} />
          </Field>
          <Field label="Umidade inicial (%ur)">
            <Input className={READING_INPUT} inputMode="decimal" value={payload.ambiente.umidade_inicial} onChange={(ev) => setAmbiente("umidade_inicial", ev.target.value)} />
          </Field>
          <Field label="Umidade final (%ur)">
            <Input className={READING_INPUT} inputMode="decimal" value={payload.ambiente.umidade_final} onChange={(ev) => setAmbiente("umidade_final", ev.target.value)} />
          </Field>
          <Field label="Pressão inicial (hPa)">
            <Input className={READING_INPUT} inputMode="decimal" value={payload.ambiente.pressao_inicial} onChange={(ev) => setAmbiente("pressao_inicial", ev.target.value)} />
          </Field>
          <Field label="Pressão final (hPa)">
            <Input className={READING_INPUT} inputMode="decimal" value={payload.ambiente.pressao_final} onChange={(ev) => setAmbiente("pressao_final", ev.target.value)} />
          </Field>
        </div>
        <TbhCorrectionPanel
          mode="coleta"
          ambiente={payload.ambiente}
          envCerts={envCerts}
          onAmbienteChange={(ambiente) => onChange({ ...payload, ambiente })}
        />
        <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3 space-y-3">
          <p className="text-xs font-medium text-slate-700">Condições do local</p>
          <RadioRow label="A balança foi ajustada?" options={TRI_STATE_OPTIONS} value={payload.ambiente.balanca_ajustada} onChange={(v) => setAmbiente("balanca_ajustada", v)} />
          <RadioRow label="A balança foi nivelada?" options={TRI_STATE_OPTIONS} value={payload.ambiente.balanca_nivelada} onChange={(v) => setAmbiente("balanca_nivelada", v)} />
          <RadioRow label="Existe vibração no local?" options={BINARY_OPTIONS} value={payload.ambiente.existe_vibracao} onChange={(v) => setAmbiente("existe_vibracao", v)} />
          <RadioRow label="Existe corrente de ar no local?" options={BINARY_OPTIONS} value={payload.ambiente.existe_corrente_ar} onChange={(v) => setAmbiente("existe_corrente_ar", v)} />
        </div>
        <Field label="Observações">
          <Textarea
            value={payload.ambiente.observacoes || ""}
            onChange={(e) => setAmbiente("observacoes", e.target.value)}
            rows={2}
          />
        </Field>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard
          id="coleta-excentricidade"
          num="4"
          title="Ensaio de Excentricidade"
          emphasis
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
          <div className="space-y-3">
            {payload.excentricidade.pontos.map((pt, i) => (
              <FormRowCard key={i} label={`Ponto ${i + 1}`} readOnly>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Antes do ajuste">
                    <Input inputMode="decimal" value={pt.antes} onChange={(e) => setEccPonto(i, "antes", e.target.value)} className={READING_INPUT} />
                  </Field>
                  <Field label="Depois do ajuste">
                    <Input inputMode="decimal" value={pt.depois} onChange={(e) => setEccPonto(i, "depois", e.target.value)} className={READING_INPUT} />
                  </Field>
                </div>
              </FormRowCard>
            ))}
          </div>
        </SectionCard>

        <SectionCard id="coleta-controle" num="5" title="Controle / Fecho">
          <div className="grid gap-4">
            <Field label="Data da Calibração" hint="Campo prioritário no fecho da coleta">
              <Input type="date" className="h-11" value={payload.controle.data_calibracao} onChange={(e) => setControle("data_calibracao", e.target.value)} />
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
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Selecionar colaborador…</option>
                {employees
                  .filter((e) => ["tecnico_em_balancas", "gerente_tecnico", "signatario"].includes(e.job_role))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
              </select>
            </Field>
            <Field label="Representante do Cliente">
              <Input className="h-11" value={payload.controle.representante_cliente} onChange={(e) => setControle("representante_cliente", e.target.value)} />
            </Field>
            <Field label="Conferido e Transcrito por">
              <Input className="h-11" value={payload.controle.conferido_por} onChange={(e) => setControle("conferido_por", e.target.value)} />
            </Field>
            <Field label="Número do Certificado Emitido">
              <Input className="h-11" value={payload.controle.numero_certificado} onChange={(e) => setControle("numero_certificado", e.target.value)} />
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
        id="coleta-calibracao"
        num="6"
        title="Calibração da Balança — Leituras"
        emphasis
        subtitle={headerLocked
          ? "Nominais da proposta travados — preencha só as leituras"
          : "Identifique pesos-padrão e registre as leituras"}
        headerAction={headerLocked ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowEmptyCalPoints((v) => !v)}>
            {showEmptyCalPoints ? "Só pontos com nominal" : "Mostrar todos os pontos"}
          </Button>
        ) : null}
      >
        {!calPointEntries.length ? (
          <p className="text-sm text-slate-600">
            Nenhum ponto com valor nominal.{" "}
            <button type="button" className="text-blue-700 underline" onClick={() => setShowEmptyCalPoints(true)}>
              Mostrar todos os pontos
            </button>
          </p>
        ) : useReadingCards ? (
          <div className="grid md:grid-cols-2 gap-3">
            {calPointEntries.map(({ pt, index: i }) => (
              <FormRowCard key={i} label={`Ponto P${i + 1}`} readOnly>
                <Field label="Valor nominal do Peso de Referência">
                  <MassValueField
                    value={pt.peso_nominal_valor || ""}
                    unit={pt.peso_nominal_unidade || defaultUnit}
                    defaultUnit={defaultUnit}
                    disabled={headerLocked}
                    onValueChange={(v) => setCalPontoNominal(i, v, pt.peso_nominal_unidade || defaultUnit)}
                    onUnitChange={(u) => setCalPontoNominal(i, pt.peso_nominal_valor || "", u)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Antes do ajuste">
                    <Input inputMode="decimal" value={pt.leitura_antes} onChange={(e) => setCalPontoReading(i, "leitura_antes", e.target.value)} className={READING_INPUT} />
                  </Field>
                  <Field label="Leitura 1">
                    <Input inputMode="decimal" value={pt.rep1} onChange={(e) => setCalPontoReading(i, "rep1", e.target.value)} className={READING_INPUT} />
                  </Field>
                  <Field label="Leitura 2">
                    <Input inputMode="decimal" value={pt.rep2} onChange={(e) => setCalPontoReading(i, "rep2", e.target.value)} className={READING_INPUT} />
                  </Field>
                  <Field label="Leitura 3">
                    <Input inputMode="decimal" value={pt.rep3} onChange={(e) => setCalPontoReading(i, "rep3", e.target.value)} className={READING_INPUT} />
                  </Field>
                </div>
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
        ) : (
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
              {calPointEntries.map(({ pt, index: i }) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2 font-mono align-top sticky left-0 z-[1] bg-white">P{i + 1}</td>
                  <td className="p-1 align-top min-w-[88px]">
                    <Input
                      inputMode="decimal"
                      value={pt.peso_nominal_valor || ""}
                      disabled={headerLocked}
                      onChange={(e) => setCalPontoNominal(i, e.target.value, pt.peso_nominal_unidade || defaultUnit)}
                      className="h-11 text-sm"
                    />
                  </td>
                  <td className="p-1 align-top w-16">
                    <select
                      value={pt.peso_nominal_unidade || defaultUnit}
                      disabled={headerLocked}
                      onChange={(e) => setCalPontoNominal(i, pt.peso_nominal_valor || "", e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-transparent px-1 text-xs shadow-sm disabled:bg-slate-100"
                    >
                      {UNIDADE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.leitura_antes} onChange={(e) => setCalPontoReading(i, "leitura_antes", e.target.value)} className="h-11 text-sm font-mono" /></td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.rep1} onChange={(e) => setCalPontoReading(i, "rep1", e.target.value)} className="h-11 text-sm font-mono" /></td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.rep2} onChange={(e) => setCalPontoReading(i, "rep2", e.target.value)} className="h-11 text-sm font-mono" /></td>
                  <td className="p-1 align-top"><Input inputMode="decimal" value={pt.rep3} onChange={(e) => setCalPontoReading(i, "rep3", e.target.value)} className="h-11 text-sm font-mono" /></td>
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
