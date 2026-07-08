import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePdf, Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listEquipmentVerifications,
  createEquipmentVerification,
  deleteEquipmentVerification,
  getEquipmentVerification,
} from "@/lib/equipmentVerifications/equipmentVerificationsApi";
import { downloadEquipmentVerificationPdf } from "@/lib/equipmentVerifications/downloadEquipmentVerificationPdf";
import {
  EQUIPMENT_VERIFICATION_KINDS,
  equipmentKindLabel,
} from "@/lib/equipmentVerifications/verificationChecklist";
import {
  EQUIPMENT_VERIFICATION_REQ_ID,
  EQUIPMENT_VERIFICATION_FOLDER_KEY,
  equipmentVerificationEditorPath,
} from "@/lib/equipmentVerificationRoutes";
import { fmtDmyShort } from "@/lib/dateFormat";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";

export default function EquipmentVerificationListPage() {
  const { currentTenantId, currentTenant } = useOutletContext();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newKind, setNewKind] = useState("pesos");
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const data = await listEquipmentVerifications(currentTenantId, {
        kind: kindFilter,
        year: yearFilter,
      });
      setRows(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, kindFilter, yearFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const row = await createEquipmentVerification(currentTenantId, {
        equipmentKind: newKind,
        year: newYear,
      });
      toast.success("Verificação criada");
      setCreateOpen(false);
      navigate(equipmentVerificationEditorPath(row.id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remover verificação ${equipmentKindLabel(row.equipment_kind)} ${row.year}?`)) return;
    try {
      await deleteEquipmentVerification(row.id);
      toast.success("Removida");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handlePdf = async (row) => {
    try {
      const full = await getEquipmentVerification(row.id, currentTenantId);
      await downloadEquipmentVerificationPdf(full, {
        tenantId: currentTenantId,
        tenantName: currentTenant?.name || "",
        tenant: currentTenant,
      });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <p className="text-sm text-slate-500 p-8">Ligação Supabase e ambiente necessários.</p>;
  }

  const yearOptions = [...new Set(rows.map((r) => String(r.year)))].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 max-w-5xl w-full min-w-0" data-testid="equipment-verification-list">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PR-6.4.12 · RE-6.4.12B</div>
          <h1 className="font-display text-xl font-semibold text-slate-900 mt-1">Verificação de Equipamentos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Checklists anuais por tipo. Vincule vários equipamentos em cada verificação.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-1" /> Nova verificação
        </Button>
      </div>

      <RequirementFolderQuickAccess
        requirementId={EQUIPMENT_VERIFICATION_REQ_ID}
        folderKey={EQUIPMENT_VERIFICATION_FOLDER_KEY}
      />

      <div className="flex flex-wrap gap-2">
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-[200px] h-10"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {EQUIPMENT_VERIFICATION_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Ano</th>
                <th className="p-3">Equipamentos</th>
                <th className="p-3">Emissão</th>
                <th className="p-3">Aprovado por</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma verificação registada.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{equipmentKindLabel(r.equipment_kind)}</td>
                  <td className="p-3">{r.year}</td>
                  <td className="p-3">{(r.linked_asset_ids || []).length || "—"}</td>
                  <td className="p-3">{fmtDmyShort(r.issue_date)}</td>
                  <td className="p-3">{r.issued_approved_by || "—"}</td>
                  <td className="p-3 whitespace-nowrap">
                    <Button asChild variant="ghost" size="sm" title="Editar">
                      <Link to={equipmentVerificationEditorPath(r.id)}><PencilSimple size={16} /></Link>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handlePdf(r)} title="PDF">
                      <FilePdf size={16} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(r)} title="Remover">
                      <Trash size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova verificação RE-6.4.12B</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tipo de equipamento</Label>
              <Select value={newKind} onValueChange={setNewKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_VERIFICATION_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ano</Label>
              <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleCreate} disabled={busy}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
