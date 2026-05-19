import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, PencilSimple, Trash, FilePdf, FileText, CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { COLETA_NEW_PATH, coletaEditorPath } from "@/lib/coletaRoutes";
import { formatColetaDocFullTitle } from "@/lib/coletaDocMeta";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";

function fmtDmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const ColetaPage = ({ embedded = false }) => {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const tenantName = currentTenant?.name || "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weightItems, setWeightItems] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("scale_calibration_collections")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (error) toast.error(error.message);
    else setRows(data || []);
  }, [currentTenantId]);

  const loadCerts = useCallback(async () => {
    if (!currentTenantId) return;
    const [w, e] = await Promise.all([
      supabase.from("standard_weight_items").select("*").eq("tenant_id", currentTenantId).eq("active", true).order("identification"),
      supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", currentTenantId),
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
    const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(path, 3600);
    setLogoDataUrl(data?.signedUrl || null);
  }, [currentTenant?.logo_storage_path]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCerts(); }, [loadCerts]);
  useEffect(() => { loadLogo(); }, [loadLogo]);

  if (!canAccessColeta(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSupabaseAuthMode) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 text-slate-600">
        <p className="font-medium text-slate-900 mb-2">Coleta requer Supabase</p>
        <p className="text-sm">Configure <span className="font-mono">REACT_APP_SUPABASE_URL</span> e desative o modo mock.</p>
      </div>
    );
  }

  if (!currentTenantId) {
    return (
      <div className="text-center py-16 text-slate-500">
        Selecione um ambiente (cliente) no topo para aceder às coletas.
      </div>
    );
  }

  const remove = async (row) => {
    if (!window.confirm(`Excluir coleta de ${row.client_name || "cliente"}?`)) return;
    const { error } = await supabase.from("scale_calibration_collections").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Coleta excluída");
      load();
    }
  };

  const exportOpts = { logoDataUrl, envCerts, weightItems, tenant: currentTenant };

  const exportRow = async (row, format) => {
    try {
      const mod = await import("@/lib/coletaExport");
      if (format === "pdf") await mod.exportColetaPdf(row, tenantName, exportOpts);
      else mod.exportColetaTsv(row, exportOpts);
    } catch (e) {
      toast.error(e?.message || "Falha na exportação");
    }
  };

  return (
    <div className="space-y-6" data-testid="coleta-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {!embedded && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Calibração</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Coleta de dados
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {formatColetaDocFullTitle(currentTenant)} — por ambiente.
            </p>
          </div>
        )}
        {embedded && (
          <div>
            <p className="text-sm text-slate-600">
              Registros RE-7.2A — coletas de calibração de balança neste ambiente.
            </p>
          </div>
        )}
        <Button asChild className="bg-blue-600 hover:bg-blue-700 shrink-0">
          <Link to={COLETA_NEW_PATH}>
            <Plus size={18} className="mr-1" /> Nova coleta
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">A carregar…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-50">
          <p className="text-slate-600">Nenhuma coleta registada neste ambiente.</p>
          <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
            <Link to={COLETA_NEW_PATH}>Criar primeira coleta</Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Nº série</th>
                <th className="text-left p-3 font-medium">Data calibração</th>
                <th className="text-left p-3 font-medium">Atualizado</th>
                <th className="p-3 w-40" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="p-3">{row.client_name || "—"}</td>
                  <td className="p-3 font-mono text-xs">{row.scale_serial || "—"}</td>
                  <td className="p-3">{fmtDmy(row.calibration_date)}</td>
                  <td className="p-3 text-slate-500 text-xs">
                    {row.updated_at ? new Date(row.updated_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={coletaEditorPath(row.id)}><PencilSimple size={16} /></Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" type="button">
                            <CaretDown size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => exportRow(row, "pdf")}>
                            <FilePdf size={16} className="mr-2" /> PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportRow(row, "tsv")}>
                            <FileText size={16} className="mr-2" /> TXT (VBA)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(row)}>
                        <Trash size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ColetaPage;
