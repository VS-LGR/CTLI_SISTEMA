import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessPurchaseOrders } from "@/lib/roles";
import { usePurchaseOrderCadastroData } from "@/hooks/usePurchaseOrderCadastroData";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  updatePurchaseOrder,
  suggestNextOrderNumber,
  transitionStatus,
  saveInspection,
  syncSignatures,
  duplicatePurchaseOrder,
} from "@/lib/purchaseOrdersApi";
import { exportPedidoCompraPdf } from "@/lib/pedidosCompraExport";
import { PR_66_PEDIDOS_PATH, PEDIDOS_LIST_PATH } from "@/lib/pedidosCompraRoutes";
import { jobLabel } from "@/lib/cadastroConstants";
import { getServiceFieldConfig } from "@/lib/purchaseOrderTypes";
import {
  PURCHASE_ORDER_TYPES,
  PURCHASE_ORDER_STATUSES,
  DEFAULT_OBSERVATIONS,
  emptyPurchaseOrderItem,
  emptyInspection,
  getTitleForType,
  formatOrderNumber,
  canEditOrder,
  canTransitionStatus,
  statusLabel,
} from "@/lib/purchaseOrderTypes";
import { buildSupplierSnapshot } from "@/lib/purchaseOrderSnapshots";
import { formatDisplayValue } from "@/lib/purchaseOrderCalculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FloppyDisk, FilePdf, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import PurchaseOrderServicesEditor from "@/components/purchaseOrders/PurchaseOrderServicesEditor";
import PurchaseOrderInspectionForm from "@/components/purchaseOrders/PurchaseOrderInspectionForm";
import { supabase } from "@/lib/supabaseClient";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(type, tenantId, year, orderNum) {
  return {
    tenant_id: tenantId,
    type: type || "",
    title: type ? getTitleForType(type) : "",
    order_number: orderNum,
    order_year: year,
    supplier_id: "",
    supplier_data_snapshot: {},
    client_environment_id: tenantId,
    client_environment_data_snapshot: {},
    requested_by_id: "",
    technical_manager_id: "",
    purchase_responsible_id: "",
    status: "rascunho",
    order_date: todayIso(),
    issue_date: todayIso(),
    payment_terms: "",
    freight_responsibility: "",
    carrier_info: "",
    quotation_number: "",
    execution_period: "",
    observations: DEFAULT_OBSERVATIONS,
    discount: 0,
    taxes_mode: "incluso",
    document_code: "RE-6.6E",
    document_revision: "00",
    document_reference: "PR-6.6",
    signature_slot_1_label: "Gerente Técnico",
    signature_slot_2_label: "Compras",
  };
}

function employeeOptionLabel(e) {
  const role = e.job_role ? jobLabel(e.job_role) : "";
  return role ? `${e.full_name} (${role})` : e.full_name;
}

const SLOT2_PRESETS = ["Compras", "Gerente da Qualidade", "Vendas"];

export default function PedidoCompraEditorPage() {
  const { id } = useParams();
  const isNew = id === "nova";
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const nav = useNavigate();
  const cadastro = usePurchaseOrderCadastroData(currentTenantId);

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([emptyPurchaseOrderItem(1)]);
  const [inspection, setInspection] = useState(emptyInspection());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const readOnly = form ? !canEditOrder(form.status) : false;

  const loadNew = useCallback(async () => {
    const type = searchParams.get("type") || "";
    const year = new Date().getFullYear();
    let num = 1;
    try {
      num = await suggestNextOrderNumber(currentTenantId, year);
    } catch { /* ignore */ }
    setForm(initialForm(type, currentTenantId, year, num));
    setItems([emptyPurchaseOrderItem(1)]);
    setInspection(emptyInspection());
    setLoading(false);
  }, [currentTenantId, searchParams]);

  const loadExisting = useCallback(async () => {
    if (!id || id === "nova") return;
    try {
      const data = await getPurchaseOrder(id);
      setForm({
        ...data,
        discount: data.discount ?? 0,
        taxes_mode: data.taxes_mode || "incluso",
      });
      setItems(data.items?.length ? data.items : [emptyPurchaseOrderItem(1)]);
      setInspection(data.inspection || emptyInspection());
    } catch {
      toast.error("Pedido não encontrado");
      nav(PR_66_PEDIDOS_PATH);
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
    if (!form || !cadastro.tenant || isNew === false) return;
    if (!form.client_environment_data_snapshot?.legal_name && !form.client_environment_data_snapshot?.trade_name) {
      setForm((f) => ({
        ...f,
        client_environment_data_snapshot: {
          legal_name: cadastro.tenant.legal_name || cadastro.tenant.name,
          trade_name: cadastro.tenant.trade_name || cadastro.tenant.name,
          address: cadastro.tenant.billing_address,
          cep: cadastro.tenant.billing_cep,
          city: cadastro.tenant.billing_city,
          state: cadastro.tenant.billing_state,
          phone: cadastro.tenant.billing_phone,
          email: cadastro.tenant.billing_email,
          cnpj: cadastro.tenant.billing_cnpj,
          state_registration: cadastro.tenant.billing_state_registration,
          environment_responsible: cadastro.tenant.environment_responsible_name,
        },
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

  const validateBeforeSave = () => {
    if (!form.type) return "Selecione o tipo de pedido";
    if (!form.supplier_id) return "Selecione o fornecedor";
    if (!items.length) return "Adicione pelo menos um item";
    if (!form.order_date) return "Informe a data do pedido";
    if (!form.payment_terms?.trim()) return "Informe as condições de pagamento";
    if (!form.technical_manager_id) return "Selecione o gerente técnico";
    if (!form.purchase_responsible_id) return "Selecione o responsável de compras";
    if (!form.order_number) return "Informe o número do pedido";
    return null;
  };

  const save = async () => {
    const err = validateBeforeSave();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (isNew) {
        saved = await createPurchaseOrder(currentTenantId, form, items);
        await syncSignatures(saved.id, {
          technicalManagerId: form.technical_manager_id,
          purchaseResponsibleId: form.purchase_responsible_id,
          slot1Label: form.signature_slot_1_label,
          slot2Label: form.signature_slot_2_label,
        });
        toast.success("Pedido criado");
        nav(`/pedidos-compra/${saved.id}`, { replace: true });
      } else {
        saved = await updatePurchaseOrder(id, { ...form, tenant_id: currentTenantId }, items);
        await syncSignatures(id, {
          technicalManagerId: form.technical_manager_id,
          purchaseResponsibleId: form.purchase_responsible_id,
          slot1Label: form.signature_slot_1_label,
          slot2Label: form.signature_slot_2_label,
        });
        toast.success("Salvo");
        setForm({ ...saved, discount: saved.discount ?? 0 });
        setItems(saved.items || []);
      }
    } catch (e) {
      toast.error(e.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (newStatus) => {
    if (!canTransitionStatus(form.status, newStatus)) {
      toast.error("Transição de status não permitida");
      return;
    }
    try {
      const updated = await transitionStatus(id, newStatus);
      setForm((f) => ({ ...f, status: updated.status }));
      toast.success(`Status: ${statusLabel(newStatus)}`);
    } catch (e) {
      toast.error(e.message || "Falha");
    }
  };

  const saveInsp = async () => {
    if (!inspection.result) return toast.error("Selecione o resultado da inspeção");
    if (!inspection.inspection_responsible_id) return toast.error("Selecione o responsável");
    if (!inspection.inspection_date) return toast.error("Informe a data da inspeção");
    try {
      await saveInspection(id, inspection);
      toast.success("Inspeção guardada");
    } catch (e) {
      toast.error(e.message || "Falha");
    }
  };

  const dupOrder = async () => {
    if (!window.confirm("Duplicar este pedido com novo número?")) return;
    try {
      const copy = await duplicatePurchaseOrder(id);
      toast.success("Pedido duplicado");
      nav(`/pedidos-compra/${copy.id}`, { replace: true });
    } catch (e) {
      toast.error(e.message || "Falha ao duplicar");
    }
  };

  const exportPdf = async () => {
    try {
      const full = isNew ? null : await getPurchaseOrder(id);
      if (!full) return toast.error("Guarde o pedido antes de exportar");
      let logoDataUrl = null;
      if (currentTenant?.logo_storage_path) {
        const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(
          currentTenant.logo_storage_path,
          3600,
        );
        if (data?.signedUrl) {
          const res = await fetch(data.signedUrl);
          const blob = await res.blob();
          logoDataUrl = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(blob);
          });
        }
      }
      await exportPedidoCompraPdf(full, { logoDataUrl });
    } catch (e) {
      toast.error(e.message || "Falha no PDF");
    }
  };

  const billing = form?.client_environment_data_snapshot || {};
  const supplier = form?.supplier_data_snapshot || {};
  const fieldCfg = form?.type ? getServiceFieldConfig(form.type) : null;
  const employees = cadastro.employees || [];

  if (!canAccessPurchaseOrders(user?.role)) {
    return <div className="text-slate-600">Sem permissão.</div>;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <div className="text-slate-600">Selecione ambiente Supabase.</div>;
  }
  if (loading || !form) {
    return <div className="text-slate-600">Carregando…</div>;
  }

  return (
    <div className="space-y-6 min-w-0" data-testid="pedido-compra-editor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={PR_66_PEDIDOS_PATH} className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Voltar ao PR-6.6
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
            {isNew ? "Novo pedido" : formatOrderNumber(form.order_number, form.order_year)}
          </h1>
          <p className="text-sm text-slate-600">{statusLabel(form.status)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FloppyDisk size={16} className="mr-1" /> {saving ? "Salvando…" : "Salvar"}
            </Button>
          )}
          {!isNew && (
            <>
              <Button variant="outline" onClick={dupOrder}>
                <Copy size={16} className="mr-1" /> Duplicar
              </Button>
              <Button variant="outline" onClick={exportPdf}>
                <FilePdf size={16} className="mr-1" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {isNew && !form.type && (
        <Card className="border-slate-200">
          <CardHeader><CardTitle>Tipo de pedido</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PURCHASE_ORDER_TYPES.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                className="h-auto py-4 text-left justify-start whitespace-normal"
                onClick={() => patchForm({ type: t.id, title: getTitleForType(t.id) })}
              >
                {t.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {form.type && (
        <Tabs defaultValue="dados" className="min-w-0">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-white border">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="inspecao">Inspeção</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-base">Cabeçalho do documento</CardTitle></CardHeader>
              <CardContent className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label>Código (RE)</Label><Input className="mt-1" value={form.document_code || ""} disabled={readOnly} onChange={(e) => patchForm({ document_code: e.target.value })} /></div>
                <div><Label>Referência (PR)</Label><Input className="mt-1" value={form.document_reference || ""} disabled={readOnly} onChange={(e) => patchForm({ document_reference: e.target.value })} /></div>
                <div><Label>Revisão</Label><Input className="mt-1" value={form.document_revision || ""} disabled={readOnly} onChange={(e) => patchForm({ document_revision: e.target.value })} /></div>
                <div><Label>Emissão</Label><Input type="date" className="mt-1" value={form.issue_date || ""} disabled={readOnly} onChange={(e) => patchForm({ issue_date: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Nº pedido</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      min={1}
                      value={form.order_number}
                      disabled={readOnly}
                      onChange={(e) => patchForm({ order_number: Number(e.target.value) })}
                    />
                    <span className="self-center text-slate-500">/</span>
                    <Input
                      type="number"
                      value={form.order_year}
                      disabled={readOnly}
                      onChange={(e) => patchForm({ order_year: Number(e.target.value) })}
                      className="w-24"
                    />
                  </div>
                </div>
                <div><Label>Data pedido</Label><Input type="date" className="mt-1" value={form.order_date || ""} disabled={readOnly} onChange={(e) => patchForm({ order_date: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Título</Label><Input className="mt-1" value={form.title || ""} disabled={readOnly} onChange={(e) => patchForm({ title: e.target.value })} /></div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="border-slate-200">
                <CardHeader><CardTitle className="text-base">Fornecedor</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <select
                    className="w-full border rounded-md h-10 px-3 text-sm"
                    value={form.supplier_id || ""}
                    disabled={readOnly}
                    onChange={(e) => onSupplierChange(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {cadastro.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="text-sm space-y-1 text-slate-700">
                    <p><strong>Empresa:</strong> {formatDisplayValue(supplier.company)}</p>
                    <p><strong>At.:</strong> {formatDisplayValue(supplier.contact)}</p>
                    <p><strong>Endereço:</strong> {formatDisplayValue(supplier.address)}</p>
                    <p><strong>CNPJ:</strong> {formatDisplayValue(supplier.cnpj)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader><CardTitle className="text-base">Dados para faturamento</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1 text-slate-700">
                  <p><strong>Razão Social:</strong> {formatDisplayValue(billing.legal_name || billing.trade_name)}</p>
                  <p><strong>Endereço:</strong> {formatDisplayValue(billing.address)}</p>
                  <p><strong>CEP:</strong> {formatDisplayValue(billing.cep)}</p>
                  <p><strong>CNPJ:</strong> {formatDisplayValue(billing.cnpj)}</p>
                  <p><strong>E-mail:</strong> {formatDisplayValue(billing.email)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200">
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Condições de pagamento *</Label><Input className="mt-1" value={form.payment_terms} disabled={readOnly} onChange={(e) => patchForm({ payment_terms: e.target.value })} /></div>
                <div><Label>Frete por conta</Label><Input className="mt-1" value={form.freight_responsibility} disabled={readOnly} onChange={(e) => patchForm({ freight_responsibility: e.target.value })} /></div>
                <div><Label>Transportadora / Telefone</Label><Input className="mt-1" value={form.carrier_info} disabled={readOnly} onChange={(e) => patchForm({ carrier_info: e.target.value })} /></div>
                <div><Label>Conforme cotação nº</Label><Input className="mt-1" value={form.quotation_number} disabled={readOnly} onChange={(e) => patchForm({ quotation_number: e.target.value })} /></div>
                {!fieldCfg?.hideExecutionPeriod && (
                  <div><Label>Período de execução</Label><Input className="mt-1" value={form.execution_period} disabled={readOnly} onChange={(e) => patchForm({ execution_period: e.target.value })} /></div>
                )}
                <div className="sm:col-span-2"><Label>Observações</Label><Input className="mt-1" value={form.observations} disabled={readOnly} onChange={(e) => patchForm({ observations: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader><CardTitle className="text-base">Responsáveis</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {employees.length === 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Cadastre colaboradores em Cadastros para preencher os responsáveis e assinaturas do pedido.
                  </p>
                )}
                <div>
                  <Label>Enviado por</Label>
                  <select className="w-full border rounded-md h-10 px-3 mt-1 text-sm" value={form.requested_by_id || ""} disabled={readOnly} onChange={(e) => patchForm({ requested_by_id: e.target.value })}>
                    <option value="">—</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{employeeOptionLabel(e)}</option>)}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rótulo assinatura 1 *</Label>
                    <Input value={form.signature_slot_1_label || ""} disabled={readOnly} onChange={(e) => patchForm({ signature_slot_1_label: e.target.value })} />
                    <Label>Colaborador *</Label>
                    <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.technical_manager_id || ""} disabled={readOnly} onChange={(e) => patchForm({ technical_manager_id: e.target.value })}>
                      <option value="">Selecione…</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{employeeOptionLabel(e)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rótulo assinatura 2 *</Label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {SLOT2_PRESETS.map((preset) => (
                        <Button key={preset} type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={readOnly}
                          onClick={() => patchForm({ signature_slot_2_label: preset })}>
                          {preset}
                        </Button>
                      ))}
                    </div>
                    <Input value={form.signature_slot_2_label || ""} disabled={readOnly} onChange={(e) => patchForm({ signature_slot_2_label: e.target.value })} />
                    <Label>Colaborador *</Label>
                    <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.purchase_responsible_id || ""} disabled={readOnly} onChange={(e) => patchForm({ purchase_responsible_id: e.target.value })}>
                      <option value="">Selecione…</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{employeeOptionLabel(e)}</option>)}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servicos" className="mt-4">
            <PurchaseOrderServicesEditor
              type={form.type}
              items={items}
              onChange={setItems}
              weights={cadastro.weights}
              weightCerts={cadastro.weightCerts}
              envCerts={cadastro.envCerts}
              orderMeta={form}
              onOrderMetaChange={patchForm}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent value="inspecao" className="mt-4 space-y-4">
            <PurchaseOrderInspectionForm
              type={form.type}
              inspection={inspection}
              onChange={setInspection}
              employees={employees}
              weightCerts={cadastro.weightCerts}
              readOnly={readOnly}
              isNewOrder={isNew}
            />
            {!readOnly && !isNew && (
              <Button onClick={saveInsp} variant="outline">Guardar inspeção</Button>
            )}
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <Card className="border-slate-200">
              <CardContent className="p-5 flex flex-wrap gap-2">
                {PURCHASE_ORDER_STATUSES.map((s) => (
                  <Button
                    key={s.id}
                    variant={form.status === s.id ? "default" : "outline"}
                    size="sm"
                    disabled={isNew || !canTransitionStatus(form.status, s.id)}
                    onClick={() => !isNew && changeStatus(s.id)}
                  >
                    {s.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
