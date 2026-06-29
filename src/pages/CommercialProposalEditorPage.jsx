import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessCommercialProposals } from "@/lib/roles";
import { isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import {
  createCommercialProposal,
  getCommercialProposal,
  proposalToEditorForm,
  suggestNextProposalNumber,
  updateCommercialProposal,
} from "@/lib/commercialProposals/commercialProposalApi";
import { exportCommercialProposalPdf } from "@/lib/commercialProposals/commercialProposalsExport";
import {
  computeTotalFromScales,
  emptyProposalForm,
  formatProposalNumber,
  validateProposalForm,
} from "@/lib/commercialProposals/commercialProposalSchema";
import { PROPOSAL_LIST_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import ProposalClientSection from "@/components/commercialProposals/ProposalClientSection";
import ProposalScalesTable from "@/components/commercialProposals/ProposalScalesTable";
import ProposalCommercialSection from "@/components/commercialProposals/ProposalCommercialSection";
import ProposalColetasCard from "@/components/commercialProposals/ProposalColetasCard";
import ProposalExportCadastroDialog from "@/components/commercialProposals/ProposalExportCadastroDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FloppyDisk, FilePdf, Database } from "@phosphor-icons/react";
import { toast } from "sonner";

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

export default function CommercialProposalEditorPage() {
  const { id } = useParams();
  const isNew = id === "nova";
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const nav = useNavigate();

  const [form, setForm] = useState(null);
  const [proposalId, setProposalId] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [endCustomers, setEndCustomers] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [fullProposal, setFullProposal] = useState(null);

  const loadCustomers = useCallback(async () => {
    if (!currentTenantId) return;
    const { data } = await supabase
      .from("end_customer_registrations")
      .select("id, name, full_address, representative_name, phone, email, cnpj")
      .eq("tenant_id", currentTenantId)
      .order("name");
    setEndCustomers(data || []);
  }, [currentTenantId]);

  const loadNew = useCallback(async () => {
    const year = new Date().getFullYear();
    let num = 1;
    try {
      num = await suggestNextProposalNumber(currentTenantId, year);
    } catch { /* ignore */ }
    setForm({ ...emptyProposalForm(), proposal_number: num, proposal_year: year });
    setProposalId(null);
    setFullProposal(null);
    setLoading(false);
  }, [currentTenantId]);

  const loadExisting = useCallback(async () => {
    try {
      const data = await getCommercialProposal(id);
      setForm(proposalToEditorForm(data));
      setProposalId(data.id);
      setFullProposal(data);
    } catch {
      toast.error("Proposta não encontrada");
      nav(PROPOSAL_LIST_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => {
    if (isNew) loadNew();
    else loadExisting();
  }, [isNew, loadNew, loadExisting]);

  const computedTotal = useMemo(
    () => computeTotalFromScales(form?.scales || []),
    [form?.scales],
  );

  if (!canAccessCommercialProposals(user?.role) || !isSupabaseAuthMode) {
    return <div className="text-slate-600 text-sm p-6">Sem permissão ou modo indisponível.</div>;
  }

  const handleSave = async () => {
    const err = validateProposalForm(form);
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const payload = { ...form, tenant_id: currentTenantId };
      if (isNew || !proposalId) {
        const saved = await createCommercialProposal(currentTenantId, payload, { userId: user?.id });
        toast.success("Proposta criada");
        nav(`/propostas-comerciais/${saved.id}`, { replace: true });
      } else {
        const saved = await updateCommercialProposal(proposalId, payload, { userId: user?.id });
        setFullProposal(saved);
        setForm(proposalToEditorForm(saved));
        toast.success("Proposta guardada");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const data = fullProposal || (proposalId ? await getCommercialProposal(proposalId) : null);
      if (!data) return toast.error("Salve a proposta antes de exportar");
      const logo = await loadLogoDataUrl(currentTenant);
      await exportCommercialProposalPdf(data, {
        logoDataUrl: logo,
        tenant: currentTenant,
        tenantId: currentTenantId,
        userId: user?.id,
      });
      toast.success("PDF exportado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const refreshProposal = async () => {
    if (!proposalId) return;
    const data = await getCommercialProposal(proposalId);
    setFullProposal(data);
    setForm(proposalToEditorForm(data));
  };

  if (loading || !form) {
    return <div className="p-8 text-center text-slate-500 text-sm">Carregando…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={PROPOSAL_LIST_PATH}><ArrowLeft size={18} className="mr-1" /> Voltar</Link>
        </Button>
        <h1 className="font-display text-xl font-semibold text-slate-900">
          {isNew ? "Nova Proposta Comercial" : `Proposta ${formatProposalNumber(form.proposal_number, form.proposal_year)}`}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <FloppyDisk size={18} className="mr-1" /> {saving ? "Guardando…" : "Guardar"}
        </Button>
        {proposalId && (
          <>
            <Button variant="outline" onClick={handleExportPdf}>
              <FilePdf size={18} className="mr-1" /> Exportar PDF
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Database size={18} className="mr-1" /> Exportar cadastro
            </Button>
          </>
        )}
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Nº proposta</Label>
            <Input className="mt-1 font-mono" value={form.proposal_number} onChange={(e) => setForm({ ...form, proposal_number: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Ano</Label>
            <Input className="mt-1 font-mono" value={form.proposal_year} onChange={(e) => setForm({ ...form, proposal_year: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data</Label>
            <Input className="mt-1" type="date" value={form.proposal_date || ""} onChange={(e) => setForm({ ...form, proposal_date: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <ProposalClientSection
            endCustomers={endCustomers}
            endCustomerId={form.end_customer_id}
            snapshot={form.client_snapshot}
            onEndCustomerChange={(cid) => setForm({ ...form, end_customer_id: cid })}
            onSnapshotChange={(snap) => setForm({ ...form, client_snapshot: snap })}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <ProposalScalesTable scales={form.scales} onChange={(scales) => setForm({ ...form, scales })} />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <ProposalCommercialSection
            form={form}
            onChange={setForm}
            computedTotal={computedTotal}
          />
        </CardContent>
      </Card>

      <ProposalColetasCard
        proposalId={proposalId}
        scales={form.scales}
        userId={user?.id}
        onGenerated={refreshProposal}
      />

      <ProposalExportCadastroDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        proposal={fullProposal}
        onExported={refreshProposal}
      />
    </div>
  );
}
