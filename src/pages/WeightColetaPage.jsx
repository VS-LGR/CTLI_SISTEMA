import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta, canAccessCalibrationCertificates } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import { Plus, PencilSimple, Trash, MagnifyingGlass, Certificate } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  WEIGHT_COLETA_NEW_PATH,
  weightColetaEditorPath,
} from "@/lib/weightCalibration/weightColetaRoutes";
import {
  WEIGHT_CERTIFICATE_LIST_PATH,
  weightCertificateEditorPath,
} from "@/lib/weightCalibration/weightCertificateRoutes";
import { listWeightColetas, deleteWeightColeta } from "@/lib/weightCalibration/weightColetaApi";
import { createWeightCertificateFromColeta } from "@/lib/weightCalibration/weightCertificateApi";
import {
  coletaWorkflowLabel,
  canColetaGenerateOfficial,
} from "@/lib/weightCalibration/weightCertificateSchema";
import ConfirmDeleteDialog from "@/components/documents/ConfirmDeleteDialog";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";

function fmtDmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const filterFieldClass =
  "h-10 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300";

export default function WeightColetaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentTenantId } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const data = await listWeightColetas(currentTenantId, { search: query });
      setRows(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, query]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  if (!canAccessColeta(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSupabaseAuthMode) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 text-slate-600">
        <p className="font-medium text-slate-900 mb-2">Coleta de pesos requer Supabase</p>
      </div>
    );
  }

  if (!currentTenantId) {
    return (
      <div className="text-center py-16 text-slate-500">
        Selecione um ambiente (cliente) no topo para aceder às coletas de pesos.
      </div>
    );
  }

  const confirmRemove = async () => {
    if (!deleteTarget || !currentTenantId) return;
    setDeleting(true);
    try {
      await deleteWeightColeta(currentTenantId, deleteTarget.id);
      toast.success("Coleta excluída");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const generateCertificate = async (row) => {
    if (!canAccessCalibrationCertificates(user?.role)) {
      return toast.error("Sem permissão para gerar certificados");
    }
    setGeneratingId(row.id);
    try {
      const { certificate, recalcWarning, isPreviewOnly } = await createWeightCertificateFromColeta({
        tenantId: currentTenantId,
        userId: user.id,
        collectionId: row.id,
        certificateType: "rastreavel",
      });
      toast.success(
        isPreviewOnly || !canColetaGenerateOfficial(row.workflow_status)
          ? "Prévia técnica criada (coleta ainda não conferida)"
          : "Certificado gerado a partir da coleta",
      );
      if (recalcWarning) toast.warning(`Cálculo automático: ${recalcWarning}`);
      navigate(weightCertificateEditorPath(certificate.id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6 min-w-0" data-testid="weight-coleta-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">RE-5.4.2A</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Coleta de pesos-padrão
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Registros de calibração de pesos neste ambiente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canAccessCalibrationCertificates(user?.role) && (
            <Button asChild variant="outline">
              <Link to={WEIGHT_CERTIFICATE_LIST_PATH}>
                <Certificate size={18} className="mr-1" /> Certificados
              </Link>
            </Button>
          )}
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to={WEIGHT_COLETA_NEW_PATH}>
              <Plus size={18} className="mr-1" /> Nova coleta
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="relative min-w-0 max-w-xl">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, identificação, proposta…"
            className={`${filterFieldClass} pl-10`}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">A carregar…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-50">
          <p className="text-slate-600">
            {query.trim()
              ? "Nenhuma coleta corresponde à busca."
              : "Nenhuma coleta de pesos registada neste ambiente."}
          </p>
          {!query.trim() && (
            <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Link to={WEIGHT_COLETA_NEW_PATH}>Criar primeira coleta</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Identificação</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Atualizado</th>
                <th className="text-right p-3 font-medium w-[7.5rem]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="p-3 max-w-[160px]">
                    <EllipsisTooltip label={row.client_name || ""} className="block">
                      {row.client_name || "—"}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-3 font-mono text-xs">{row.weight_tag || "—"}</td>
                  <td className="p-3">{fmtDmy(row.calibration_date)}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {coletaWorkflowLabel(row.workflow_status || "rascunho")}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {row.updated_at ? new Date(row.updated_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <ListRowActionsMenu
                      disabled={generatingId === row.id}
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: PencilSimple,
                          onSelect: () => navigate(weightColetaEditorPath(row.id)),
                        },
                        canAccessCalibrationCertificates(user?.role)
                          && row.workflow_status !== "certificado_gerado"
                          && {
                            key: "generate",
                            label: "Gerar certificado",
                            icon: Certificate,
                            onSelect: () => generateCertificate(row),
                          },
                        row.certificate_id && {
                          key: "view-cert",
                          label: "Ver certificado",
                          icon: Certificate,
                          onSelect: () => navigate(weightCertificateEditorPath(row.certificate_id)),
                        },
                        {
                          key: "delete",
                          label: "Excluir",
                          icon: Trash,
                          destructive: true,
                          separatorBefore: true,
                          onSelect: () => setDeleteTarget(row),
                        },
                      ].filter(Boolean)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
        title="Excluir coleta de pesos?"
        description={
          deleteTarget
            ? `A coleta de ${deleteTarget.client_name || "cliente"} (${deleteTarget.weight_tag || "—"}) será removida permanentemente.`
            : ""
        }
        confirmLabel="Excluir coleta"
        onConfirm={confirmRemove}
        busy={deleting}
      />
    </div>
  );
}
