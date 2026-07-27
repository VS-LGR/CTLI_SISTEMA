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
import { isCtliAdmin } from "@/lib/roles";
import {
  createMasterDocument,
  updateMasterDocument,
  listFileNamingRules,
} from "@/lib/masterDocuments/masterDocumentsApi";
import {
  MASTER_DOCUMENT_TYPES,
  MASTER_DOCUMENT_STATUSES,
  MASTER_DOCUMENT_CATEGORIES,
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
              {r.name}{r.role ? ` (${r.role})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MasterDocumentFormDialog({ open, onOpenChange, tenantId, document, onSaved }) {
  const { user } = useAuth();
  const showTemplateFields = isCtliAdmin(user?.role);
  const [form, setForm] = useState(EMPTY);
  const [namingRules, setNamingRules] = useState([]);
  const [responsibles, setResponsibles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [obsRbcText, setObsRbcText] = useState("");
  const [obsRastreavelText, setObsRastreavelText] = useState("");

  useEffect(() => {
    if (open) {
      listFileNamingRules().then(setNamingRules).catch(() => setNamingRules([]));
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
      const obs = getCertificateObservationsFromConfig(nextForm.export_template_config);
      setObsRbcText(observationsArrayToLines(obs?.rbc));
      setObsRastreavelText(observationsArrayToLines(obs?.rastreavel));
    }
  }, [open, document, tenantId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onNamingRuleChange = (ruleName) => {
    const rule = namingRules.find((r) => r.name === ruleName);
    set("file_naming_rule", ruleName);
    if (rule) set("export_file_name_pattern", rule.pattern);
  };

  const save = async () => {
    if (!tenantId) return;
    if (!form.title?.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    const payloadBase = {
      ...form,
      emission_responsible_id: form.emission_responsible_id || null,
      analysis_responsible_id: form.analysis_responsible_id || null,
      approval_responsible_id: form.approval_responsible_id || null,
      quality_management_responsible_id: form.quality_management_responsible_id || null,
      retention_time: form.retention_time ? Number(form.retention_time) : null,
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
      if (document?.id) {
        await updateMasterDocument(tenantId, document.id, payloadBase);
        toast.success("Documento atualizado");
      } else {
        await createMasterDocument(tenantId, payloadBase);
        toast.success("Documento criado");
      }
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Falha ao guardar");
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
              <Select value={form.category || "_"} onValueChange={(v) => set("category", v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {MASTER_DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de emissão</Label>
              <Input type="date" value={form.current_issue_date || ""} onChange={(e) => set("current_issue_date", e.target.value)} />
            </div>
            <div>
              <Label>Módulo vinculado</Label>
              <Input value={form.linked_module} onChange={(e) => set("linked_module", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Departamento</Label>
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
            </div>
            <div>
              <Label>Processo relacionado</Label>
              <Input value={form.related_process} onChange={(e) => set("related_process", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Local de armazenamento</Label>
              <Input value={form.storage_location} onChange={(e) => set("storage_location", e.target.value)} />
            </div>
            <div>
              <Label>Proteção</Label>
              <Input value={form.protection_method} onChange={(e) => set("protection_method", e.target.value)} placeholder="PDF / capa plástica" />
            </div>
          </div>
          <div>
            <Label>Método de distribuição</Label>
            <Input value={form.distribution_method} onChange={(e) => set("distribution_method", e.target.value)} />
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
            <p className="text-xs font-medium text-slate-700">Responsáveis (obrigatório para ativar)</p>
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
          {showTemplateFields && (
            <>
              <div>
                <Label>Template key</Label>
                <Input value={form.template_key} onChange={(e) => set("template_key", e.target.value)} placeholder="re-62a-adequacao-competencia-pdf" />
              </div>
              <div>
                <Label>Regra de nome do arquivo</Label>
                <Select value={form.file_naming_rule || "_"} onValueChange={(v) => onNamingRuleChange(v === "_" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar regra" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    {namingRules.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Padrão de exportação</Label>
                <Input value={form.export_file_name_pattern} onChange={(e) => set("export_file_name_pattern", e.target.value)} className="font-mono text-xs" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Retenção</Label>
              <Input type="number" value={form.retention_time ?? ""} onChange={(e) => set("retention_time", e.target.value)} />
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
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">
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
