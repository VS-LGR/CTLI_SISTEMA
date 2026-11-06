import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/roles";
import {
  createMasterDocument,
  updateMasterDocument,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { createDocument, attachDocumentFile } from "@/lib/documentsApi";
import { routeForMasterDocument } from "@/lib/documentFolderConfig";
import {
  MASTER_DOCUMENT_TYPES,
  MASTER_DOCUMENT_STATUSES,
} from "@/lib/masterDocuments/masterDocumentConstants";
import { validateDocumentBeforeActivation } from "@/lib/masterDocuments/masterDocumentValidation";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";
import {
  buildExportTemplateConfigWithObservations,
  getCertificateObservationsFromConfig,
  isCertificateMasterDocument,
  observationsArrayToLines,
} from "@/lib/certificatePdf/certificateObservationsConfig";

const EMPTY = {
  code: "",
  title: "",
  type: "procedimento",
  category: "",
  reference: "",
  current_revision: "00",
  current_issue_date: "",
  status: "rascunho",
  file_naming_rule: "",
  export_file_name_pattern: "",
  template_key: "",
  linked_module: "",
  department: "",
  storage_location: "",
  protection_method: "",
  distribution_method: "",
  related_process: "",
  emission_responsible_id: "",
  analysis_responsible_id: "",
  approval_responsible_id: "",
  quality_management_responsible_id: "",
  retention_time: null,
  retention_unit: "anos",
  notes: "",
  export_template_config: {},
  critical_analysis_period_months: 24,
};

const CATEGORY_OPTIONS = ["Registro", "Procedimento", "Documento"];
const STORAGE_OPTIONS = [
  "Eletrônico na pasta do Sistema de Gestão da Qualidade",
  "Físico em Pasta",
  "Pasta Suspensa",
];
const PROTECTION_OPTIONS = ["Senha", "Arquivo"];

function retentionTextFrom(doc) {
  if (!doc) return "";
  const unit = String(doc.retention_unit || "");
  if (unit && !["anos", "meses", "dias"].includes(unit)) return unit;
  if (doc.retention_time) return `${doc.retention_time} ${unit || "anos"}`.trim();
  return "";
}

function ResponsibleSelect({ label, value, onChange, responsibles }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">—</SelectItem>
          {responsibles.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}{r.role ? ` — ${roleLabel(r.role)}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MasterDocumentFormDialog({ open, onOpenChange, tenantId, document, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [retentionText, setRetentionText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [responsibles, setResponsibles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [obsRbcText, setObsRbcText] = useState("");
  const [obsRastreavelText, setObsRastreavelText] = useState("");

  useEffect(() => {
    if (open) {
      setPdfFile(null);
      if (tenantId) {
        loadTenantResponsibles(tenantId).then(setResponsibles).catch(() => setResponsibles([]));
      }
      const nextForm = document
        ? {
          ...EMPTY,
          ...document,
          emission_responsible_id: document.emission_responsible_id || "",
          analysis_responsible_id: document.analysis_responsible_id || "",
          approval_responsible_id: document.approval_responsible_id || "",
          quality_management_responsible_id: document.quality_management_responsible_id || "",
        }
        : { ...EMPTY };
      setForm(nextForm);
      setRetentionText(retentionTextFrom(document));
      const obs = getCertificateObservationsFromConfig(nextForm.export_template_config);
      setObsRbcText(observationsArrayToLines(obs?.rbc));
      setObsRastreavelText(observationsArrayToLines(obs?.rastreavel));
    }
  }, [open, document, tenantId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!tenantId) return;
    if (!form.title?.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    const retentionNumber = Number.parseInt(String(retentionText).trim(), 10);
    const payloadBase = {
      ...form,
      emission_responsible_id: form.emission_responsible_id || null,
      analysis_responsible_id: form.analysis_responsible_id || null,
      approval_responsible_id: form.approval_responsible_id || null,
      quality_management_responsible_id: form.quality_management_responsible_id || null,
      retention_time: Number.isFinite(retentionNumber) ? retentionNumber : null,
      retention_unit: retentionText.trim(),
      critical_analysis_period_months: form.critical_analysis_period_months
        ? Number(form.critical_analysis_period_months)
        : 24,
      export_template_config: isCertificateMasterDocument(form)
        ? buildExportTemplateConfigWithObservations(form.export_template_config, {
          rbcText: obsRbcText,
          rastreavelText: obsRastreavelText,
        })
        : (form.export_template_config || {}),
    };
    if (form.status === "ativo") {
      const v = validateDocumentBeforeActivation(payloadBase);
      if (!v.valid) {
        toast.error(v.errors.join("; "));
        return;
      }
    }
    setBusy(true);
    try {
      let saved;
      if (document?.id) {
        saved = await updateMasterDocument(tenantId, document.id, payloadBase);
        toast.success("Documento atualizado");
      } else {
        saved = await createMasterDocument(tenantId, payloadBase);
        toast.success("Documento criado");
      }
      if (pdfFile && saved?.id) {
        const route = routeForMasterDocument(saved);
        if (!route) {
          toast.error("O PDF não foi encaminhado: use um código como PR-8.3 ou MQ-000 para indicar o requisito.");
        } else {
          const holder = await createDocument({
            tenant_id: tenantId,
            requirement: route.requirement,
            folder_key: route.folderKey,
            section: route.section,
            title: saved.title,
            code: saved.code,
            version: saved.current_revision,
            status: "rascunho",
            master_document_id: saved.id,
          }, user?.id);
          await attachDocumentFile(holder, pdfFile, user?.id);
          toast.success("PDF guardado no requisito correspondente.");
        }
      }
      onSaved?.();
    } catch (e) {
      const duplicate = e?.code === "23505" || String(e?.message || "").includes("idx_master_documents_unique_code");
      toast.error(duplicate
        ? "Já existe um documento com este código. A revisão seguinte entra no histórico desse documento, sem criar outro código."
        : (e.message || "Falha ao guardar"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? "Editar documento" : "Novo documento"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="RE-6.2A" />
            </div>
            <div>
              <Label>Revisão</Label>
              <Input value={form.current_revision} onChange={(e) => set("current_revision", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MASTER_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MASTER_DOCUMENT_STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Referência</Label>
              <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={CATEGORY_OPTIONS.includes(form.category) ? form.category : "_"} onValueChange={(v) => set("category", v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Data de emissão</Label>
            <Input type="date" value={form.current_issue_date || ""} onChange={(e) => set("current_issue_date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Local de armazenamento</Label>
              <Select value={STORAGE_OPTIONS.includes(form.storage_location) ? form.storage_location : "_"} onValueChange={(v) => set("storage_location", v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {STORAGE_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proteção</Label>
              <Select value={PROTECTION_OPTIONS.includes(form.protection_method) ? form.protection_method : "_"} onValueChange={(v) => set("protection_method", v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {PROTECTION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>PDF do documento</Label>
            <Input type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground mt-1">O PDF é guardado no requisito indicado pelo código.</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3 space-y-3">
            <p className="text-xs font-medium text-foreground/90">Responsáveis (obrigatório para ativar)</p>
            <div className="grid grid-cols-2 gap-3">
              <ResponsibleSelect
                label="Emissor"
                value={form.emission_responsible_id}
                onChange={(v) => set("emission_responsible_id", v)}
                responsibles={responsibles}
              />
              <ResponsibleSelect
                label="Análise crítica"
                value={form.analysis_responsible_id}
                onChange={(v) => set("analysis_responsible_id", v)}
                responsibles={responsibles}
              />
              <ResponsibleSelect
                label="Aprovação"
                value={form.approval_responsible_id}
                onChange={(v) => set("approval_responsible_id", v)}
                responsibles={responsibles}
              />
              <ResponsibleSelect
                label="Gestão da Qualidade"
                value={form.quality_management_responsible_id}
                onChange={(v) => set("quality_management_responsible_id", v)}
                responsibles={responsibles}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Retenção</Label>
              <Input value={retentionText} onChange={(e) => setRetentionText(e.target.value)} placeholder="Ex.: 5 anos" />
            </div>
            <div>
              <Label>Período análise crítica (meses)</Label>
              <Input
                type="number"
                value={form.critical_analysis_period_months ?? 24}
                onChange={(e) => set("critical_analysis_period_months", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
          {isCertificateMasterDocument(form) && (
            <div className="space-y-3 rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium text-foreground/90">
                Observações do PDF (RE-7.2B) — uma linha por item numerado no certificado
              </p>
              <div>
                <Label>Certificado RBC</Label>
                <Textarea
                  value={obsRbcText}
                  onChange={(e) => setObsRbcText(e.target.value)}
                  rows={6}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label>Certificado rastreável</Label>
                <Textarea
                  value={obsRastreavelText}
                  onChange={(e) => setObsRastreavelText(e.target.value)}
                  rows={6}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "A guardar…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
