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
  ArrowLeft, FloppyDisk, FilePdf, Calculator, CheckCircle, XCircle, ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";
import {
  getCertificate,
  updateCertificateHeader,
  recalculateCertificate,
  transitionCertificateStatus,
  emitCertificate,
  substituteCertificate,
  cancelCertificate,
  updateCertificateStandard,
} from "@/lib/calibrationCertificates/certificateApi";
import {
  certificateStatusLabel,
  certificateTypeLabel,
  formatCertificateNumber,
  isCertificateEditable,
  CERTIFICATE_TYPES,
  conformityLabel,
  canColetaGenerateOfficial,
} from "@/lib/calibrationCertificates/certificateSchema";
import { validateExpiredStandards, validateBeforeEmit } from "@/lib/calibrationCertificates/certificateValidation";
import { defaultValidityDate } from "@/lib/calibrationCertificates/certificateDateUtils";
import { formatCalcDisplay } from "@/lib/certificateCalculations";
import { exportCertificatePdfPreview } from "@/lib/certificateExport";
import CriticalAnalysisDialog from "@/components/calibrationCertificates/CriticalAnalysisDialog";
import CertificateCalculationsHelp from "@/components/calibrationCertificates/CertificateCalculationsHelp";
import PointCalculationMemory from "@/components/calibrationCertificates/PointCalculationMemory";
import { supabase } from "@/lib/supabaseClient";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import { jobLabel } from "@/lib/cadastroConstants";

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
  const expiredStandards = validateExpiredStandards(cert.standards, cert.calibration_date);
  const signatories = employees.filter((e) => e.job_role === "signatario");
  const executors = employees.filter((e) => ["tecnico_em_balancas", "gerente_tecnico", "signatario"].includes(e.job_role));

  const patch = (fields) => setCert((c) => ({ ...c, ...fields }));

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
      }, user.id);
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
      toast.success("Cálculos atualizados");
    } catch (e) {
      toast.error(e.message);
    }
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

      {cert.is_preview_only && (
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
              <div><Label>Cliente</Label><Input className="mt-1 h-10" value={cert.client_name} disabled /></div>
              <div><Label>Série</Label><Input className="mt-1 h-10" value={cert.scale_serial} disabled /></div>
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

        <TabsContent value="pontos" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2">Ponto</th>
                    <th className="p-2">Nominal</th>
                    <th className="p-2">Média</th>
                    <th className="p-2">Erro</th>
                    <th className="p-2">Repet.</th>
                    <th className="p-2">U expandida</th>
                    <th className="p-2">k</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Memória</th>
                  </tr>
                </thead>
                <tbody>
                  {(cert.points || []).map((p) => {
                    const hasData = p.nominal_value || p.reading1;
                    if (!hasData) return null;
                    return (
                      <tr key={p.id} className="border-t align-top">
                        <td className="p-2">P{p.point_number}</td>
                        <td className="p-2">{formatCalcDisplay(p.nominal_value, 4)}</td>
                        <td className="p-2">{formatCalcDisplay(p.average_reading, 4)}</td>
                        <td className="p-2">{formatCalcDisplay(p.indication_error, 4)}</td>
                        <td className="p-2">{formatCalcDisplay(p.repeatability, 6)}</td>
                        <td className="p-2">{formatCalcDisplay(p.expanded_uncertainty, 4)}</td>
                        <td className="p-2">{formatCalcDisplay(p.coverage_factor, 2)}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">{p.calc_status}</Badge>
                          {p.calc_error && <span className="text-xs text-red-600 block">{p.calc_error}</span>}
                        </td>
                        <td className="p-2 min-w-[88px]">
                          <PointCalculationMemory point={p} />
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
                  <div>Horário: {cert.environmental.start_time} – {cert.environmental.end_time}</div>
                  <div>Temperatura: {cert.environmental.initial_temperature} – {cert.environmental.final_temperature} °C</div>
                  <div>Umidade: {cert.environmental.initial_humidity} – {cert.environmental.final_humidity} %</div>
                  <div>Pressão: {cert.environmental.initial_pressure} – {cert.environmental.final_pressure} hPa</div>
                  <div>Balança ajustada: {cert.environmental.balance_adjusted}</div>
                  <div>Balança nivelada: {cert.environmental.balance_leveled}</div>
                  <div>Vibração: {cert.environmental.has_vibration}</div>
                  <div>Corrente de ar: {cert.environmental.has_air_flow}</div>
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
                            return (
                              <tr key={pr.pointNumber} className="border-t border-slate-100">
                                <td className="p-2">P{pr.pointNumber}</td>
                                <td className="p-2 font-mono text-xs">
                                  {pr.tolerance?.positive != null
                                    ? formatCalcDisplay(pr.tolerance.positive, 4)
                                    : "—"}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {formatCalcDisplay(pt?.indication_error, 4)}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {formatCalcDisplay(pt?.expanded_uncertainty, 4)}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CriticalAnalysisDialog
        open={criticalOpen}
        onOpenChange={setCriticalOpen}
        onConfirm={handleSendApproval}
      />
    </div>
  );
}
