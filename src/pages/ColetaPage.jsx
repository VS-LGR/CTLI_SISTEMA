import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta, canManageTechnicians } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, PencilSimple, Trash, FilePdf, FileDoc, Table, CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import ColetaTechniciansPanel from "@/components/coleta/ColetaTechniciansPanel";
import { exportColetaPdf, exportColetaDocx, exportColetaXlsx } from "@/lib/coletaExport";

function fmtDmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const ColetaPage = () => {
  const { user } = useAuth();
  const { currentTenantId, currentTenant, isAdmin } = useOutletContext();
  const tenantName = currentTenant?.name || "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { load(); }, [load]);

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

  const exportRow = async (row, format) => {
    try {
      if (format === "pdf") exportColetaPdf(row, tenantName);
      else if (format === "docx") await exportColetaDocx(row, tenantName);
      else exportColetaXlsx(row, tenantName);
    } catch (e) {
      toast.error(e?.message || "Falha na exportação");
    }
  };

  return (
    <div className="space-y-6" data-testid="coleta-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Calibração</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Coleta de dados
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            RE-7.2A — formulário de calibração de balança por ambiente.
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link to="/coleta/nova">
            <Plus size={18} className="mr-1" /> Nova coleta
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="coletas">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="coletas">Coletas</TabsTrigger>
          {canManageTechnicians(user?.role) && (
            <TabsTrigger value="tecnicos">Técnicos do ambiente</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="coletas" className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500 py-8 text-center">A carregar…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-slate-50">
              <p className="text-slate-600">Nenhuma coleta registada neste ambiente.</p>
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Link to="/coleta/nova">Criar primeira coleta</Link>
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
                            <Link to={`/coleta/${row.id}`}><PencilSimple size={16} /></Link>
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
                              <DropdownMenuItem onClick={() => exportRow(row, "docx")}>
                                <FileDoc size={16} className="mr-2" /> Word
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportRow(row, "xlsx")}>
                                <Table size={16} className="mr-2" /> Excel
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
        </TabsContent>

        {canManageTechnicians(user?.role) && (
          <TabsContent value="tecnicos" className="mt-4">
            <ColetaTechniciansPanel tenantId={currentTenantId} isAdmin={isAdmin} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ColetaPage;
