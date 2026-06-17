import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta, canAccessCalibrationCertificates } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, FloppyDisk, FilePdf, FileText, CaretDown, Certificate } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  emptyColetaPayload, mergeColetaPayload, denormalizeFromPayload,
} from "@/lib/coletaSchema";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { certificateEditorPath } from "@/lib/certificateRoutes";
import { COLETA_WORKFLOW_STATUSES, CERTIFICATE_TYPES, canColetaGenerateOfficial } from "@/lib/calibrationCertificates/certificateSchema";
import { createCertificateFromColeta } from "@/lib/calibrationCertificates/certificateApi";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";

const ColetaForm = lazy(() => import("@/components/coleta/ColetaForm"));

const ColetaEditorPage = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  // Rota dedicada /coleta/nova não expõe :id — detectar pelo path
  const isNew = id === "nova" || pathname.endsWith("/coleta/nova");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const tenantName = currentTenant?.name || "";

  const [payload, setPayload] = useState(() => emptyColetaPayload());
  const [commercialProposalRef, setCommercialProposalRef] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("rascunho");
  const [certificateId, setCertificateId] = useState(null);
  const [certType, setCertType] = useState("rastreavel");
  const [generatingCert, setGeneratingCert] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [weightItems, setWeightItems] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [endCustomers, setEndCustomers] = useState([]);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  const loadEndCustomers = useCallback(async () => {
    if (!currentTenantId) return;
    const { data, error } = await supabase
      .from("end_customer_registrations")
      .select("id, name, representative_name")
      .eq("tenant_id", currentTenantId)
      .order("name");
    if (!error) setEndCustomers(data || []);
  }, [currentTenantId]);

  const loadCerts = useCallback(async () => {
    if (!currentTenantId) return;
    const [w, e] = await Promise.all([
      supabase.from("standard_weight_items").select("*").eq("tenant_id", currentTenantId).eq("active", true).order("identification"),
      supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", currentTenantId).order("equipment_name"),
    ]);
    if (!w.error) setWeightItems(w.data || []);
    if (!e.error) setEnvCerts(e.data || []);
  }, [currentTenantId]);

  const loadLogo = useCallback(async () => {
    const path = currentTenant?.logo_storage_path;
    if (!path) {
      setLogoDataUrl(null);
      return;
    }
    const { data, error } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) setLogoDataUrl(data.signedUrl);
    else setLogoDataUrl(null);
  }, [currentTenant?.logo_storage_path]);

  const load = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scale_calibration_collections")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data) {
        toast.error("Coleta não encontrada");
        navigate(COLETA_LIST_PATH);
        return;
      }
      if (data.tenant_id !== currentTenantId && user?.role !== "admin") {
        toast.error("Sem permissão para esta coleta");
        navigate(COLETA_LIST_PATH);
        return;
      }
      setPayload(mergeColetaPayload(data.payload));
      setCommercialProposalRef(data.commercial_proposal_ref || "");
      setWorkflowStatus(data.workflow_status || "rascunho");
      setCertificateId(data.certificate_id || null);
    } finally {
      setLoading(false);
    }
  }, [id, isNew, currentTenantId, user?.role, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCerts(); }, [loadCerts]);
  useEffect(() => { loadEndCustomers(); }, [loadEndCustomers]);
  useEffect(() => { loadLogo(); }, [loadLogo]);

  if (!canAccessColeta(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to={COLETA_LIST_PATH} replace />;
  }

  const buildRow = () => {
    const denorm = denormalizeFromPayload(payload, commercialProposalRef);
    return {
      tenant_id: currentTenantId,
      commercial_proposal_ref: denorm.commercial_proposal_ref,
      payload: denorm.payload,
      client_name: denorm.client_name,
      responsible_name: denorm.responsible_name,
      scale_serial: denorm.scale_serial,
      calibration_date: denorm.calibration_date || null,
      workflow_status: workflowStatus,
      updated_by: user.id,
    };
  };

  const save = async () => {
    setSaving(true);
    const row = buildRow();
    try {
      if (isNew) {
        const { error } = await supabase
          .from("scale_calibration_collections")
          .insert({ ...row, created_by: user.id });
        if (error) throw error;
        toast.success("Coleta criada");
      } else {
        const { error } = await supabase
          .from("scale_calibration_collections")
          .update(row)
          .eq("id", id);
        if (error) throw error;
        toast.success("Coleta guardada");
      }
      navigate(COLETA_LIST_PATH);
    } catch (e) {
      toast.error(e?.message || "Falha ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const exportOpts = { logoDataUrl, envCerts, weightItems, tenant: currentTenant };

  const exportCurrent = async (format) => {
    const row = {
      id,
      commercial_proposal_ref: commercialProposalRef,
      payload,
      ...denormalizeFromPayload(payload, commercialProposalRef),
    };
    try {
      const mod = await import("@/lib/coletaExport");
      if (format === "pdf") await mod.exportColetaPdf(row, tenantName, exportOpts);
      else mod.exportColetaTsv(row, exportOpts);
    } catch (e) {
      toast.error(e?.message || "Falha na exportação");
    }
  };

  const persistColeta = async () => {
    const row = buildRow();
    const { error } = await supabase
      .from("scale_calibration_collections")
      .update(row)
      .eq("id", id);
    if (error) throw error;
  };

  const generateCertificate = async () => {
    if (!canAccessCalibrationCertificates(user?.role)) {
      toast.error("Sem permissão para gerar certificados");
      return;
    }
    setGeneratingCert(true);
    try {
      await persistColeta();
      const cert = await createCertificateFromColeta(currentTenantId, id, {
        userId: user.id,
        certificateType: certType,
      });
      const msg = canColetaGenerateOfficial(workflowStatus)
        ? "Certificado gerado a partir da coleta"
        : "Prévia técnica gerada — confira a coleta antes da emissão oficial";
      toast.success(msg);
      navigate(certificateEditorPath(cert.id));
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar certificado");
    } finally {
      setGeneratingCert(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 py-12 text-center">A carregar formulário…</p>;
  }

  return (
    <div className="space-y-6 max-w-5xl w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={COLETA_LIST_PATH}><ArrowLeft size={18} className="mr-1" /> Voltar</Link>
          </Button>
          <h1 className="font-display text-xl font-semibold text-slate-900">
            {isNew ? "Nova coleta" : "Editar coleta"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && workflowStatus === "certificado_gerado" && certificateId && (
            <Button asChild variant="outline" type="button">
              <Link to={certificateEditorPath(certificateId)}>
                <Certificate size={16} className="mr-1" /> Ver certificado
              </Link>
            </Button>
          )}
          {!isNew && workflowStatus !== "certificado_gerado" && canAccessCalibrationCertificates(user?.role) && (
            <Button variant="outline" type="button" onClick={generateCertificate} disabled={generatingCert}>
              <Certificate size={16} className="mr-1" />
              {generatingCert ? "A gerar…" : "Gerar Certificado"}
            </Button>
          )}
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" type="button">
                  Exportar <CaretDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCurrent("pdf")}>
                  <FilePdf size={16} className="mr-2" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCurrent("tsv")}>
                  <FileText size={16} className="mr-2" /> TXT (VBA)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <FloppyDisk size={18} className="mr-1" />
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </div>

      {!isNew && (
        <div className="max-w-xs">
          <Label>Status da coleta</Label>
          <Select value={workflowStatus} onValueChange={setWorkflowStatus}>
            <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLETA_WORKFLOW_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isNew && canAccessCalibrationCertificates(user?.role) && workflowStatus !== "certificado_gerado" && (
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div>
            <Label>Tipo de certificado</Label>
            <Select value={certType} onValueChange={setCertType}>
              <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CERTIFICATE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!canColetaGenerateOfficial(workflowStatus) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 self-end">
              Coleta ainda não conferida — será gerada uma prévia técnica (marca d&apos;água).
            </div>
          )}
        </div>
      )}

      <Suspense fallback={<p className="text-sm text-slate-500 py-8 text-center">A carregar formulário…</p>}>
        <ColetaForm
          payload={payload}
          onChange={setPayload}
          commercialProposalRef={commercialProposalRef}
          onProposalChange={setCommercialProposalRef}
          weightItems={weightItems}
          envCerts={envCerts}
          endCustomers={endCustomers}
          isNew={isNew}
        />
      </Suspense>
    </div>
  );
};

export default ColetaEditorPage;
