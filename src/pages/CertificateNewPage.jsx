import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessCalibrationCertificates } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { CERTIFICATE_LIST_PATH, certificateEditorPath } from "@/lib/certificateRoutes";
import {
  listColetasForCertificate,
  createCertificateFromColeta,
  createCertificateManual,
  canColetaGenerateOfficial,
} from "@/lib/calibrationCertificates/certificateApi";
import { coletaWorkflowLabel } from "@/lib/calibrationCertificates/certificateSchema";
import { CERTIFICATE_TYPES } from "@/lib/calibrationCertificates/certificateSchema";
import CertificateManualForm from "@/components/calibrationCertificates/CertificateManualForm";

function fmtDmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export default function CertificateNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentTenantId } = useOutletContext();
  const [mode, setMode] = useState("manual");
  const [coletas, setColetas] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [certType, setCertType] = useState("rastreavel");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const data = await listColetasForCertificate(currentTenantId);
      setColetas(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => { load(); }, [load]);

  if (!canAccessCalibrationCertificates(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to={CERTIFICATE_LIST_PATH} replace />;
  }

  const handleImportFromColeta = async () => {
    if (!selectedId) return toast.error("Selecione uma coleta");
    setCreating(true);
    try {
      const { certificate, recalcWarning } = await createCertificateFromColeta(currentTenantId, selectedId, {
        certificateType: certType,
        userId: user.id,
      });
      toast.success(canColetaGenerateOfficial(coletas.find((c) => c.id === selectedId)?.workflow_status)
        ? "Certificado criado"
        : "Prévia técnica criada (coleta ainda não conferida)");
      if (recalcWarning) {
        toast.warning(`Certificado criado, mas o cálculo automático falhou: ${recalcWarning}`);
      }
      navigate(certificateEditorPath(certificate.id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleManualSubmit = async (input) => {
    setCreating(true);
    try {
      const { certificate, recalcWarning } = await createCertificateManual(currentTenantId, input, {
        userId: user.id,
      });
      toast.success("Certificado manual criado");
      if (recalcWarning) {
        toast.warning(`Certificado criado, mas o cálculo automático falhou: ${recalcWarning}`);
      }
      navigate(certificateEditorPath(certificate.id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl w-full min-w-0">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={CERTIFICATE_LIST_PATH}><ArrowLeft size={18} className="mr-1" /> Voltar</Link>
        </Button>
        <h1 className="font-display text-xl font-semibold text-slate-900">Novo Certificado de Calibração</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
        >
          Entrada manual
        </Button>
        <Button
          type="button"
          variant={mode === "coleta" ? "default" : "outline"}
          onClick={() => setMode("coleta")}
        >
          Importar de coleta
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Tipo de certificado</label>
            <Select value={certType} onValueChange={setCertType}>
              <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CERTIFICATE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "coleta" ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">Coleta RE-7.2A (opcional)</label>
                {loading ? (
                  <p className="text-sm text-slate-500 mt-2">A carregar coletas…</p>
                ) : !coletas.length ? (
                  <p className="text-sm text-slate-500 mt-2">Nenhuma coleta disponível.</p>
                ) : (
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg divide-y">
                    {coletas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left p-3 hover:bg-slate-50 transition ${selectedId === c.id ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-sm">{c.client_name}</span>
                          <Badge variant="outline" className="text-[10px]">{coletaWorkflowLabel(c.workflow_status)}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Série {c.scale_serial} · {fmtDmy(c.calibration_date)}
                          {!canColetaGenerateOfficial(c.workflow_status) && " · somente prévia"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleImportFromColeta} disabled={creating || !selectedId} className="w-full sm:w-auto">
                <Plus size={18} className="mr-1" />
                {creating ? "A importar…" : "Importar da coleta"}
              </Button>
            </>
          ) : (
            <CertificateManualForm
              tenantId={currentTenantId}
              certType={certType}
              onSubmit={handleManualSubmit}
              submitting={creating}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
