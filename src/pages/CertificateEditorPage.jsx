import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessCalibrationCertificates, canApproveCalibrationCertificate, canEmitCalibrationCertificate } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, FloppyDisk, FilePdf, Calculator, CheckCircle, XCircle, ArrowsClockwise, Archive, Trash,
} from "@phosphor-icons/react";
import DocumentEditorActionBar from "@/components/documents/DocumentEditorActionBar";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";
import {
  getCertificate,
  updateCertificateHeader,
  recalculateCertificate,
  transitionCertificateStatus,
  emitCertificate,
  substituteCertificate,
  cancelCertificate,
  markCertificateObsolete,
  deleteCertificate,
  updateCertificateStandard,
  updateCertificatePoint,
  updateCertificateEnvironmental,
} from "@/lib/calibrationCertificates/certificateApi";
import {
  certificateStatusLabel,
  certificateTypeLabel,
  formatCertificateNumber,
  isCertificateEditable,
  CERTIFICATE_TYPES,
  conformityLabel,
  canColetaGenerateOfficial,
  canMarkCertificateObsolete,
  canDeleteCertificate,
} from "@/lib/calibrationCertificates/certificateSchema";
import { validateExpiredStandards, validateBeforeEmit } from "@/lib/calibrationCertificates/certificateValidation";
import { enrichEnvironmentalAirDensity } from "@/lib/calibrationCertificates/certificateImportSanitize";
import {
  ensureTenCertificatePoints,
  certificatePointToPanelPoint,
  mergePanelIntoCertificatePoint,
  pointToDbPatch,
  emptyCertificatePoint,
} from "@/lib/calibrationCertificates/certificatePointUtils";
import { defaultValidityDate } from "@/lib/calibrationCertificates/certificateDateUtils";
import { formatCalcDisplay, formatAirDensityDisplay, buildCertificatePointDisplay, calculateCertificatePoints } from "@/lib/certificateCalculations";
import { parseBalanceAdjustmentPerformed } from "@/lib/certificatePdf/viewModel";
import { Checkbox } from "@/components/ui/checkbox";
import { exportCertificatePdfPreview } from "@/lib/certificateExport";
import CriticalAnalysisDialog from "@/components/calibrationCertificates/CriticalAnalysisDialog";
import CertificateCalculationsHelp from "@/components/calibrationCertificates/CertificateCalculationsHelp";
import PointCalculationMemory from "@/components/calibrationCertificates/PointCalculationMemory";
import PointRegistrationPanel from "@/components/calibrationCertificates/PointRegistrationPanel";
import CertificateObsoleteDialog from "@/components/calibrationCertificates/CertificateObsoleteDialog";
import CertificatePermanentDeleteDialog from "@/components/calibrationCertificates/CertificatePermanentDeleteDialog";
import { supabase } from "@/lib/supabaseClient";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import { jobLabel } from "@/lib/cadastroConstants";
import { balanceSnapshotFromScaleRegistration } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { createScaleRegistrationFromBalance } from "@/lib/scaleRegistrations/scaleRegistrationApi";
import TbhCorrectionPanel from "@/components/coleta/TbhCorrectionPanel";
import { buildEnvironmentalSnapshotPatch, hydrateEnvironmentalTbh } from "@/lib/tbhCorrection/tbhCorrectionCalculations";

function certificatePointDisplay(cert, point) {
  const balance = cert?.balance_snapshot || {};
  return buildCertificatePointDisplay(point, balance, balance.unidade || "g");
}

function formatPointDisplayValue(value, decimals = 4) {
  if (value == null || value === "") return "—";
  return formatCalcDisplay(value, decimals);
}

export default function CertificateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [criticalOpen, setCriticalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [substituteReason, setSubstituteReason] = useState("");
  const [validityTouched, setValidityTouched] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [obsoleteOpen, setObsoleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [weightItems, setWeightItems] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [scales, setScales] = useState([]);
  const [endCustomers, setEndCustomers] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [savingScale, setSavingScale] = useState(false);
  const [showCalcTrace, setShowCalcTrace] = useState(() => {
    try {
      return localStorage.getItem("certEditorShowCalcTrace") === "1";
    } catch {
      return false;
    }
  });
  const [previewCalcPoints, setPreviewCalcPoints] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCertificate(id);
      setCert(data);
    } catch (e) {
      toast.error(e.message);
      navigate(CERTIFICATE_LIST_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!cert?.calibration_date) {
      setValidityTouched(false);
      return;
    }
    const auto = defaultValidityDate(cert.calibration_date);
    setValidityTouched(Boolean(cert.validity_date && auto && cert.validity_date !== auto));
  }, [cert?.id, cert?.calibration_date, cert?.validity_date]);

  useEffect(() => {
    if (!currentTenantId) return;
    supabase.from("employee_registrations").select("*").eq("tenant_id", currentTenantId).order("full_name")
      .then(({ data }) => setEmployees(data || []));
    Promise.all([
      supabase.from("standard_weight_items").select("*").eq("tenant_id", currentTenantId).eq("active", true).order("identification"),
      supabase.from("weight_standard_certificates").select("*").eq("tenant_id", currentTenantId),
      supabase.from("scale_registrations").select("*").eq("tenant_id", currentTenantId).eq("active", true).order("serial_number"),
      supabase.from("end_customer_registrations").select("*").eq("tenant_id", currentTenantId).order("name"),
      supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", currentTenantId).order("equipment_name"),
    ]).then(([w, c, s, ec, env]) => {
      if (!w.error) setWeightItems(w.data || []);
      if (!c.error) setWeightCerts(c.data || []);
      if (!s.error) setScales(s.data || []);
      if (!ec.error) setEndCustomers(ec.data || []);
      if (!env.error) setEnvCerts(env.data || []);
    });
  }, [currentTenantId]);

  useEffect(() => {
    const path = currentTenant?.logo_storage_path;
    if (!path) return;
    supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setLogoDataUrl(data.signedUrl);
    });
  }, [currentTenant?.logo_storage_path]);

  if (!canAccessCalibrationCertificates(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to={CERTIFICATE_LIST_PATH} replace />;
  }

  if (loading || !cert) {
    return <p className="text-sm text-slate-500 py-12 text-center">A carregar certificado…</p>;
  }

  const editable = isCertificateEditable(cert.status);
  const isStandalone = !cert.collection_id;
  const expiredStandards = validateExpiredStandards(cert.standards, cert.calibration_date);
  const signatories = employees.filter((e) => e.job_role === "signatario");
  const executors = employees.filter((e) => ["tecnico_em_balancas", "gerente_tecnico", "signatario"].includes(e.job_role));

  const patch = (fields) => setCert((c) => ({ ...c, ...fields }));

  const registerManualScale = async () => {
    if (!cert.end_customer_id) {
      toast.error("Selecione o cliente do ambiente para vincular a balança");
      return;
    }
    const snap = cert.balance_snapshot || {};
    setSavingScale(true);
    try {
      const saved = await createScaleRegistrationFromBalance({
        tenantId: currentTenantId,
        endCustomerId: cert.end_customer_id,
        balanca: { ...snap, serie: cert.scale_serial || snap.serie || "" },
        legalMetrology: Boolean(cert.conformity?.legal_metrology_applicable),
      });
      setScales((prev) => [...prev, saved]);
      const mergedSnap = { ...snap, ...balanceSnapshotFromScaleRegistration(saved) };
      setCert((c) => ({
        ...c,
        scale_registration_id: saved.id,
        scale_serial: saved.serial_number || c.scale_serial,
        balance_snapshot: mergedSnap,
      }));
      toast.success("Balança cadastrada e vinculada ao cliente");
    } catch (e) {
      toast.error(e.message || "Falha ao cadastrar balança");
    } finally {
      setSavingScale(false);
    }
  };

  const patchPoint = (pointId, fields) => {
    setCert((c) => ({
      ...c,
      points: (c.points || []).map((p) => (p.id === pointId ? { ...p, ...fields } : p)),
    }));
  };

  const patchPointByNumber = (pointNumber, fields) => {
    setCert((c) => {
      const points = [...(c.points || [])];
      const idx = points.findIndex((p) => p.point_number === pointNumber);
      if (idx >= 0) {
        points[idx] = mergePanelIntoCertificatePoint(points[idx], fields);
      } else {
        points.push(mergePanelIntoCertificatePoint(emptyCertificatePoint(pointNumber), fields));
      }
      return { ...c, points };
    });
  };

  const panelPoints = ensureTenCertificatePoints(cert.points).map(
    (p) => certificatePointToPanelPoint(p, cert.balance_snapshot),
  );

  const saveHeader = async () => {
    setSaving(true);
    try {
      await updateCertificateHeader(cert.id, {
        certificate_type: cert.certificate_type,
        certificate_number: cert.certificate_number,
        certificate_year: cert.certificate_year,
        executor_id: cert.executor_id,
        signatory_id: cert.signatory_id,
        executor_name: cert.executor_name,
        calibration_date: cert.calibration_date,
        validity_date: cert.validity_date,
        calibration_location: cert.calibration_location,
        ...(isStandalone ? {
          client_name: cert.client_name,
          end_customer_id: cert.end_customer_id || null,
          scale_serial: cert.scale_serial,
          scale_registration_id: cert.scale_registration_id || null,
          balance_snapshot: cert.balance_snapshot,
        } : {}),
      }, user.id);

      if (isStandalone && cert.environmental?.id) {
        const enrichedEnv = enrichEnvironmentalAirDensity(cert.environmental, cert);
        await updateCertificateEnvironmental(cert.id, {
          initial_temperature: cert.environmental.initial_temperature,
          final_temperature: cert.environmental.final_temperature,
          initial_humidity: cert.environmental.initial_humidity,
          final_humidity: cert.environmental.final_humidity,
          initial_pressure: cert.environmental.initial_pressure,
          final_pressure: cert.environmental.final_pressure,
          air_density: enrichedEnv.air_density,
          balance_adjusted: cert.environmental.balance_adjusted,
          notes: cert.environmental.notes,
          thermo_hygrometer_id: cert.environmental.thermo_hygrometer_id || null,
          thermo_hygrometer_id_2: cert.environmental.thermo_hygrometer_id_2 || null,
          snapshot: buildEnvironmentalSnapshotPatch(cert.environmental),
        });
      }

      if (isStandalone) {
        await Promise.all(
          (cert.points || []).map((p) => {
            if (!p.id) return Promise.resolve();
            return updateCertificatePoint(p.id, pointToDbPatch(p));
          }),
        );
        if (cert.conformity?.id != null) {
          await supabase.from("calibration_certificate_conformity").update({
            legal_metrology_applicable: cert.conformity.legal_metrology_applicable,
          }).eq("certificate_id", cert.id);
        }
      }

      toast.success("Dados guardados");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalc = async () => {
    try {
      const updated = await recalculateCertificate(cert.id);
      setCert(updated);
      setPreviewCalcPoints(null);
      toast.success("Cálculos atualizados");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handlePreviewCalc = () => {
    try {
      const calculated = calculateCertificatePoints(
        cert.points,
        cert.balance_snapshot,
        weightItems,
        weightCerts,
        cert.environmental || {},
        { repeatabilitySnapshot: cert.repeatability_snapshot || {} },
      );
      setPreviewCalcPoints(calculated);
      toast.success("Pré-visualização de cálculo (não gravada)");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleCalcTrace = (checked) => {
    const on = Boolean(checked);
    setShowCalcTrace(on);
    try {
      localStorage.setItem("certEditorShowCalcTrace", on ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const pointForMemory = (p) => {
    if (!previewCalcPoints) return p;
    const preview = previewCalcPoints.find((x) => x.point_number === p.point_number);
    return preview || p;
  };

  const handlePreview = async () => {
    try {
      const full = await getCertificate(cert.id);
      await exportCertificatePdfPreview(full, currentTenant?.name || "", {
        logoDataUrl,
        tenant: currentTenant,
      });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSendApproval = async (checklist) => {
    try {
      const updated = await transitionCertificateStatus(cert.id, "aguardando_aprovacao", {
        userId: user.id,
        checklist,
      });
      setCert(updated);
      toast.success("Enviado para aprovação");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const canApprove = canApproveCalibrationCertificate(user?.role);
  const canEmit = canEmitCalibrationCertificate(user?.role);

  const handleReprove = async () => {
    try {
      const updated = await transitionCertificateStatus(cert.id, "reprovado", { userId: user.id });
      setCert(updated);
      toast.success("Certificado reprovado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleApprove = async () => {
    if (!cert.signatory_id) return toast.error("Defina o signatário");
    if (!canApprove) return toast.error("Sem permissão para aprovar certificados");
    try {
      const updated = await transitionCertificateStatus(cert.id, "aprovado", {
        userId: user.id,
        employeeId: cert.signatory_id,
        notes: approvalNotes,
      });
      setCert(updated);
      toast.success("Certificado aprovado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleEmit = async () => {
    if (!canEmit) return toast.error("Sem permissão para emitir certificados");
    const pre = validateBeforeEmit(cert, cert.points, cert.standards, cert.environmental);
    if (!pre.ok) return toast.error(pre.errors.join("; "));
    try {
      const { prepareMasterDocumentExport, recordMasterDocumentExport } = await import("@/lib/masterDocuments/masterDocumentExportHelper");
      const { meta, fileName } = await prepareMasterDocumentExport({
        tenantId: currentTenantId,
        templateKey: "re-72b-certificado-calibracao-pdf",
        code: "RE-7.2B",
        record: cert,
        defaultTitle: "CERTIFICADO DE CALIBRAÇÃO",
        fileNameContext: {
          numero: `${cert.certificate_number}-${cert.certificate_year}`,
          cliente: cert.client_name,
          numeroSerie: cert.scale_serial,
        },
      });
      const emitted = await emitCertificate(cert.id, { userId: user.id, documentMeta: meta, fileName });
      await recordMasterDocumentExport({
        tenantId: currentTenantId,
        meta,
        fileName,
        sourceModule: "calibration_certificate",
        sourceRecordId: emitted.id,
        generatedById: user.id,
      });
      await exportCertificatePdfPreview(emitted, currentTenant?.name || "", {
        logoDataUrl,
        tenant: currentTenant,
        skipRecordExport: true,
      });
      setCert(emitted);
      toast.success("Certificado emitido");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleStandardOverride = async (standard) => {
    if (!editable) return;
    try {
      const next = !standard.expired_override;
      await updateCertificateStandard(standard.id, {
        expired_override: next,
        expired_override_reason: next ? "Autorizado pelo responsável técnico" : "",
      });
      await load();
      toast.success(next ? "Exceção de validade registrada" : "Exceção removida");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSubstitute = async () => {
    if (!substituteReason.trim()) return toast.error("Informe o motivo");
    try {
      const newCert = await substituteCertificate(cert.id, { userId: user.id, reason: substituteReason });
      toast.success("Substituição criada");
      navigate(`/requirement/7/pr-7-2/certificados/${newCert.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return toast.error("Informe o motivo");
    try {
      const updated = await cancelCertificate(cert.id, { userId: user.id, reason: cancelReason });
      setCert(updated);
      toast.success("Certificado cancelado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const certLabel = formatCertificateNumber(cert.certificate_number, cert.certificate_year);

  const handleMarkObsolete = async (reason) => {
    setLifecycleBusy(true);
    try {
      const updated = await markCertificateObsolete(cert.id, { userId: user.id, reason });
      setCert(updated);
      setObsoleteOpen(false);
      toast.success("Certificado marcado como obsoleto");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handlePermanentDelete = async () => {
    setLifecycleBusy(true);
    try {
      await deleteCertificate(cert.id, { tenantId: currentTenantId });
      toast.success("Certificado removido permanentemente");
      navigate(CERTIFICATE_LIST_PATH);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLifecycleBusy(false);
      setDeleteOpen(false);
    }
  };

  const activePoints = (cert.points || []).filter((p) => p.nominal_value || p.reading1);

  return (
    <div className="space-y-6 max-w-5xl w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link to={CERTIFICATE_LIST_PATH}><ArrowLeft size={18} className="mr-1" /> Voltar</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-slate-900 truncate">
              Certificado {formatCertificateNumber(cert.certificate_number, cert.certificate_year)}
            </h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge>{certificateStatusLabel(cert.status)}</Badge>
              <Badge variant="outline">{certificateTypeLabel(cert.certificate_type)}</Badge>
              {cert.is_preview_only && <Badge className="bg-amber-100 text-amber-800">Prévia técnica</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button variant="outline" size="sm" onClick={saveHeader} disabled={saving}>
              <FloppyDisk size={16} className="mr-1" /> Guardar
            </Button>
          )}
          {editable && (
            <>
              <Button variant="outline" size="sm" onClick={handleRecalc}>
                <Calculator size={16} className="mr-1" /> Calcular
              </Button>
              <CertificateCalculationsHelp />
            </>
          )}
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <FilePdf size={16} className="mr-1" /> Prévia PDF
          </Button>
        </div>
      </div>

      {cert.is_preview_only && cert.collection_id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Prévia técnica — a coleta deve estar conferida ou aprovada para certificado antes da emissão oficial.
          {cert.collection_snapshot?.workflow_status && (
            <span className="block mt-1 text-xs">
              Status da coleta: {cert.collection_snapshot.workflow_status}
              {!canColetaGenerateOfficial(cert.collection_snapshot.workflow_status) && " (ainda não apta)"}
            </span>
          )}
        </div>
      )}

      {isStandalone && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Certificado manual — sem vínculo com coleta RE-7.2A. Pontos, ambiente e dados do instrumento são editáveis.
        </div>
      )}

      {expiredStandards.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Atenção: padrão(ões) vencido(s) na data da calibração: {expiredStandards.join(", ")}
        </div>
      )}

      <Tabs defaultValue="dados">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="pontos">Pontos e Cálculos</TabsTrigger>
          <TabsTrigger value="padroes">Padrões</TabsTrigger>
          <TabsTrigger value="ambiente">Ambiente</TabsTrigger>
          <TabsTrigger value="conformidade">Conformidade</TabsTrigger>
          <TabsTrigger value="aprovacao">Aprovação</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <Select value={cert.certificate_type} onValueChange={(v) => patch({ certificate_type: v })} disabled={!editable}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CERTIFICATE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número / Ano</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" value={cert.certificate_number ?? ""} disabled={!editable} onChange={(e) => patch({ certificate_number: Number(e.target.value) })} />
                  <Input type="number" value={cert.certificate_year ?? ""} disabled={!editable} onChange={(e) => patch({ certificate_year: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Cliente</Label>
                {isStandalone && editable ? (
                  <Select
                    value={cert.end_customer_id || ""}
                    onValueChange={(customerId) => {
                      const c = endCustomers.find((x) => x.id === customerId);
                      patch({
                        end_customer_id: customerId || null,
                        client_name: c?.name || cert.client_name,
                      });
                    }}
                  >
                    <SelectTrigger className="h-10 mt-1"><SelectValue placeholder={cert.client_name || "Selecionar cliente"} /></SelectTrigger>
                    <SelectContent>
                      {endCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="mt-1 h-10"
                    value={cert.client_name}
                    disabled={!editable || !isStandalone}
                    onChange={(e) => patch({ client_name: e.target.value })}
                  />
                )}
              </div>
              <div>
                <Label>Série</Label>
                <Input
                  className="mt-1 h-10"
                  value={cert.scale_serial}
                  disabled={!editable || !isStandalone}
                  onChange={(e) => patch({ scale_serial: e.target.value })}
                />
              </div>
              {isStandalone && editable && (
                <div className="sm:col-span-2">
                  <Label>Balança (cadastro)</Label>
                  <Select
                    value={cert.scale_registration_id || "__manual__"}
                    onValueChange={(scaleRegId) => {
                      if (scaleRegId === "__manual__") {
                        patch({ scale_registration_id: null });
                        return;
                      }
                      const scale = scales.find((s) => s.id === scaleRegId);
                      if (!scale) return;
                      const snap = balanceSnapshotFromScaleRegistration(scale);
                      patch({
                        scale_registration_id: scaleRegId,
                        scale_serial: scale.serial_number || cert.scale_serial,
                        balance_snapshot: { ...(cert.balance_snapshot || {}), ...snap },
                      });
                    }}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Selecionar balança cadastrada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">— Preencher manualmente —</SelectItem>
                      {(cert.end_customer_id
                        ? scales.filter((s) => s.end_customer_id === cert.end_customer_id || !s.end_customer_id)
                        : scales
                      ).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.serial_number || s.tag || "Sem série"} — {s.manufacturer} {s.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!scales.length && (
                    <p className="text-xs text-amber-700 mt-1">Cadastre balanças em Cadastros → Balanças para selecionar aqui.</p>
                  )}
                  {!cert.scale_registration_id && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={savingScale}
                        onClick={registerManualScale}
                      >
                        <FloppyDisk size={16} className="mr-1.5" />
                        {savingScale ? "A cadastrar…" : "Cadastrar balança no cliente"}
                      </Button>
                      {!cert.end_customer_id && (
                        <p className="text-xs text-amber-700 mt-1">Selecione o cliente do ambiente para cadastrar a balança.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label>Data calibração</Label>
                <Input
                  type="date"
                  className="mt-1 h-10"
                  value={cert.calibration_date || ""}
                  disabled={!editable}
                  onChange={(e) => {
                    const calibration_date = e.target.value;
                    const updates = { calibration_date };
                    if (!validityTouched) {
                      updates.validity_date = defaultValidityDate(calibration_date) || "";
                    }
                    patch(updates);
                  }}
                />
              </div>
              <div>
                <Label>Data de validade</Label>
                <Input
                  type="date"
                  className="mt-1 h-10"
                  value={cert.validity_date || ""}
                  disabled={!editable}
                  onChange={(e) => {
                    setValidityTouched(true);
                    patch({ validity_date: e.target.value });
                  }}
                />
              </div>
              <div><Label>Proposta</Label><Input className="mt-1 h-10" value={cert.commercial_proposal_ref} disabled /></div>
              <div className="sm:col-span-2">
                <Label>Local da calibração</Label>
                <Input
                  className="mt-1 h-10"
                  value={cert.calibration_location || ""}
                  disabled={!editable}
                  onChange={(e) => patch({ calibration_location: e.target.value })}
                />
              </div>
              <div>
                <Label>Executor</Label>
                <Select
                  value={cert.executor_id || ""}
                  onValueChange={(v) => {
                    const emp = employees.find((e) => e.id === v);
                    patch({ executor_id: v, executor_name: emp?.full_name || "" });
                  }}
                  disabled={!editable}
                >
                  <SelectTrigger className="h-10 mt-1"><SelectValue placeholder={cert.executor_name || "Selecionar"} /></SelectTrigger>
                  <SelectContent>
                    {executors.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} ({jobLabel(e.job_role)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Signatário</Label>
                <Select value={cert.signatory_id || ""} onValueChange={(v) => patch({ signatory_id: v })} disabled={!editable && cert.status !== "aguardando_aprovacao"}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Selecionar signatário" /></SelectTrigger>
                  <SelectContent>
                    {signatories.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pontos" className="mt-4 space-y-4">
          {isStandalone && editable && (
            <Card>
              <CardContent className="p-4">
                <PointRegistrationPanel
                  points={panelPoints}
                  balance={cert.balance_snapshot || {}}
                  weightItems={weightItems}
                  weightCerts={weightCerts}
                  disabled={!editable}
                  legalMetrologyApplicable={Boolean(cert.conformity?.legal_metrology_applicable)}
                  onLegalMetrologyChange={(v) => setCert((c) => ({
                    ...c,
                    conformity: { ...(c.conformity || {}), legal_metrology_applicable: v },
                  }))}
                  onPointChange={patchPointByNumber}
                  unit={cert.balance_snapshot?.unidade || "g"}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Antes do ajuste
                </p>
                {parseBalanceAdjustmentPerformed(cert.environmental?.balance_adjusted) === false && (
                  <p className="mt-1 text-xs italic text-slate-500">
                    Não foi realizado o ajuste do equipamento
                  </p>
                )}
              </div>
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2 text-left">Ponto</th>
                    <th className="p-2 text-left">Nominal (V.R.)</th>
                    <th className="p-2 text-left">Leitura antes</th>
                    <th className="p-2 text-left">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {(cert.points || []).map((p) => {
                    const hasData = p.nominal_value || p.reading_before_adjustment || p.reading1;
                    if (!hasData && !(isStandalone && editable)) return null;
                    const display = p.calc_status === "calculado" ? certificatePointDisplay(cert, p) : null;
                    const decimals = p.display_decimals ?? display?.decimals ?? 4;
                    const noAdjustment = parseBalanceAdjustmentPerformed(cert.environmental?.balance_adjusted) === false;
                    return (
                      <tr key={`before-${p.id}`} className="border-t align-top">
                        <td className="p-2">P{p.point_number}</td>
                        <td className="p-2">
                          {noAdjustment ? "—" : (
                            isStandalone && editable ? (
                              <Input
                                className="h-8 w-24"
                                value={p.nominal_value ?? ""}
                                onChange={(e) => patchPoint(p.id, { nominal_value: e.target.value })}
                              />
                            ) : formatPointDisplayValue(display?.reference ?? p.nominal_value, decimals)
                          )}
                        </td>
                        <td className="p-2">
                          {noAdjustment ? "—" : (
                            isStandalone && editable ? (
                              <Input
                                className="h-8 w-20"
                                value={p.reading_before_adjustment ?? ""}
                                onChange={(e) => patchPoint(p.id, { reading_before_adjustment: e.target.value })}
                              />
                            ) : formatCalcDisplay(p.reading_before_adjustment, p.display_decimals ?? 4)
                          )}
                        </td>
                        <td className="p-2">
                          {noAdjustment ? "—" : formatCalcDisplay(p.error_before_adjustment, p.display_decimals ?? 4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Após ajuste
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <Checkbox
                      checked={showCalcTrace}
                      onCheckedChange={toggleCalcTrace}
                    />
                    Mostrar rastreio de cálculo
                  </label>
                  {editable && (
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handlePreviewCalc}>
                      Pré-visualizar cálculo
                    </Button>
                  )}
                  {previewCalcPoints && (
                    <Badge variant="secondary" className="text-[10px]">Prévia local — recalcule para gravar</Badge>
                  )}
                </div>
              </div>
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2">Ponto</th>
                    {isStandalone && editable && (
                      <>
                        <th className="p-2">L1</th>
                        <th className="p-2">L2</th>
                        <th className="p-2">L3</th>
                      </>
                    )}
                    <th className="p-2">Média</th>
                    <th className="p-2">E</th>
                    <th className="p-2">U</th>
                    <th className="p-2">Repet.</th>
                    <th className="p-2">k</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Memória</th>
                  </tr>
                </thead>
                <tbody>
                  {(cert.points || []).map((p) => {
                    const hasData = p.nominal_value || p.reading1;
                    if (!hasData && !(isStandalone && editable)) return null;
                    const display = p.calc_status === "calculado" ? certificatePointDisplay(cert, p) : null;
                    const decimals = p.display_decimals ?? display?.decimals ?? 4;
                    return (
                      <tr key={`after-${p.id}`} className="border-t align-top">
                        <td className="p-2">P{p.point_number}</td>
                        {isStandalone && editable && (
                          <>
                            <td className="p-2">
                              <Input className="h-8 w-20" value={p.reading1 ?? ""} onChange={(e) => patchPoint(p.id, { reading1: e.target.value })} />
                            </td>
                            <td className="p-2">
                              <Input className="h-8 w-20" value={p.reading2 ?? ""} onChange={(e) => patchPoint(p.id, { reading2: e.target.value })} />
                            </td>
                            <td className="p-2">
                              <Input className="h-8 w-20" value={p.reading3 ?? ""} onChange={(e) => patchPoint(p.id, { reading3: e.target.value })} />
                            </td>
                          </>
                        )}
                        <td className="p-2">{formatPointDisplayValue(display?.average ?? p.average_reading, decimals)}</td>
                        <td className="p-2">{formatPointDisplayValue(display?.indicationError ?? p.indication_error, decimals)}</td>
                        <td className="p-2">{formatPointDisplayValue(display?.expandedUncertainty ?? p.expanded_uncertainty, decimals)}</td>
                        <td className="p-2">{formatCalcDisplay(p.repeatability, 6)}</td>
                        <td className="p-2">{formatCalcDisplay(p.coverage_factor, 2)}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">{p.calc_status}</Badge>
                          {p.calc_error && <span className="text-xs text-red-600 block">{p.calc_error}</span>}
                        </td>
                        <td className="p-2 min-w-[88px]">
                          <PointCalculationMemory point={pointForMemory(p)} showTrace={showCalcTrace} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!activePoints.length && <p className="p-6 text-sm text-slate-500">Nenhum ponto preenchido.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="padroes" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Certificado</th>
                    <th className="p-2">Validade</th>
                    <th className="p-2">Laboratório</th>
                    {editable && <th className="p-2">Vencido</th>}
                  </tr>
                </thead>
                <tbody>
                  {(cert.standards || []).map((s) => {
                    const expired = s.valid_until && cert.calibration_date && s.valid_until < cert.calibration_date;
                    return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">{s.standard_type}</td>
                      <td className="p-2">{s.identification_code}</td>
                      <td className="p-2">{s.certificate_number}</td>
                      <td className="p-2">{s.valid_until || "—"}</td>
                      <td className="p-2">{s.laboratory}</td>
                      {editable && (
                        <td className="p-2">
                          {expired ? (
                            <Button
                              type="button"
                              variant={s.expired_override ? "secondary" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => toggleStandardOverride(s)}
                            >
                              {s.expired_override ? "Exceção ativa" : "Autorizar uso"}
                            </Button>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ambiente" className="mt-4">
          <Card>
            <CardContent className="p-6 grid gap-3 sm:grid-cols-2 text-sm">
              {cert.environmental && (
                <>
                  {isStandalone && editable ? (
                    <>
                      <div>
                        <Label className="text-xs">Termo-baro 1</Label>
                        <select
                          value={cert.environmental.thermo_hygrometer_id || ""}
                          onChange={(e) => patch({ environmental: { ...cert.environmental, thermo_hygrometer_id: e.target.value } })}
                          className="mt-1 w-full border rounded-md h-9 px-2 text-sm"
                        >
                          <option value="">—</option>
                          {envCerts.map((e) => (
                            <option key={e.id} value={e.id}>{e.equipment_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Termo-baro 2</Label>
                        <select
                          value={cert.environmental.thermo_hygrometer_id_2 || ""}
                          onChange={(e) => patch({ environmental: { ...cert.environmental, thermo_hygrometer_id_2: e.target.value } })}
                          className="mt-1 w-full border rounded-md h-9 px-2 text-sm"
                        >
                          <option value="">—</option>
                          {envCerts.map((e) => (
                            <option key={e.id} value={e.id}>{e.equipment_name}</option>
                          ))}
                        </select>
                      </div>
                      <div><Label className="text-xs">Temp. inicial</Label><Input className="mt-1 h-9" value={cert.environmental.initial_temperature || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, initial_temperature: e.target.value, tbh_correction_applied: false } })} /></div>
                      <div><Label className="text-xs">Temp. final</Label><Input className="mt-1 h-9" value={cert.environmental.final_temperature || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, final_temperature: e.target.value, tbh_correction_applied: false } })} /></div>
                      <div><Label className="text-xs">UR inicial</Label><Input className="mt-1 h-9" value={cert.environmental.initial_humidity || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, initial_humidity: e.target.value, tbh_correction_applied: false } })} /></div>
                      <div><Label className="text-xs">UR final</Label><Input className="mt-1 h-9" value={cert.environmental.final_humidity || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, final_humidity: e.target.value, tbh_correction_applied: false } })} /></div>
                      <div><Label className="text-xs">Pressão inicial</Label><Input className="mt-1 h-9" value={cert.environmental.initial_pressure || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, initial_pressure: e.target.value, tbh_correction_applied: false } })} /></div>
                      <div><Label className="text-xs">Pressão final</Label><Input className="mt-1 h-9" value={cert.environmental.final_pressure || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, final_pressure: e.target.value, tbh_correction_applied: false } })} /></div>
                      <div><Label className="text-xs">Massa específica do ar (calculada)</Label><Input className="mt-1 h-9 bg-slate-50" readOnly value={`${formatAirDensityDisplay(enrichEnvironmentalAirDensity(cert.environmental, cert).air_density)} kg/m³`} /></div>
                      <div><Label className="text-xs">Balança ajustada</Label><Input className="mt-1 h-9" value={cert.environmental.balance_adjusted || ""} onChange={(e) => patch({ environmental: { ...cert.environmental, balance_adjusted: e.target.value } })} /></div>
                      <div className="sm:col-span-2">
                        <TbhCorrectionPanel
                          mode="certificado"
                          environmental={hydrateEnvironmentalTbh(cert.environmental)}
                          envCerts={envCerts}
                          onEnvironmentalChange={(environmental) => patch({ environmental })}
                          onAfterApply={async (result) => {
                            const env = result.environmental;
                            patch({ environmental: env });
                            try {
                              const enrichedEnv = enrichEnvironmentalAirDensity(env, cert);
                              await updateCertificateEnvironmental(cert.id, {
                                initial_temperature: env.initial_temperature,
                                final_temperature: env.final_temperature,
                                initial_humidity: env.initial_humidity,
                                final_humidity: env.final_humidity,
                                initial_pressure: env.initial_pressure,
                                final_pressure: env.final_pressure,
                                air_density: enrichedEnv.air_density,
                                thermo_hygrometer_id: env.thermo_hygrometer_id || null,
                                thermo_hygrometer_id_2: env.thermo_hygrometer_id_2 || null,
                                snapshot: buildEnvironmentalSnapshotPatch(env),
                              });
                              const updated = await recalculateCertificate(cert.id);
                              setCert(updated);
                              setPreviewCalcPoints(null);
                            } catch (e) {
                              toast.error(e.message);
                            }
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>Horário: {cert.environmental.start_time} – {cert.environmental.end_time}</div>
                      <div>Temperatura: {cert.environmental.initial_temperature} – {cert.environmental.final_temperature} °C</div>
                      <div>Umidade: {cert.environmental.initial_humidity} – {cert.environmental.final_humidity} %</div>
                      <div>Pressão: {cert.environmental.initial_pressure} – {cert.environmental.final_pressure} hPa</div>
                      <div>Massa específica do ar: {formatAirDensityDisplay(enrichEnvironmentalAirDensity(cert.environmental, cert).air_density)} kg/m³</div>
                      <div>Balança ajustada: {cert.environmental.balance_adjusted}</div>
                      <div>Balança nivelada: {cert.environmental.balance_leveled}</div>
                      <div>Vibração: {cert.environmental.has_vibration}</div>
                      <div>Corrente de ar: {cert.environmental.has_air_flow}</div>
                    </>
                  )}
                  {cert.environmental.notes && <div className="sm:col-span-2">Obs.: {cert.environmental.notes}</div>}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conformidade" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4 text-sm">
              {cert.conformity ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      className={
                        cert.conformity.general_conformity_result === "conforme"
                          ? "bg-emerald-100 text-emerald-800"
                          : cert.conformity.general_conformity_result === "nao_conforme"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
                      }
                    >
                      Resultado geral: {conformityLabel(cert.conformity.general_conformity_result)}
                    </Badge>
                    {cert.conformity.legal_metrology_applicable && (
                      <CertificateCalculationsHelp variant="link" initialSection="conformidade" />
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div>Metrologia legal: {cert.conformity.legal_metrology_applicable ? "Sim" : "Não"}</div>
                    <div>Classe: {cert.conformity.instrument_class || "—"}</div>
                    <div>Portaria: {cert.conformity.applicable_ordinance || "—"}</div>
                    <div>Regra de decisão: {cert.conformity.decision_rule === "erro_mais_incerteza" ? "Erro + incerteza" : "Simples (só erro)"}</div>
                  </div>
                  {cert.conformity.legal_metrology_applicable && (cert.conformity.point_results || []).length > 0 ? (
                    <div className="overflow-x-auto -mx-2 px-2">
                      <table className="w-full text-xs sm:text-sm min-w-[520px]">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                          <tr>
                            <th className="p-2 text-left">Ponto</th>
                            <th className="p-2 text-left">Tolerância (+)</th>
                            <th className="p-2 text-left">E</th>
                            <th className="p-2 text-left">U</th>
                            <th className="p-2 text-left">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(cert.conformity.point_results || []).map((pr) => {
                            const pt = (cert.points || []).find((p) => p.point_number === pr.pointNumber);
                            const display = pt?.calc_status === "calculado" ? certificatePointDisplay(cert, pt) : null;
                            const decimals = pt?.display_decimals ?? display?.decimals ?? 4;
                            return (
                              <tr key={pr.pointNumber} className="border-t border-slate-100">
                                <td className="p-2">P{pr.pointNumber}</td>
                                <td className="p-2 font-mono text-xs">
                                  {pr.tolerance?.positive != null
                                    ? formatCalcDisplay(pr.tolerance.positive, 4)
                                    : "—"}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {formatPointDisplayValue(display?.indicationError ?? pt?.indication_error, decimals)}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {formatPointDisplayValue(display?.expandedUncertainty ?? pt?.expanded_uncertainty, decimals)}
                                </td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {conformityLabel(pr.result)}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : cert.conformity.legal_metrology_applicable ? (
                    <p className="text-slate-500 text-xs">
                      Execute Calcular para avaliar conformidade por ponto.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-slate-500">Conformidade não avaliada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovacao" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              {cert.status === "calculado" || cert.status === "em_revisao_tecnica" || cert.status === "reprovado" ? (
                <Button onClick={() => setCriticalOpen(true)} disabled={cert.is_preview_only}>
                  <CheckCircle size={16} className="mr-1" /> Enviar para Aprovação
                </Button>
              ) : null}
              {cert.is_preview_only && (cert.status === "calculado" || cert.status === "reprovado") && (
                <p className="text-xs text-amber-700">
                  Atualize o status da coleta para conferida/aprovada e recalcule para liberar a aprovação oficial.
                </p>
              )}
              {cert.status === "aguardando_aprovacao" && (
                <div className="space-y-3">
                  <div>
                    <Label>Notas da aprovação (opcional)</Label>
                    <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                  <Button onClick={handleApprove} disabled={!canApprove}><CheckCircle size={16} className="mr-1" /> Aprovar</Button>
                  <Button variant="outline" onClick={handleReprove}>
                    <XCircle size={16} className="mr-1" /> Reprovar
                  </Button>
                  </div>
                </div>
              )}
              {cert.status === "aprovado" && !cert.is_preview_only && (
                <Button onClick={handleEmit} disabled={!canEmit}><FilePdf size={16} className="mr-1" /> Emitir PDF oficial</Button>
              )}
              {cert.status === "emitido" && (
                <div className="space-y-3">
                  <p className="text-sm text-emerald-700">Certificado emitido em {cert.issue_date}.</p>
                  <Button variant="outline" onClick={handlePreview}>
                    <FilePdf size={16} className="mr-1" /> Baixar PDF emitido
                  </Button>
                  <div>
                    <Label>Motivo da substituição</Label>
                    <Textarea value={substituteReason} onChange={(e) => setSubstituteReason(e.target.value)} className="mt-1" />
                    <Button className="mt-2" variant="outline" onClick={handleSubstitute}>
                      <ArrowsClockwise size={16} className="mr-1" /> Substituir certificado
                    </Button>
                  </div>
                </div>
              )}
              {["rascunho", "calculado", "aprovado", "emitido", "aguardando_aprovacao"].includes(cert.status) && (
                <div>
                  <Label>Motivo do cancelamento</Label>
                  <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-1" />
                  <Button className="mt-2" variant="destructive" onClick={handleCancel}>Cancelar certificado</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              {(cert.reviews || []).length ? cert.reviews.map((r) => (
                <div key={r.id} className="border-b pb-2 text-sm">
                  <div className="font-medium">{r.review_type}</div>
                  <div className="text-slate-500 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                  {r.notes && <p className="mt-1">{r.notes}</p>}
                </div>
              )) : <p className="text-sm text-slate-500">Sem revisões registadas.</p>}
              {cert.replaces_certificate_id && (
                <p className="text-sm">Substitui certificado anterior (ID: {cert.replaces_certificate_id})</p>
              )}
              {cert.replacement_reason && <p className="text-sm">Motivo substituição: {cert.replacement_reason}</p>}
              {cert.cancellation_reason && <p className="text-sm text-red-700">Cancelado: {cert.cancellation_reason}</p>}
              {cert.obsolete_reason && <p className="text-sm text-amber-800">Obsoleto: {cert.obsolete_reason}</p>}
              <div className="pt-4 mt-4 border-t space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remoção</p>
                {canMarkCertificateObsolete(cert.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={() => setObsoleteOpen(true)}
                  >
                    <Archive size={16} className="mr-1" /> Marcar como obsoleto
                  </Button>
                )}
                {cert.status === "emitido" && (
                  <p className="text-xs text-slate-500">
                    Certificados emitidos devem ser cancelados ou substituídos antes de marcar como obsoleto.
                  </p>
                )}
                {canDeleteCertificate(cert.status) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash size={16} className="mr-1" /> Remover permanentemente
                  </Button>
                )}
                {!canMarkCertificateObsolete(cert.status) && !canDeleteCertificate(cert.status) && cert.status !== "emitido" && (
                  <p className="text-xs text-slate-500">Este certificado não pode ser removido no estado atual.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentEditorActionBar
        primary={editable ? {
          label: "Guardar",
          icon: FloppyDisk,
          onClick: saveHeader,
          loading: saving,
        } : null}
        actions={[
          ...(editable ? [
            { label: "Calcular", icon: Calculator, onClick: handleRecalc },
            { label: "Prévia PDF", icon: FilePdf, onClick: handlePreview },
          ] : [
            { label: "Prévia PDF", icon: FilePdf, onClick: handlePreview },
          ]),
        ]}
      />

      <CertificateObsoleteDialog
        open={obsoleteOpen}
        onOpenChange={setObsoleteOpen}
        certificateLabel={certLabel}
        onConfirm={handleMarkObsolete}
        busy={lifecycleBusy}
      />
      <CertificatePermanentDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        certificateLabel={certLabel}
        onConfirm={handlePermanentDelete}
        busy={lifecycleBusy}
      />

      <CriticalAnalysisDialog
        open={criticalOpen}
        onOpenChange={setCriticalOpen}
        onConfirm={handleSendApproval}
      />
    </div>
  );
}
