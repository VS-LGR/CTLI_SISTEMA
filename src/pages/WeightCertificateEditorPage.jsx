import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  canAccessCalibrationCertificates,
  canApproveCalibrationCertificate,
  canEditCalibrationCertificate,
  canEmitCalibrationCertificate,
  canSendCertificateEmail,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, FloppyDisk, ArrowsClockwise, FilePdf, CheckCircle, PaperPlaneTilt, EnvelopeSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { WEIGHT_CERTIFICATE_LIST_PATH } from "@/lib/weightCalibration/weightCertificateRoutes";
import {
  getWeightCertificate,
  updateWeightCertificateHeader,
  recalculateWeightCertificate,
  transitionWeightCertificateStatus,
  emitWeightCertificate,
  upsertWeightCertificateEnvironmental,
  buildWeightEnvironmentalFromPayload,
} from "@/lib/weightCalibration/weightCertificateApi";
import { normalizeWeightAmbiente } from "@/lib/weightCalibration/weightColetaSchema";
import WeightAmbientSection from "@/components/weightCalibration/WeightAmbientSection";
import {
  formatAirDensityDisplay,
} from "@/lib/certificateCalculations/environmentalCalculations";
import {
  isCertificateEditable,
  certificateStatusLabel,
  certificateTypeLabel,
  formatCertificateNumber,
  CERTIFICATE_TYPES,
  WEIGHT_CLASSES,
  emptyCriticalChecklist,
  CRITICAL_ANALYSIS_CHECKLIST,
  DOC_CODE,
  TEMPLATE_KEY,
} from "@/lib/weightCalibration/weightCertificateSchema";
import { downloadWeightCertificatePdf } from "@/lib/weightCalibration/weightCertificateExport";
import {
  resolveClientEmail,
  emitAndSendWeightCertificate,
  sendWeightCertificateByEmail,
} from "@/lib/weightCalibration/weightCertificateEmailApi";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { Checkbox } from "@/components/ui/checkbox";

const fieldClass = "h-9 text-sm";

function environmentalToAmbiente(env) {
  if (!env) return normalizeWeightAmbiente();
  const snap = env.snapshot || {};
  return normalizeWeightAmbiente({
    thermo_cert_id: snap.thermo_cert_id || "",
    thermo_cert_id_2: snap.thermo_cert_id_2 || "",
    horario_inicial: snap.horario_inicial || "",
    horario_final: snap.horario_final || "",
    temp_inicial: env.initial_temperature || "",
    temp_final: env.final_temperature || "",
    umidade_inicial: env.initial_humidity || "",
    umidade_final: env.final_humidity || "",
    pressao_inicial: env.initial_pressure || "",
    pressao_final: env.final_pressure || "",
    observacoes: env.notes || "",
    tbh_correction_raw: snap.tbh_correction_raw || {},
    tbh_correction_meta: snap.tbh_correction_meta || null,
    tbh_correction_applied: !!snap.tbh_correction_applied,
  });
}

function fmtNum(v, digits = 4) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const d = Math.max(0, Math.floor(Number(digits)) || 0);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function itemDecimalPlaces(it) {
  const d = Number(it?.decimal_places);
  return Number.isFinite(d) && d >= 0 ? Math.floor(d) : 2;
}

export default function WeightCertificateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [endCustomers, setEndCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [checklist, setChecklist] = useState(() => emptyCriticalChecklist());
  const [criticalOpen, setCriticalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  const canEdit = canEditCalibrationCertificate(user?.role);
  const canApprove = canApproveCalibrationCertificate(user?.role);
  const canEmit = canEmitCalibrationCertificate(user?.role);
  const canSend = canSendCertificateEmail(user?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getWeightCertificate(id);
      if (data.tenant_id !== currentTenantId && user?.role !== "admin") {
        toast.error("Sem permissão");
        navigate(WEIGHT_CERTIFICATE_LIST_PATH);
        return;
      }
      setCert(data);
    } catch (e) {
      toast.error(e.message);
      navigate(WEIGHT_CERTIFICATE_LIST_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, currentTenantId, user?.role, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    loadTenantLogoDataUrl(currentTenant).then((dataUrl) => {
      if (!cancelled) setLogoDataUrl(dataUrl);
    });
    return () => { cancelled = true; };
  }, [currentTenant]);

  useEffect(() => {
    if (!currentTenantId) return;
    Promise.all([
      supabase
        .from("end_customer_registrations")
        .select("id, name, email")
        .eq("tenant_id", currentTenantId),
      supabase
        .from("employee_registrations")
        .select("id, full_name")
        .eq("tenant_id", currentTenantId)
        .order("full_name"),
      supabase
        .from("environment_sensor_certificates")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .order("equipment_name"),
    ]).then(([c, e, env]) => {
      if (!c.error) setEndCustomers(c.data || []);
      if (!e.error) setEmployees(e.data || []);
      if (!env.error) setEnvCerts(env.data || []);
    });
  }, [currentTenantId]);

  if (!canAccessCalibrationCertificates(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to={WEIGHT_CERTIFICATE_LIST_PATH} replace />;
  }
  if (loading || !cert) {
    return <p className="text-sm text-slate-500 py-12 text-center">A carregar certificado…</p>;
  }

  const editable = isCertificateEditable(cert.status) && canEdit;
  const certLabel = formatCertificateNumber(cert.certificate_number, cert.certificate_year);
  const clientEmail = resolveClientEmail(cert, endCustomers).email;

  const patchHeader = (key, value) => {
    setCert((c) => ({ ...c, [key]: value }));
  };

  const onAmbientChange = (ambiente) => {
    const built = buildWeightEnvironmentalFromPayload(ambiente);
    setCert((c) => ({
      ...c,
      environmental: {
        ...(c.environmental || {}),
        ...built,
        id: c.environmental?.id,
      },
    }));
  };

  const saveHeader = async () => {
    if (!editable) return;
    setSaving(true);
    try {
      const patch = {
        client_name: cert.client_name || "",
        contractor_name: cert.contractor_name || "",
        weight_tag: cert.weight_tag || "",
        weight_serial: cert.weight_serial || "",
        weight_class: cert.weight_class || "",
        manufacturer: cert.manufacturer || "",
        process_number: cert.process_number || "",
        commercial_proposal_ref: cert.commercial_proposal_ref || "",
        calibration_date: cert.calibration_date || null,
        calibration_location: cert.calibration_location || "",
        certificate_type: cert.certificate_type,
        executor_name: cert.executor_name || "",
        executor_id: cert.executor_id || null,
        signatory_id: cert.signatory_id || null,
        signatory_name: employees.find((e) => e.id === cert.signatory_id)?.full_name || cert.signatory_name || "",
        observation_1: cert.observation_1 || "",
        observation_2: cert.observation_2 || "",
        observation_3: cert.observation_3 || "",
        was_adjusted: cert.was_adjusted || "nao",
      };
      await updateWeightCertificateHeader(cert.id, patch, user.id);
      if (cert.environmental) {
        await upsertWeightCertificateEnvironmental(cert.id, cert.environmental);
      }
      toast.success("Dados guardados");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalc = async () => {
    setBusy(true);
    try {
      if (cert.environmental) {
        await upsertWeightCertificateEnvironmental(cert.id, cert.environmental);
      }
      const updated = await recalculateWeightCertificate(cert.id);
      setCert(updated);
      const failed = (updated.items || []).filter((it) => it.calc_status === "erro");
      if (failed.length) {
        toast.warning(failed[0].calc_error || `${failed.length} item(ns) com erro no cálculo`);
      } else {
        toast.success("Cálculos atualizados");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async () => {
    try {
      await downloadWeightCertificatePdf(cert, currentTenant?.name || "", {
        logoDataUrl,
        tenant: currentTenant,
      });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSendApproval = async () => {
    setBusy(true);
    try {
      const updated = await transitionWeightCertificateStatus(cert.id, "aguardando_aprovacao", {
        userId: user.id,
        checklist,
      });
      setCert(updated);
      setCriticalOpen(false);
      toast.success("Enviado para aprovação");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return toast.error("Sem permissão para aprovar");
    if (!cert.signatory_id) return toast.error("Defina o signatário");
    setBusy(true);
    try {
      const updated = await transitionWeightCertificateStatus(cert.id, "aprovado", {
        userId: user.id,
        employeeId: cert.signatory_id,
        notes: approvalNotes,
      });
      setCert(updated);
      toast.success("Certificado aprovado");
      if (canSend) {
        setEmailTo(resolveClientEmail(updated, endCustomers).email || "");
        setEmailDialogOpen(true);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReprove = async () => {
    setBusy(true);
    try {
      const updated = await transitionWeightCertificateStatus(cert.id, "reprovado", {
        userId: user.id,
        notes: approvalNotes,
      });
      setCert(updated);
      toast.success("Certificado reprovado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const prepareDocMeta = async () => {
    const { prepareMasterDocumentExport } = await import(
      "@/lib/masterDocuments/masterDocumentExportHelper"
    );
    return prepareMasterDocumentExport({
      tenantId: currentTenantId,
      templateKey: TEMPLATE_KEY,
      code: DOC_CODE,
      record: cert,
      defaultTitle:
        cert.certificate_type === "rbc"
          ? "CERTIFICADO DE CALIBRAÇÃO DE PESOS RBC"
          : "CERTIFICADO DE CALIBRAÇÃO DE PESOS RASTREÁVEL",
      fileNameContext: {
        numero: `${cert.certificate_number}-${cert.certificate_year}`,
        cliente: cert.client_name,
        numeroSerie: cert.weight_tag || cert.weight_serial,
      },
    });
  };

  const handleEmit = async () => {
    if (!canEmit) return toast.error("Sem permissão para emitir");
    setBusy(true);
    try {
      const { meta, fileName } = await prepareDocMeta();
      const emitted = await emitWeightCertificate(cert.id, user.id, {
        documentMeta: meta,
        fileName,
      });
      setCert(emitted);
      await downloadWeightCertificatePdf(emitted, currentTenant?.name || "", {
        logoDataUrl,
        tenant: currentTenant,
        skipRecordExport: true,
      });
      toast.success("Certificado emitido");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEmitAndSend = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      const { meta, fileName } = await prepareDocMeta();
      const updated = await emitAndSendWeightCertificate(cert, {
        userId: user.id,
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        endCustomers,
        recipientEmail: emailTo || undefined,
        documentMeta: meta,
        fileName,
      });
      setCert(updated);
      setEmailDialogOpen(false);
      toast.success(`Emitido e enviado para ${emailTo || clientEmail}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSendEmailOnly = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      await sendWeightCertificateByEmail(cert, {
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        endCustomers,
        recipientEmail: emailTo || undefined,
      });
      setEmailDialogOpen(false);
      toast.success(`Enviado para ${emailTo || clientEmail}`);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl w-full min-w-0 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to={WEIGHT_CERTIFICATE_LIST_PATH}>
              <ArrowLeft size={18} className="mr-1" /> Voltar
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">RE-5.4.2B</p>
            <h1 className="font-display text-xl font-semibold text-slate-900 truncate">
              Certificado {certLabel}
            </h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline">{certificateStatusLabel(cert.status)}</Badge>
              <Badge variant="outline">{certificateTypeLabel(cert.certificate_type)}</Badge>
              {cert.is_preview_only && (
                <Badge className="bg-amber-100 text-amber-800">Prévia técnica (marca d&apos;água)</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button type="button" variant="outline" onClick={saveHeader} disabled={saving}>
              <FloppyDisk size={16} className="mr-1" />
              {saving ? "…" : "Guardar"}
            </Button>
          )}
          {editable && (
            <Button type="button" variant="outline" onClick={handleRecalc} disabled={busy}>
              <ArrowsClockwise size={16} className="mr-1" /> Recalcular
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handlePdf}>
            <FilePdf size={16} className="mr-1" /> PDF
          </Button>
        </div>
      </div>

      {cert.is_preview_only && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Este certificado é uma prévia técnica. Confira a coleta (status conferida) antes de enviar
          para aprovação ou emitir oficialmente. O PDF inclui marca d&apos;água.
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h2 className="font-medium text-slate-900">Cabeçalho</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-[11px]">Cliente</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.client_name || ""}
                onChange={(e) => patchHeader("client_name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Tipo</Label>
              <Select
                value={cert.certificate_type || "rastreavel"}
                disabled={!editable}
                onValueChange={(v) => patchHeader("certificate_type", v)}
              >
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Identificação / tag</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.weight_tag || ""}
                onChange={(e) => patchHeader("weight_tag", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Série</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.weight_serial || ""}
                onChange={(e) => patchHeader("weight_serial", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Classe</Label>
              <Select
                value={cert.weight_class || "__"}
                disabled={!editable}
                onValueChange={(v) => patchHeader("weight_class", v === "__" ? "" : v)}
              >
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {WEIGHT_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Data calibração</Label>
              <Input
                type="date"
                className={fieldClass}
                disabled={!editable}
                value={cert.calibration_date || ""}
                onChange={(e) => patchHeader("calibration_date", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Processo</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.process_number || ""}
                onChange={(e) => patchHeader("process_number", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Fabricante</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.manufacturer || ""}
                onChange={(e) => patchHeader("manufacturer", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Local</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.calibration_location || ""}
                onChange={(e) => patchHeader("calibration_location", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Executor</Label>
              <Input
                className={fieldClass}
                disabled={!editable}
                value={cert.executor_name || ""}
                onChange={(e) => patchHeader("executor_name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Signatário</Label>
              <Select
                value={cert.signatory_id || "__"}
                disabled={!editable && cert.status !== "aguardando_aprovacao"}
                onValueChange={(v) => {
                  const emp = employees.find((e) => e.id === v);
                  setCert((c) => ({
                    ...c,
                    signatory_id: v === "__" ? null : v,
                    signatory_name: emp?.full_name || "",
                  }));
                }}
              >
                <SelectTrigger className={fieldClass}><SelectValue placeholder="Signatário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <h2 className="font-medium text-slate-900">
            Itens ({(cert.items || []).length})
          </h2>
          {!cert.items?.length ? (
            <p className="text-sm text-slate-500">Sem itens.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Identificação</th>
                    <th className="text-left p-2 font-medium">Nominal</th>
                    <th className="text-left p-2 font-medium">VVC</th>
                    <th className="text-left p-2 font-medium">U</th>
                    <th className="text-left p-2 font-medium">k</th>
                    <th className="text-left p-2 font-medium">Aprovado</th>
                    <th className="text-left p-2 font-medium">Calc.</th>
                  </tr>
                </thead>
                <tbody>
                  {cert.items.map((it) => {
                    const decimals = itemDecimalPlaces(it);
                    return (
                    <tr key={it.id || it.item_number} className="border-b last:border-0">
                      <td className="p-2 text-xs text-slate-500">{it.item_number}</td>
                      <td className="p-2">{it.identification || "—"}</td>
                      <td className="p-2 font-mono text-xs">
                        {fmtNum(it.nominal_value, decimals)} {it.nominal_unit || "g"}
                      </td>
                      <td className="p-2 font-mono text-xs">{fmtNum(it.conventional_value, decimals)}</td>
                      <td className="p-2 font-mono text-xs">{fmtNum(it.expanded_uncertainty, decimals)}</td>
                      <td className="p-2 font-mono text-xs">{fmtNum(it.coverage_factor, 2)}</td>
                      <td className="p-2">
                        {it.approved === true && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Sim</Badge>}
                        {it.approved === false && <Badge className="bg-red-100 text-red-800 text-[10px]">Não</Badge>}
                        {it.approved == null && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-2 text-xs max-w-[14rem]">
                        {it.calc_status === "erro" ? (
                          <span className="text-red-600" title={it.calc_error || "Erro"}>
                            {it.calc_error || "Erro"}
                          </span>
                        ) : (
                          it.calc_status || "—"
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-medium text-slate-900">Padrões</h2>
            {!cert.standards?.length ? (
              <p className="text-sm text-slate-500">Nenhum padrão registado.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {cert.standards.map((s) => (
                  <li key={s.id || `${s.identification_code}-${s.sort_order}`} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                    <span>{s.identification_code || "—"}</span>
                    <span className="text-xs text-slate-500 truncate">
                      {s.certificate_number} · {s.laboratory}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <WeightAmbientSection
            ambiente={environmentalToAmbiente(cert.environmental)}
            envCerts={envCerts}
            onAmbienteChange={onAmbientChange}
            disabled={!editable}
            fieldClass={fieldClass}
          />
          {cert.environmental?.air_density != null && (
            <p className="text-xs text-slate-500 mt-2">
              Densidade do ar persistida: {formatAirDensityDisplay(cert.environmental.air_density)} kg/m³
              {" · "}
              média T {fmtNum(cert.environmental.mean_temperature, 2)} °C /
              UR {fmtNum(cert.environmental.mean_humidity, 2)} % /
              P {fmtNum(cert.environmental.mean_pressure, 2)} hPa
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h2 className="font-medium text-slate-900">Ciclo de vida</h2>
          <div className="flex flex-wrap gap-2">
            {editable && (cert.status === "calculado" || cert.status === "reprovado" || cert.status === "em_revisao_tecnica") && (
              <Button
                type="button"
                disabled={busy || cert.is_preview_only}
                onClick={() => setCriticalOpen(true)}
              >
                <PaperPlaneTilt size={16} className="mr-1" /> Enviar p/ aprovação
              </Button>
            )}
            {cert.status === "aguardando_aprovacao" && canApprove && (
              <>
                <Button type="button" disabled={busy} onClick={handleApprove}>
                  <CheckCircle size={16} className="mr-1" /> Aprovar
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={handleReprove}>
                  Reprovar
                </Button>
                <Input
                  className={`max-w-xs ${fieldClass}`}
                  placeholder="Notas da aprovação"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </>
            )}
            {cert.status === "aprovado" && !cert.is_preview_only && canEmit && (
              <Button type="button" disabled={busy} onClick={handleEmit}>
                Emitir
              </Button>
            )}
            {["aprovado", "emitido", "enviado"].includes(cert.status) && canSend && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEmailTo(clientEmail || "");
                  setEmailDialogOpen(true);
                }}
              >
                <EnvelopeSimple size={16} className="mr-1" /> Enviar e-mail
              </Button>
            )}
          </div>

          {criticalOpen && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-medium">Análise crítica</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CRITICAL_ANALYSIS_CHECKLIST.map((item) => (
                  <label key={item.key} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(checklist[item.key])}
                      onCheckedChange={(v) => setChecklist((c) => ({ ...c, [item.key]: Boolean(v) }))}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" disabled={busy} onClick={handleSendApproval}>
                  Confirmar envio
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCriticalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {emailDialogOpen && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 max-w-md">
              <p className="text-sm font-medium">
                {cert.status === "aprovado" ? "Emitir e enviar por e-mail" : "Enviar PDF por e-mail"}
              </p>
              <div>
                <Label className="text-[11px]">Destinatário</Label>
                <Input
                  className={fieldClass}
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@cliente.com"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {cert.status === "aprovado" && canEmit ? (
                  <Button type="button" disabled={busy || !emailTo} onClick={handleEmitAndSend}>
                    Emitir + enviar
                  </Button>
                ) : (
                  <Button type="button" disabled={busy || !emailTo} onClick={handleSendEmailOnly}>
                    Enviar
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => setEmailDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
