import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  getEquipmentVerification,
  updateEquipmentVerification,
} from "@/lib/equipmentVerifications/equipmentVerificationsApi";
import { downloadEquipmentVerificationPdf } from "@/lib/equipmentVerifications/downloadEquipmentVerificationPdf";
import {
  MONTH_KEYS,
  MONTH_LABELS,
  equipmentKindLabel,
  getVerificationChecklist,
  normalizeVerificationResponses,
  verificationValueOptions,
} from "@/lib/equipmentVerifications/verificationChecklist";
import { EQUIPMENT_VERIFICATION_LIST_PATH } from "@/lib/equipmentVerificationRoutes";

export default function EquipmentVerificationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [record, setRecord] = useState(null);
  const [responses, setResponses] = useState({});
  const [responsible, setResponsible] = useState({});
  const [occurrences, setOccurrences] = useState("");
  const [issuedApprovedBy, setIssuedApprovedBy] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const data = await getEquipmentVerification(id);
      setRecord(data);
      setResponses(normalizeVerificationResponses(data.equipment_kind, data.responses));
      setResponsible(data.responsible_by_month || {});
      setOccurrences(data.occurrences || "");
      setIssuedApprovedBy(data.issued_approved_by || "");
      setIssueDate(data.issue_date ? String(data.issue_date).slice(0, 10) : "");
    } catch (e) {
      toast.error(e.message);
      navigate(EQUIPMENT_VERIFICATION_LIST_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const setCell = (itemKey, month, value) => {
    setResponses((prev) => ({
      ...prev,
      [itemKey]: { ...(prev[itemKey] || {}), [month]: value },
    }));
  };

  const setRespMonth = (month, value) => {
    setResponsible((prev) => ({ ...prev, [month]: value }));
  };

  const save = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const updated = await updateEquipmentVerification(record.id, {
        responses,
        responsible_by_month: responsible,
        occurrences,
        issued_approved_by: issuedApprovedBy,
        issue_date: issueDate || null,
      });
      setRecord(updated);
      toast.success("Guardado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    if (!record) return;
    try {
      await downloadEquipmentVerificationPdf(
        {
          ...record,
          responses,
          responsible_by_month: responsible,
          occurrences,
          issued_approved_by: issuedApprovedBy,
          issue_date: issueDate || null,
        },
        {
          tenantId: currentTenantId,
          tenantName: currentTenant?.name || "",
          tenant: currentTenant,
        },
      );
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <p className="text-sm text-slate-500 p-8">Ligação Supabase e ambiente necessários.</p>;
  }
  if (loading) return <p className="text-sm text-slate-500 p-8">A carregar…</p>;
  if (!record) return <Navigate to={EQUIPMENT_VERIFICATION_LIST_PATH} replace />;

  const kind = record.equipment_kind;
  const checklist = getVerificationChecklist(kind);
  const valueOpts = verificationValueOptions(kind);

  return (
    <div className="space-y-6 max-w-[1400px] w-full min-w-0" data-testid="equipment-verification-editor">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to={EQUIPMENT_VERIFICATION_LIST_PATH}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
          >
            <ArrowLeft size={12} /> Voltar
          </Link>
          <h1 className="font-display text-xl font-semibold text-slate-900">
            {equipmentKindLabel(kind)} — {record.year}
          </h1>
          <p className="text-sm text-slate-500">RE-6.4.12B · REF. PR-6.4.12</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handlePdf}>
            <FilePdf size={16} className="mr-1" /> Exportar PDF
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Itens × meses</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-slate-50 min-w-[200px]">Item</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="p-2 text-center min-w-[72px]">{m.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checklist.map((item) => (
                <tr key={item.key} className="border-t border-slate-100">
                  <td className="p-2 sticky left-0 bg-white font-medium text-slate-800">{item.label}</td>
                  {MONTH_KEYS.map((m) => (
                    <td key={m} className="p-1">
                      <select
                        className="w-full h-8 rounded border border-slate-200 bg-white px-1 text-xs"
                        value={responses[item.key]?.[m] || ""}
                        onChange={(e) => setCell(item.key, m, e.target.value)}
                      >
                        {valueOpts.map((o) => (
                          <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50/80">
                <td className="p-2 sticky left-0 bg-slate-50 font-medium">Responsável</td>
                {MONTH_KEYS.map((m) => (
                  <td key={m} className="p-1">
                    <Input
                      className="h-8 text-xs px-1"
                      value={responsible[m] || ""}
                      onChange={(e) => setRespMonth(m, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 md:col-span-2">
          <Label>Ocorrências</Label>
          <Textarea rows={3} value={occurrences} onChange={(e) => setOccurrences(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Emitido e Aprovado por</Label>
          <Input value={issuedApprovedBy} onChange={(e) => setIssuedApprovedBy(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Data de emissão</Label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
