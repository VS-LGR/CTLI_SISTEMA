import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessQuotationRequests } from "@/lib/roles";
import { useQuotationCadastroData } from "@/hooks/useQuotationCadastroData";
import {
  createQuotationRequest,
  getQuotationRequest,
  updateQuotationRequest,
  suggestNextRequestNumber,
  transitionQuotationStatus,
  duplicateQuotationRequest,
} from "@/lib/quotationRequestsApi";
import { exportQuotationRequestPdf } from "@/lib/quotationRequestsExport";
import { PR_66_QUOTATION_PATH, quotationEditorPath } from "@/lib/quotationRequestsRoutes";
import { jobLabel } from "@/lib/cadastroConstants";
import {
  buildClientEnvironmentSnapshot,
  buildSentBySnapshot,
  buildSupplierSnapshot,
  mergeSentByIntoClientSnapshot,
} from "@/lib/quotationRequestSnapshots";
import {
  buildInitialSections,
  emptyQuotationRequestItem,
  QUOTATION_REQUEST_TYPES,
} from "@/lib/quotationRequestTypes";
import { validateQuotationRequest } from "@/lib/quotationRequestValidations";
import { DOCUMENT_MODEL_ISSUE_DATE } from "@/lib/quotationRequestDefaults";
import { formatRequestNumber } from "@/lib/quotationRequestDisplay";
import QuotationRequestStatusPanel from "@/components/quotationRequests/QuotationRequestStatusPanel";
import QuotationRequestSectionEditor from "@/components/quotationRequests/QuotationRequestSectionEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FloppyDisk, FilePdf, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(tenantId, year, num) {
  return {
    tenant_id: tenantId,
    request_number: num,
    request_year: year,
    request_date: todayIso(),
    document_code: "RE-6.6C",
    document_reference: "PR-6.6",
    document_revision: "00",
    document_model_issue_date: DOCUMENT_MODEL_ISSUE_DATE,
    client_environment_id: tenantId,
    client_environment_data_snapshot: {},
    supplier_id: "",
    supplier_data_snapshot: {},
    sent_by_id: "",
    sent_by_data_snapshot: {},
    status: "rascunho",
    notes: "",
  };
}

function employeeOptionLabel(e) {
  const role = e.job_role ? jobLabel(e.job_role) : "";
  return role ? `${e.full_name} (${role})` : e.full_name;
}

export default function QuotationRequestEditorPage() {
  const { id } = useParams();
  const isNew = id === "nova";
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const nav = useNavigate();
  const cadastro = useQuotationCadastroData(currentTenantId);

  const [form, setForm] = useState(null);
  const [sections, setSections] = useState(buildInitialSections());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");

  const loadNew = useCallback(async () => {
    const year = new Date().getFullYear();
    let num = 1;
    try {
      num = await suggestNextRequestNumber(currentTenantId, year);
    } catch { /* ignore */ }
    setForm(initialForm(currentTenantId, year, num));
    setSections(buildInitialSections());
    setItems([]);
    setLoading(false);
  }, [currentTenantId]);

  const loadExisting = useCallback(async () => {
    if (!id || id === "nova") return;
    try {
      const data = await getQuotationRequest(id);
      setForm(data);
      setSections(data.sections?.length ? data.sections : buildInitialSections());
      setItems(data.items || []);
    } catch {
      toast.error("Solicitação não encontrada");
      nav(PR_66_QUOTATION_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => {
    if (!currentTenantId) return;
    if (isNew) loadNew();
    else loadExisting();
  }, [isNew, currentTenantId, loadNew, loadExisting]);

  useEffect(() => {
    if (!form || !cadastro.tenant || !isNew) return;
    if (!form.client_environment_data_snapshot?.legal_name) {
      setForm((f) => ({
        ...f,
        client_environment_data_snapshot: buildClientEnvironmentSnapshot(cadastro.tenant),
      }));
    }
  }, [cadastro.tenant, form, isNew]);

  const patchForm = (p) => setForm((f) => ({ ...f, ...p }));

  const onSupplierChange = (supplierId) => {
    const s = cadastro.suppliers.find((x) => x.id === supplierId);
    patchForm({
      supplier_id: supplierId,
      supplier_data_snapshot: s ? buildSupplierSnapshot(s) : {},
    });
  };

  const onSentByChange = (sentById) => {
    const emp = cadastro.employees.find((x) => x.id === sentById);
    const sent = buildSentBySnapshot(emp);
    const baseClient = form.client_environment_data_snapshot?.legal_name
      ? form.client_environment_data_snapshot
      : buildClientEnvironmentSnapshot(cadastro.tenant);
    patchForm({
      sent_by_id: sentById,
      sent_by_data_snapshot: sent,
      client_environment_data_snapshot: mergeSentByIntoClientSnapshot(baseClient, sent),
    });
  };

  const toggleType = (typeId, checked) => {
    setSections((prev) => prev.map((s) => (s.type === typeId ? { ...s, is_selected: checked } : s)));
    if (checked && !items.some((it) => it.section_type === typeId)) {
      const meta = QUOTATION_REQUEST_TYPES.find((t) => t.id === typeId);
      if (meta?.isTableType) {
        setItems((prev) => [...prev, emptyQuotationRequestItem(typeId, 1)]);
      }
    }
  };

  const save = async () => {
    const err = validateQuotationRequest(form, sections, items);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const saved = await createQuotationRequest(currentTenantId, form, sections, items);
        toast.success("Solicitação criada");
        nav(quotationEditorPath(saved.id), { replace: true });
      } else {
        const saved = await updateQuotationRequest(id, { ...form, tenant_id: currentTenantId }, sections, items);
        setForm(saved);
        setSections(saved.sections);
        setItems(saved.items);
        toast.success("Salvo");
      }
    } catch (e) {
      toast.error(e.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    const err = validateQuotationRequest(form, sections, items);
    if (err && form.status !== "rascunho") {
      toast.error(err);
      return;
    }
    try {
      let logoDataUrl = null;
      if (currentTenant?.logo_storage_path) {
        const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(
          currentTenant.logo_storage_path,
          3600,
        );
        if (data?.signedUrl) {
          const res = await fetch(data.signedUrl);
          const blob = await res.blob();
          logoDataUrl = await new Promise((r) => {
            const fr = new FileReader();
            fr.onload = () => r(fr.result);
            fr.readAsDataURL(blob);
          });
        }
      }
      const payload = isNew ? { ...form, sections, items } : await getQuotationRequest(id);
      await exportQuotationRequestPdf(payload, { logoDataUrl });
    } catch (e) {
      toast.error(e.message || "Falha ao exportar PDF");
    }
  };

  const onStatusTransition = async (newStatus) => {
    if (isNew) return;
    try {
      const saved = await transitionQuotationStatus(id, newStatus, { userId: user?.id });
      setForm((f) => ({ ...f, status: saved.status }));
      toast.success("Status atualizado");
    } catch (e) {
      toast.error(e.message || "Falha ao alterar status");
    }
  };

  if (!canAccessQuotationRequests(user?.role)) {
    return <div className="p-8 text-slate-600">Sem permissão.</div>;
  }
  if (loading || !form) {
    return <div className="p-8 text-slate-500">A carregar…</div>;
  }

  const selectedSections = sections.filter((s) => s.is_selected);
  const client = form.client_environment_data_snapshot || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild>
            <Link to={PR_66_QUOTATION_PATH}><ArrowLeft size={20} /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate">
              {isNew ? "Nova solicitação" : formatRequestNumber(form.request_number, form.request_year)}
            </h1>
            <p className="text-xs text-slate-500">RE-6.6C · Emissão do modelo 30/06/2025</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportPdf}><FilePdf size={16} className="mr-1.5" /> PDF</Button>
          {!isNew && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const copy = await duplicateQuotationRequest(id);
                  nav(quotationEditorPath(copy.id));
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              <Copy size={16} className="mr-1.5" /> Duplicar
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <FloppyDisk size={16} className="mr-1.5" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <QuotationRequestStatusPanel status={form.status} isNew={isNew} onTransition={onStatusTransition} disabled={saving} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="tipos">Tipos</TabsTrigger>
          {selectedSections.map((s) => (
            <TabsTrigger key={s.type} value={s.type}>
              {QUOTATION_REQUEST_TYPES.find((t) => t.id === s.type)?.label.split(" ").slice(0, 2).join(" ")}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dados" className="space-y-4 mt-4">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Número</Label>
                <Input type="number" min={1} value={form.request_number} onChange={(e) => patchForm({ request_number: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.request_year} onChange={(e) => patchForm({ request_year: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Data da solicitação</Label>
                <Input type="date" value={form.request_date || ""} onChange={(e) => patchForm({ request_date: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-base">Solicitante (ambiente)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
              <div><span className="text-slate-500">Razão Social:</span> {client.legal_name || "—"}</div>
              <div><span className="text-slate-500">CNPJ:</span> {client.cnpj || "—"}</div>
              <div className="sm:col-span-2"><span className="text-slate-500">Endereço:</span> {client.address || "—"}</div>
              <div><span className="text-slate-500">Fone:</span> {client.phone || "—"}</div>
              <div><span className="text-slate-500">E-mail:</span> {client.email || "—"}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Fornecedor</Label>
                <select
                  className="w-full h-10 border border-slate-200 rounded-md px-3 mt-1 text-sm bg-white"
                  value={form.supplier_id || ""}
                  onChange={(e) => onSupplierChange(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {cadastro.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Enviado por</Label>
                <select
                  className="w-full h-10 border border-slate-200 rounded-md px-3 mt-1 text-sm bg-white"
                  value={form.sent_by_id || ""}
                  onChange={(e) => onSentByChange(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {cadastro.employees.map((e) => (
                    <option key={e.id} value={e.id}>{employeeOptionLabel(e)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <textarea
                  className="mt-1 w-full min-h-[72px] border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={form.notes || ""}
                  onChange={(e) => patchForm({ notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4 space-y-3">
          {sections.map((sec) => (
            <label key={sec.type} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-white cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!sec.is_selected}
                onChange={(e) => toggleType(sec.type, e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-800">
                {QUOTATION_REQUEST_TYPES.find((t) => t.id === sec.type)?.label}
              </span>
            </label>
          ))}
        </TabsContent>

        {selectedSections.map((sec) => (
          <TabsContent key={sec.type} value={sec.type} className="mt-4">
            <QuotationRequestSectionEditor
              section={sec}
              items={items}
              cadastro={cadastro}
              onSectionChange={(patch) => {
                setSections((prev) => prev.map((s) => (s.type === sec.type ? { ...s, ...patch } : s)));
              }}
              onItemsChange={setItems}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
