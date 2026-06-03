import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MultiSelectStandardOptions from "@/components/personnel/MultiSelectStandardOptions";
import { NOT_APPLICABLE_LABEL } from "@/lib/personnelConstants";

function Field({ label, children }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function PositionForm({
  form,
  setForm,
  optionsByCategory,
  employees = [],
  readOnly = false,
}) {
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo *">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            disabled={readOnly}
            className="w-full border rounded-md h-10 px-3 text-sm"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Field>
        <Field label="Data de Inclusão">
          <Input type="date" value={form.inclusion_date} onChange={(e) => set("inclusion_date", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Última Atualização">
          <Input type="date" value={form.last_update_date} onChange={(e) => set("last_update_date", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Formação Exigida *">
          <Input value={form.required_education} onChange={(e) => set("required_education", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Formação Desejável">
          <Input value={form.desired_education} onChange={(e) => set("desired_education", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Supervisor Imediato">
          <Input value={form.immediate_supervisor} onChange={(e) => set("immediate_supervisor", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
      </div>

      <Field label="Conjunto de Atividades Relacionadas à Função *">
        <Textarea value={form.function_activities} onChange={(e) => set("function_activities", e.target.value)} disabled={readOnly} rows={4} />
      </Field>
      <MultiSelectStandardOptions
        label="Autoridades e Responsabilidades Técnicas"
        options={optionsByCategory.technical_authority || []}
        value={form.technical_authorities || []}
        onChange={(v) => set("technical_authorities", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Autoridades e Responsabilidades Gerenciais"
        options={optionsByCategory.managerial_authority || []}
        value={form.managerial_authorities || []}
        onChange={(v) => set("managerial_authorities", v)}
        disabled={readOnly}
      />

      <MultiSelectStandardOptions
        label="Treinamentos Internos *"
        options={optionsByCategory.internal_training || []}
        value={form.internal_trainings || []}
        onChange={(v) => set("internal_trainings", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Conhecimentos Gerais"
        options={optionsByCategory.general_knowledge || []}
        value={form.general_knowledge || []}
        onChange={(v) => set("general_knowledge", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Conhecimento Técnico"
        options={optionsByCategory.technical_knowledge || []}
        value={form.technical_knowledge || []}
        onChange={(v) => set("technical_knowledge", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Habilidades"
        options={optionsByCategory.skill || []}
        value={form.skills || []}
        onChange={(v) => set("skills", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Qualificações"
        options={optionsByCategory.qualification || []}
        value={form.qualification || []}
        onChange={(v) => set("qualification", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Experiência"
        options={optionsByCategory.experience || []}
        value={form.experience || []}
        onChange={(v) => set("experience", v)}
        disabled={readOnly}
      />

      <div className="space-y-2 border rounded-lg p-4 bg-slate-50/50">
        <Label>Responsável pela Análise e Aprovação</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.analysis_approval_responsible_na}
            onChange={(e) => setForm((prev) => ({
              ...prev,
              analysis_approval_responsible_na: e.target.checked,
              analysis_approval_responsible_id: e.target.checked ? "" : prev.analysis_approval_responsible_id,
            }))}
            disabled={readOnly}
          />
          {NOT_APPLICABLE_LABEL}
        </label>
        {!form.analysis_approval_responsible_na && (
          <select
            value={form.analysis_approval_responsible_id || ""}
            onChange={(e) => set("analysis_approval_responsible_id", e.target.value)}
            disabled={readOnly}
            className="w-full border rounded-md h-10 px-3 text-sm"
          >
            <option value="">— Selecionar colaborador —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
        <Field label="Cód. documento">
          <Input value={form.document_code} onChange={(e) => set("document_code", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Referência">
          <Input value={form.document_reference} onChange={(e) => set("document_reference", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Revisão">
          <Input value={form.document_revision} onChange={(e) => set("document_revision", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
        <Field label="Emissão do modelo">
          <Input type="date" value={form.document_model_issue_date} onChange={(e) => set("document_model_issue_date", e.target.value)} disabled={readOnly} className="h-10" />
        </Field>
      </div>
    </div>
  );
}
