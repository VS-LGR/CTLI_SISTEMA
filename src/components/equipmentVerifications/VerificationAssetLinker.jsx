import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, PencilSimple, Trash, LinkSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  assetKindUsesCadastroLink,
  assetKindUsesInlineCadastro,
  emptyVerificationResponses,
  formatAssetLabel,
  MONTH_KEYS,
} from "@/lib/equipmentVerifications/verificationChecklist";
import {
  createComputerForVerification,
  createVehicleForVerification,
  deleteInlineAsset,
  listLinkableCadastroAssets,
  updateComputerAsset,
  updateVehicleAsset,
} from "@/lib/equipmentVerifications/equipmentVerificationAssetsApi";

const emptyComputer = () => ({
  identification: "",
  brand: "",
  model: "",
  operating_system: "",
  location: "",
  responsible: "",
  notes: "",
  active: true,
});

const emptyVehicle = () => ({
  identification: "",
  plate: "",
  brand: "",
  model: "",
  year: "",
  usage_description: "",
  responsible: "",
  documentation_notes: "",
  notes: "",
  active: true,
});

function InlineAssetForm({ kind, form, setForm }) {
  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (kind === "veiculo") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
        <div className="space-y-1">
          <Label>Identificação</Label>
          <Input value={form.identification} onChange={setField("identification")} />
        </div>
        <div className="space-y-1">
          <Label>Placa</Label>
          <Input value={form.plate} onChange={setField("plate")} />
        </div>
        <div className="space-y-1">
          <Label>Marca</Label>
          <Input value={form.brand} onChange={setField("brand")} />
        </div>
        <div className="space-y-1">
          <Label>Modelo</Label>
          <Input value={form.model} onChange={setField("model")} />
        </div>
        <div className="space-y-1">
          <Label>Ano</Label>
          <Input value={form.year} onChange={setField("year")} inputMode="numeric" />
        </div>
        <div className="space-y-1">
          <Label>Responsável</Label>
          <Input value={form.responsible} onChange={setField("responsible")} />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label>Uso / capacidade</Label>
          <Input value={form.usage_description} onChange={setField("usage_description")} />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label>Documentação</Label>
          <Input value={form.documentation_notes} onChange={setField("documentation_notes")} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
      <div className="sm:col-span-2 space-y-1">
        <Label>Identificação / patrimônio *</Label>
        <Input value={form.identification} onChange={setField("identification")} />
      </div>
      <div className="space-y-1">
        <Label>Marca</Label>
        <Input value={form.brand} onChange={setField("brand")} />
      </div>
      <div className="space-y-1">
        <Label>Modelo</Label>
        <Input value={form.model} onChange={setField("model")} />
      </div>
      <div className="space-y-1">
        <Label>Sistema operacional</Label>
        <Input value={form.operating_system} onChange={setField("operating_system")} />
      </div>
      <div className="space-y-1">
        <Label>Localização</Label>
        <Input value={form.location} onChange={setField("location")} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label>Responsável</Label>
        <Input value={form.responsible} onChange={setField("responsible")} />
      </div>
    </div>
  );
}

export default function VerificationAssetLinker({
  kind,
  tenantId,
  verificationId,
  assets = [],
  onAssetsChange,
  onInitAssetResponses,
  disabled = false,
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyComputer());
  const [cadastroOptions, setCadastroOptions] = useState([]);
  const [selectedLinkIds, setSelectedLinkIds] = useState(new Set());
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [busy, setBusy] = useState(false);

  const linkedIds = useMemo(() => new Set(assets.map((a) => a.id)), [assets]);

  const openLinkDialog = async () => {
    setLoadingOptions(true);
    setLinkOpen(true);
    try {
      const opts = await listLinkableCadastroAssets(tenantId, kind);
      setCadastroOptions(opts);
      setSelectedLinkIds(new Set(assets.map((a) => a.id)));
    } catch (e) {
      toast.error(e.message);
      setLinkOpen(false);
    } finally {
      setLoadingOptions(false);
    }
  };

  const openInlineNew = () => {
    setEditing(null);
    setForm(kind === "veiculo" ? emptyVehicle() : emptyComputer());
    setInlineOpen(true);
  };

  const openInlineEdit = (asset) => {
    setEditing(asset);
    if (kind === "veiculo") {
      setForm({
        identification: asset.identification || "",
        plate: asset.plate || "",
        brand: asset.brand || "",
        model: asset.model || "",
        year: asset.year != null ? String(asset.year) : "",
        usage_description: asset.usage_description || "",
        responsible: asset.responsible || "",
        documentation_notes: asset.documentation_notes || "",
        notes: asset.notes || "",
        active: asset.active !== false,
      });
    } else {
      setForm({
        identification: asset.identification || "",
        brand: asset.brand || "",
        model: asset.model || "",
        operating_system: asset.operating_system || "",
        location: asset.location || "",
        responsible: asset.responsible || "",
        notes: asset.notes || "",
        active: asset.active !== false,
      });
    }
    setInlineOpen(true);
  };

  const confirmLink = () => {
    const picked = cadastroOptions.filter((o) => selectedLinkIds.has(o.id));
    const added = picked.filter((o) => !linkedIds.has(o.id));
    onAssetsChange(picked);
    for (const a of added) onInitAssetResponses?.(a.id);
    setLinkOpen(false);
    if (added.length) toast.success(`${added.length} equipamento(s) vinculado(s)`);
  };

  const saveInline = async () => {
    setBusy(true);
    try {
      if (editing?.id) {
        const updated = kind === "veiculo"
          ? await updateVehicleAsset(editing.id, form)
          : await updateComputerAsset(editing.id, form);
        onAssetsChange(assets.map((a) => (a.id === updated.id ? updated : a)));
        toast.success("Equipamento atualizado");
      } else {
        const created = kind === "veiculo"
          ? await createVehicleForVerification(tenantId, verificationId, form)
          : await createComputerForVerification(tenantId, verificationId, form);
        onAssetsChange([...assets, created]);
        onInitAssetResponses?.(created.id);
        toast.success("Equipamento adicionado");
      }
      setInlineOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeAsset = async (asset) => {
    if (!window.confirm(`Remover ${formatAssetLabel(asset, kind)} desta verificação?`)) return;
    if (assetKindUsesInlineCadastro(kind)) {
      setBusy(true);
      try {
        await deleteInlineAsset(kind, asset.id);
        onAssetsChange(assets.filter((a) => a.id !== asset.id));
        toast.success("Removido");
      } catch (e) {
        toast.error(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    onAssetsChange(assets.filter((a) => a.id !== asset.id));
  };

  const toggleLinkId = (id) => {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Equipamentos ({assets.length})</CardTitle>
        <div className="flex flex-wrap gap-2">
          {assetKindUsesCadastroLink(kind) && (
            <Button type="button" size="sm" variant="outline" onClick={openLinkDialog} disabled={disabled || busy}>
              <LinkSimple size={16} className="mr-1" /> Vincular do cadastro
            </Button>
          )}
          {assetKindUsesInlineCadastro(kind) && (
            <Button type="button" size="sm" onClick={openInlineNew} disabled={disabled || busy}>
              <Plus size={16} className="mr-1" /> Adicionar equipamento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!assets.length ? (
          <p className="text-sm text-slate-500">
            {assetKindUsesInlineCadastro(kind)
              ? "Adicione computadores ou veículos para preencher o checklist de cada um."
              : "Vincule um ou mais equipamentos do cadastro para preencher o checklist."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {assets.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800 truncate">{formatAssetLabel(asset, kind)}</span>
                <div className="flex shrink-0 gap-1">
                  {assetKindUsesInlineCadastro(kind) && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openInlineEdit(asset)} disabled={busy}>
                      <PencilSimple size={16} />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAsset(asset)} disabled={busy}>
                    <Trash size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular equipamentos</DialogTitle>
          </DialogHeader>
          {loadingOptions ? (
            <p className="text-sm text-slate-500 py-4">A carregar…</p>
          ) : !cadastroOptions.length ? (
            <p className="text-sm text-slate-500 py-4">Nenhum equipamento disponível no cadastro.</p>
          ) : (
            <ul className="space-y-1 max-h-[50vh] overflow-y-auto py-2">
              {cadastroOptions.map((opt) => (
                <li key={opt.id}>
                  <label className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedLinkIds.has(opt.id)}
                      onCheckedChange={() => toggleLinkId(opt.id)}
                    />
                    <span>{formatAssetLabel(opt, kind)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={confirmLink} disabled={!selectedLinkIds.size}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inlineOpen} onOpenChange={setInlineOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
          </DialogHeader>
          <InlineAssetForm kind={kind} form={form} setForm={setForm} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInlineOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={saveInline} disabled={busy}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function initAssetResponseState(kind, assetId, prev = {}) {
  if (prev[assetId]) return prev;
  return {
    ...prev,
    [assetId]: emptyVerificationResponses(kind),
  };
}

export function initAssetResponsibleState(assetId, prev = {}) {
  if (prev[assetId]) return prev;
  return {
    ...prev,
    [assetId]: Object.fromEntries(MONTH_KEYS.map((m) => [m, ""])),
  };
}
