import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  buildVerificationSavePayload,
  getEquipmentVerification,
  LEGACY_ASSET_KEY,
  updateEquipmentVerification,
} from "@/lib/equipmentVerifications/equipmentVerificationsApi";
import { downloadEquipmentVerificationPdf } from "@/lib/equipmentVerifications/downloadEquipmentVerificationPdf";
import {
  equipmentKindLabel,
  emptyVerificationResponses,
  isLegacyResponses,
  MONTH_KEYS,
} from "@/lib/equipmentVerifications/verificationChecklist";
import { EQUIPMENT_VERIFICATION_LIST_PATH } from "@/lib/equipmentVerificationRoutes";
import VerificationAssetLinker, {
  initAssetResponseState,
  initAssetResponsibleState,
} from "@/components/equipmentVerifications/VerificationAssetLinker";
import VerificationAssetChecklist from "@/components/equipmentVerifications/VerificationAssetChecklist";

export default function EquipmentVerificationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [record, setRecord] = useState(null);
  const [assets, setAssets] = useState([]);
  const [responses, setResponses] = useState({});
  const [responsible, setResponsible] = useState({});
  const [occurrences, setOccurrences] = useState("");
  const [issuedApprovedBy, setIssuedApprovedBy] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id || !currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const data = await getEquipmentVerification(id, currentTenantId);
      setRecord(data);
      setAssets(data.assets || []);
      setResponses(data.responses || {});
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
  }, [id, currentTenantId, navigate]);

  useEffect(() => { load(); }, [load]);

  const linkedAssetIds = assets.map((a) => a.id);

  const handleAssetsChange = (nextAssets) => {
    setAssets(nextAssets);
    const nextIds = new Set(nextAssets.map((a) => a.id));
    setResponses((prev) => {
      const out = {};
      for (const assetId of nextIds) {
        out[assetId] = prev[assetId] || emptyVerificationResponses(record?.equipment_kind);
      }
      return out;
    });
    setResponsible((prev) => {
      const out = {};
      for (const assetId of nextIds) {
        out[assetId] = prev[assetId] || Object.fromEntries(MONTH_KEYS.map((m) => [m, ""]));
      }
      return out;
    });
  };

  const initAssetResponses = (assetId) => {
    if (!record) return;
    setResponses((prev) => initAssetResponseState(record.equipment_kind, assetId, prev));
    setResponsible((prev) => initAssetResponsibleState(assetId, prev));
  };

  const setCell = (assetId, itemKey, month, value) => {
    setResponses((prev) => ({
      ...prev,
      [assetId]: {
        ...(prev[assetId] || emptyVerificationResponses(record?.equipment_kind)),
        [itemKey]: { ...(prev[assetId]?.[itemKey] || {}), [month]: value },
      },
    }));
  };

  const setRespMonth = (assetId, month, value) => {
    setResponsible((prev) => ({
      ...prev,
      [assetId]: { ...(prev[assetId] || {}), [month]: value },
    }));
  };

  const save = async () => {
    if (!record) return;
    const kind = record.equipment_kind;
    const effectiveIds = linkedAssetIds;

    if (!effectiveIds.length && !responses[LEGACY_ASSET_KEY]) {
      return toast.error("Vincule ou adicione ao menos um equipamento");
    }

    setSaving(true);
    try {
      const payload = buildVerificationSavePayload({
        equipmentKind: kind,
        responses,
        responsibleByMonth: responsible,
        linkedAssetIds: effectiveIds,
        occurrences,
        issuedApprovedBy,
        issueDate: issueDate || null,
      });
      const updated = await updateEquipmentVerification(record.id, payload);
      const reloaded = await getEquipmentVerification(updated.id, currentTenantId);
      setRecord(reloaded);
      setAssets(reloaded.assets || []);
      setResponses(reloaded.responses || {});
      setResponsible(reloaded.responsible_by_month || {});
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
          assets,
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
  const showLegacyChecklist = !assets.length && isLegacyResponses(record.responses, kind);
  const legacyResponses = responses[LEGACY_ASSET_KEY] || responses;
  const legacyResponsible = responsible[LEGACY_ASSET_KEY] || responsible;

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

      <VerificationAssetLinker
        kind={kind}
        tenantId={currentTenantId}
        verificationId={record.id}
        assets={assets}
        onAssetsChange={handleAssetsChange}
        onInitAssetResponses={initAssetResponses}
        disabled={saving}
      />

      {assets.length > 0 ? (
        <div className="space-y-4">
          {assets.map((asset) => (
            <VerificationAssetChecklist
              key={asset.id}
              kind={kind}
              asset={asset}
              responses={responses[asset.id] || {}}
              responsible={responsible[asset.id] || {}}
              onCellChange={(itemKey, month, value) => setCell(asset.id, itemKey, month, value)}
              onResponsibleChange={(month, value) => setRespMonth(asset.id, month, value)}
            />
          ))}
        </div>
      ) : showLegacyChecklist ? (
        <VerificationAssetChecklist
          kind={kind}
          asset={{ identification: "Geral" }}
          responses={legacyResponses}
          responsible={legacyResponsible}
          onCellChange={(itemKey, month, value) => {
            setResponses((prev) => ({
              ...prev,
              [LEGACY_ASSET_KEY]: {
                ...(prev[LEGACY_ASSET_KEY] || emptyVerificationResponses(kind)),
                [itemKey]: { ...(prev[LEGACY_ASSET_KEY]?.[itemKey] || {}), [month]: value },
              },
            }));
          }}
          onResponsibleChange={(month, value) => {
            setResponsible((prev) => ({
              ...prev,
              [LEGACY_ASSET_KEY]: { ...(prev[LEGACY_ASSET_KEY] || {}), [month]: value },
            }));
          }}
        />
      ) : (
        <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 p-6 text-center">
          Vincule ou adicione equipamentos acima para preencher os checklists mensais.
        </p>
      )}

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
