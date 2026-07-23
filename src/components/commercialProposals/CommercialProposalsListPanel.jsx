import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessCommercialProposals } from "@/lib/roles";
import {
  listCommercialProposals,
  deleteCommercialProposal,
  getCommercialProposal,
} from "@/lib/commercialProposals/commercialProposalApi";
import { exportCommercialProposalPdf } from "@/lib/commercialProposals/commercialProposalsExport";
import { filterProposals, proposalYears } from "@/lib/commercialProposals/commercialProposalListUtils";
import { formatProposalNumber } from "@/lib/commercialProposals/commercialProposalSchema";
import { PROPOSAL_NEW_PATH, proposalEditorPath } from "@/lib/commercialProposals/commercialProposalRoutes";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, CaretDown, PencilSimple, Trash, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import ConfirmDeleteDialog from "@/components/documents/ConfirmDeleteDialog";

async function loadLogoDataUrl(tenant) {
  if (!tenant?.logo_storage_path) return null;
  const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(tenant.logo_storage_path, 3600);
  if (!data?.signedUrl) return null;
  const res = await fetch(data.signedUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

export default function CommercialProposalsListPanel({ tenantId, tenant }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [deleteRow, setDeleteRow] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId || !isSupabaseAuthMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listCommercialProposals(tenantId, {
        year: year && year !== "all" ? Number(year) : undefined,
      });
      setRows(data);
    } catch (e) {
      toast.error(e.message || "Falha ao carregar propostas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, year]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterProposals(rows, { query, year });
  const years = proposalYears(rows);

  const handleExport = async (row) => {
    try {
      const full = await getCommercialProposal(row.id);
      const logo = await loadLogoDataUrl(tenant);
      await exportCommercialProposalPdf(full, {
        logoDataUrl: logo,
        tenant,
        tenantId,
        userId: user?.id,
      });
      toast.success("PDF exportado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await deleteCommercialProposal(deleteRow.id);
      toast.success("Proposta excluída");
      setDeleteRow(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!canAccessCommercialProposals(user?.role)) {
    return <div className="text-slate-600 text-sm">Sem permissão para propostas comerciais.</div>;
  }
  if (!isSupabaseAuthMode) {
    return <div className="text-slate-600 text-sm">Propostas comerciais requerem modo Supabase.</div>;
  }
  if (!tenantId) {
    return <div className="text-slate-600 text-sm">Selecione um ambiente no topo.</div>;
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">Propostas Comerciais (RE-7.1A)</h2>
          <p className="text-sm text-slate-600 mt-0.5">Cadastro multi-balança, exportação PDF e geração de coletas.</p>
        </div>
        <Button asChild>
          <Link to={PROPOSAL_NEW_PATH} data-tour="tour-propostas-nova"><Plus size={18} className="mr-1" /> Nova proposta</Link>
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cliente, assunto, nº…" className="mt-1" />
          </div>
          <div className="w-32">
            <Label className="text-xs">Ano</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="all">Todos</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-slate-600 text-sm py-8 text-center">Carregando…</div>
      ) : !filtered.length ? (
        <div className="text-slate-600 text-sm py-8 text-center border border-dashed border-slate-200 rounded-lg">
          Nenhuma proposta encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium">Nº</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Assunto</th>
                <th className="text-right p-3 font-medium">Total (R$)</th>
                <th className="p-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-mono text-xs">{formatProposalNumber(row.proposal_number, row.proposal_year)}</td>
                  <td className="p-3">{formatDateBr(row.proposal_date)}</td>
                  <td className="p-3">{row.client_snapshot?.company || "—"}</td>
                  <td className="p-3 max-w-[200px] truncate">{row.subject || "—"}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {Number(row.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"><CaretDown size={14} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => nav(proposalEditorPath(row.id))}>
                          <PencilSimple size={16} className="mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport(row)}>
                          <FilePdf size={16} className="mr-2" /> Exportar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteRow(row)}>
                          <Trash size={16} className="mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteRow}
        onOpenChange={(o) => !o && setDeleteRow(null)}
        title="Excluir proposta"
        description={`Excluir proposta ${deleteRow ? formatProposalNumber(deleteRow.proposal_number, deleteRow.proposal_year) : ""}?`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
