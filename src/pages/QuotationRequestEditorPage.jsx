import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import QuotationRequestTypeSelector from "@/components/quotationRequests/QuotationRequestTypeSelector";
import QuotationConvertDialog from "@/components/quotationRequests/QuotationConvertDialog";
import QuotationGeneratedOrdersCard from "@/components/quotationRequests/QuotationGeneratedOrdersCard";
import { getQuotationConversionState } from "@/lib/quotationToPurchaseOrder";
import { selectClass } from "@/components/quotationRequests/QuotationRequestItemsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FloppyDisk, FilePdf, Copy, Buildings, Truck, ShoppingCart } from "@phosphor-icons/react";
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

function PartyPreview({ icon: Icon, title, lines }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-700">
        <Icon size={18} className="text-blue-600 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <dl className="space-y-1.5 text-sm">
        {lines.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 min-w-0">
            <dt className="text-slate-500 shrink-0">{label}</dt>
            <dd className="text-slate-800 break-words">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState("geral");
  const [expandedTypes, setExpandedTypes] = useState({});
  const [conversions, setConversions] = useState([]);
  const [convertOpen, setConvertOpen] = useState(false);

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
      setConversions(data.conversions || []);
      const exp = {};
      (data.sections || []).filter((s) => s.is_selected).forEach((s) => { exp[s.type] = true; });
      setExpandedTypes(exp);
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
    setExpandedTypes((prev) => ({ ...prev, [typeId]: checked }));
    if (checked) {
      setActiveTab("conteudo");
      if (!items.some((it) => it.section_type === typeId)) {
        const meta = QUOTATION_REQUEST_TYPES.find((t) => t.id === typeId);
        if (meta?.isTableType) {
          setItems((prev) => [...prev, emptyQuotationRequestItem(typeId, 1)]);
        }
      }
    }
  };

  const selectedCount = useMemo(() => sections.filter((s) => s.is_selected).length, [sections]);

  const conversionState = useMemo(
    () => (form ? getQuotationConversionState({ ...form, sections }, conversions) : null),
    [form, sections, conversions],
  );

  const reloadQuotation = useCallback(async () => {
    if (!id || id === "nova") return;
    const data = await getQuotationRequest(id);
    setForm(data);
    setSections(data.sections?.length ? data.sections : buildInitialSections());
    setItems(data.items || []);
    setConversions(data.conversions || []);
  }, [id]);

  const save = async () => {
    const err = validateQuotationRequest(form, sections, items);
    if (err) {
      toast.error(err);
      if (!form.supplier_id || !form.sent_by_id) setActiveTab("geral");
      else if (selectedCount === 0) setActiveTab("conteudo");
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
  const supplier = form.supplier_data_snapshot || {};
  const sentBy = form.sent_by_data_snapshot || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 min-w-0" data-testid="quotation-request-editor">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <Link to={PR_66_QUOTATION_PATH} className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Voltar às solicitações
            </Link>
            <h1 className="font-display text-2xl font-bold text-slate-900 truncate">
              {isNew ? "Nova solicitação de orçamento" : formatRequestNumber(form.request_number, form.request_year)}
            </h1>
            <p className="text-xs text-slate-500">
              {form.document_code} · {form.document_reference} · Rev. {form.document_revision} · Emissão do modelo 30/06/2025
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FilePdf size={16} className="mr-1.5" /> PDF
            </Button>
            {!isNew && conversionState?.canConvert && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConvertOpen(true)}
              >
                <ShoppingCart size={16} className="mr-1.5" /> Converter em PO
              </Button>
            )}
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
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
            <Button size="sm" onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FloppyDisk size={16} className="mr-1.5" /> {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>

        <QuotationRequestStatusPanel
          layout="inline"
          status={form.status}
          isNew={isNew}
          onTransition={onStatusTransition}
          disabled={saving}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 bg-white border border-slate-200 p-1 rounded-lg">
          <TabsTrigger value="geral" className="flex-1 sm:flex-none">Dados gerais</TabsTrigger>
          <TabsTrigger value="conteudo" className="flex-1 sm:flex-none">
            Tipos e conteúdo
            {selectedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5">
                {selectedCount}
              </span>
            )}
          </TabsTrigger>
          {!isNew && <TabsTrigger value="status" className="flex-1 sm:flex-none">Fluxo e status</TabsTrigger>}
        </TabsList>

        <TabsContent value="geral" className="space-y-4 mt-5">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Identificação da solicitação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-500">Nº da solicitação</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="number"
                    min={1}
                    className="w-24 h-10 font-mono"
                    value={form.request_number}
                    onChange={(e) => patchForm({ request_number: Number(e.target.value) })}
                  />
                  <span className="text-slate-400 font-medium">/</span>
                  <Input
                    type="number"
                    className="w-24 h-10 font-mono"
                    value={form.request_year}
                    onChange={(e) => patchForm({ request_year: Number(e.target.value) })}
                  />
                  <span className="text-sm text-slate-500 hidden sm:inline">
                    → {formatRequestNumber(form.request_number, form.request_year)}
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-500">Data da solicitação</Label>
                <Input
                  type="date"
                  className="mt-1.5 h-10"
                  value={form.request_date || ""}
                  onChange={(e) => patchForm({ request_date: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fornecedor e envio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500">Fornecedor *</Label>
                  <select
                    className={`${selectClass} mt-1.5`}
                    value={form.supplier_id || ""}
                    onChange={(e) => onSupplierChange(e.target.value)}
                  >
                    <option value="">Selecione o fornecedor…</option>
                    {cadastro.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Enviado por *</Label>
                  <select
                    className={`${selectClass} mt-1.5`}
                    value={form.sent_by_id || ""}
                    onChange={(e) => onSentByChange(e.target.value)}
                  >
                    <option value="">Selecione o colaborador…</option>
                    {cadastro.employees.map((e) => (
                      <option key={e.id} value={e.id}>{employeeOptionLabel(e)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Observações gerais</Label>
                  <textarea
                    className="mt-1.5 w-full min-h-[80px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={form.notes || ""}
                    placeholder="Informações adicionais para o PDF…"
                    onChange={(e) => patchForm({ notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <PartyPreview
                icon={Buildings}
                title="Solicitante"
                lines={[
                  { label: "Razão social", value: client.legal_name },
                  { label: "CNPJ", value: client.cnpj },
                  { label: "Endereço", value: client.address },
                  { label: "Contato", value: [client.phone, client.email].filter(Boolean).join(" · ") },
                  { label: "Enviado por", value: sentBy.full_name },
                ]}
              />
              {form.supplier_id && (
                <PartyPreview
                  icon={Truck}
                  title="Fornecedor (pré-visualização)"
                  lines={[
                    { label: "Empresa", value: supplier.company },
                    { label: "CNPJ", value: supplier.cnpj },
                    { label: "Endereço", value: supplier.address },
                    { label: "Contato", value: [supplier.contact, supplier.phone, supplier.email].filter(Boolean).join(" · ") },
                  ]}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conteudo" className="space-y-5 mt-5">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tipos de solicitação</CardTitle>
              <p className="text-sm text-slate-500 font-normal mt-1">
                Selecione um ou mais tipos. O preenchimento técnico aparece abaixo.
              </p>
            </CardHeader>
            <CardContent>
              <QuotationRequestTypeSelector sections={sections} onToggle={toggleType} />
            </CardContent>
          </Card>

          {selectedSections.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
              <p className="text-sm text-slate-600">Nenhum tipo selecionado.</p>
              <p className="text-xs text-slate-500 mt-1">Marque pelo menos um tipo acima para preencher os dados técnicos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedSections.map((sec) => (
                <QuotationRequestSectionEditor
                  key={sec.type}
                  section={sec}
                  items={items}
                  cadastro={cadastro}
                  expanded={expandedTypes[sec.type] !== false}
                  onToggleExpand={() => setExpandedTypes((prev) => ({ ...prev, [sec.type]: !prev[sec.type] }))}
                  onSectionChange={(patch) => {
                    setSections((prev) => prev.map((s) => (s.type === sec.type ? { ...s, ...patch } : s)));
                  }}
                  onItemsChange={setItems}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {!isNew && (
          <TabsContent value="status" className="mt-5 space-y-4">
            <QuotationRequestStatusPanel
              layout="full"
              status={form.status}
              isNew={false}
              onTransition={onStatusTransition}
              disabled={saving}
            />
            <QuotationGeneratedOrdersCard conversions={conversions} />
          </TabsContent>
        )}
      </Tabs>

      <QuotationConvertDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        quotationId={id}
        userId={user?.id}
        onConverted={async (result) => {
          if (result?.quotation) {
            setForm(result.quotation);
            setConversions(result.quotation.conversions || []);
          } else {
            await reloadQuotation();
          }
        }}
      />
    </div>
  );
}
