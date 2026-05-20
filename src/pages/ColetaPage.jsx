import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, PencilSimple, Trash, FilePdf, FileText, CaretDown, Scales, CheckCircle, Clock, MagnifyingGlass,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { COLETA_NEW_PATH, coletaEditorPath } from "@/lib/coletaRoutes";
import { formatColetaDocFullTitle } from "@/lib/coletaDocMeta";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import {
  filterColetaRows,
  hasActiveColetaFilters,
  coletaDownloadStatus,
  coletaKpis,
} from "@/lib/coletaListUtils";

function fmtDmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const EMPTY_FILTERS = { client: "", serial: "", date: "" };

function KpiCard({ label, value, icon: Icon, tint = "blue", testId }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <Card className="border-slate-200" data-testid={testId}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
            <div className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 mt-1.5">
              {value}
            </div>
          </div>
          <div className={`p-2 rounded-md border shrink-0 ${tones[tint]}`}>
            <Icon size={18} weight="duotone" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DownloadBadge({ row, kind }) {
  const st = coletaDownloadStatus(row, kind);
  if (st.downloaded) {
    return (
      <Badge
        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-normal"
        title={st.labelShort ? `Baixado em ${st.labelShort}` : "Baixado"}
      >
        <CheckCircle size={12} className="mr-0.5 inline" weight="fill" />
        Baixado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-slate-500 text-[10px] font-normal">
      <Clock size={12} className="mr-0.5 inline" />
      Pendente
    </Badge>
  );
}

const ColetaPage = ({ embedded = false }) => {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const tenantName = currentTenant?.name || "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
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

  const filteredRows = useMemo(() => filterColetaRows(rows, filters), [rows, filters]);
  const kpisAll = useMemo(() => coletaKpis(rows), [rows]);
  const kpisFiltered = useMemo(() => coletaKpis(filteredRows), [filteredRows]);
  const filtersActive = hasActiveColetaFilters(filters);

  const markDownloaded = useCallback(async (rowId, format) => {
    const now = new Date().toISOString();
    const patch = format === "pdf" ? { pdf_downloaded_at: now } : { tsv_downloaded_at: now };
    const { error } = await supabase
      .from("scale_calibration_collections")
      .update(patch)
      .eq("id", rowId);
    if (error) {
      toast.error("Download registado localmente, mas falhou ao guardar no servidor.");
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    );
  }, []);

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
      await markDownloaded(row.id, format);
      toast.success(format === "pdf" ? "PDF exportado" : "TXT exportado");
    } catch (e) {
      toast.error(e?.message || "Falha na exportação");
    }
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="coleta-kpis">
        <KpiCard
          label={filtersActive ? "Coletas (filtradas)" : "Total de coletas"}
          value={filtersActive ? kpisFiltered.total : kpisAll.total}
          icon={Scales}
          testId="coleta-kpi-total"
        />
        <KpiCard
          label="PDF baixados"
          value={filtersActive ? kpisFiltered.pdfDownloaded : kpisAll.pdfDownloaded}
          icon={FilePdf}
          tint="green"
          testId="coleta-kpi-pdf"
        />
        <KpiCard
          label="TXT baixados"
          value={filtersActive ? kpisFiltered.tsvDownloaded : kpisAll.tsvDownloaded}
          icon={FileText}
          tint="green"
          testId="coleta-kpi-tsv"
        />
        <KpiCard
          label="PDF pendentes"
          value={filtersActive ? kpisFiltered.pdfPending : kpisAll.pdfPending}
          icon={Clock}
          tint="amber"
          testId="coleta-kpi-pdf-pending"
        />
      </div>

      <Card className="border-slate-200" data-testid="coleta-filters">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <MagnifyingGlass size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-800">Buscar coletas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <Label htmlFor="coleta-filter-client">Cliente</Label>
              <Input
                id="coleta-filter-client"
                value={filters.client}
                onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
                placeholder="Nome do cliente"
                className="mt-1"
                data-testid="coleta-filter-client"
              />
            </div>
            <div>
              <Label htmlFor="coleta-filter-serial">Nº de série</Label>
              <Input
                id="coleta-filter-serial"
                value={filters.serial}
                onChange={(e) => setFilters((f) => ({ ...f, serial: e.target.value }))}
                placeholder="Série da balança"
                className="mt-1 font-mono text-sm"
                data-testid="coleta-filter-serial"
              />
            </div>
            <div>
              <Label htmlFor="coleta-filter-date">Data calibração</Label>
              <Input
                id="coleta-filter-date"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
                className="mt-1"
                data-testid="coleta-filter-date"
              />
            </div>
            <div className="flex gap-2 sm:pb-0.5">
              {filtersActive && (
                <Button type="button" variant="outline" onClick={clearFilters} data-testid="coleta-filter-clear">
                  Limpar
                </Button>
              )}
            </div>
          </div>
          {filtersActive && (
            <p className="text-xs text-slate-500 mt-3">
              A mostrar {kpisFiltered.total} de {kpisAll.total} coleta(s).
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">A carregar…</p>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-50">
          <p className="text-slate-600">
            {rows.length === 0
              ? "Nenhuma coleta registada neste ambiente."
              : "Nenhuma coleta corresponde aos filtros."}
          </p>
          {rows.length === 0 ? (
            <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Link to={COLETA_NEW_PATH}>Criar primeira coleta</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto" data-testid="coleta-table">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Nº série</th>
                <th className="text-left p-3 font-medium">Data calibração</th>
                <th className="text-left p-3 font-medium">PDF</th>
                <th className="text-left p-3 font-medium">TXT</th>
                <th className="text-left p-3 font-medium">Atualizado</th>
                <th className="p-3 w-40" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50" data-testid={`coleta-row-${row.id}`}>
                  <td className="p-3">{row.client_name || "—"}</td>
                  <td className="p-3 font-mono text-xs">{row.scale_serial || "—"}</td>
                  <td className="p-3">{fmtDmy(row.calibration_date)}</td>
                  <td className="p-3">
                    <DownloadBadge row={row} kind="pdf" />
                  </td>
                  <td className="p-3">
                    <DownloadBadge row={row} kind="tsv" />
                  </td>
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
