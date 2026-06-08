import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MultiSelectStandardOptions from "@/components/personnel/MultiSelectStandardOptions";
import { NOT_APPLICABLE_LABEL } from "@/lib/personnelConstants";

export default function PersonnelCompetencyFields({
  form,
  setForm,
  optionsByCategory,
  employees = [],
  readOnly = false,
  showEmployeeFields = true,
}) {
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4 min-w-0">
      {showEmployeeFields && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Matrícula *</Label>
            <Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div>
            <Label>Data de admissão *</Label>
            <Input type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div>
            <Label>Ocupante do Cargo</Label>
            <Input value={form.occupant_name} onChange={(e) => set("occupant_name", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div>
            <Label>Formação atual *</Label>
            <Input value={form.current_education} onChange={(e) => set("current_education", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div>
            <Label>Última atualização *</Label>
            <Input type="date" value={form.last_update_date} onChange={(e) => set("last_update_date", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div>
            <Label>Supervisor imediato</Label>
            <select
              value={employees.find((e) => e.full_name === form.immediate_supervisor)?.id || ""}
              onChange={(e) => {
                const emp = employees.find((x) => x.id === e.target.value);
                set("immediate_supervisor", emp?.full_name || "");
              }}
              disabled={readOnly}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">— Selecionar colaborador —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <Label>Conjunto de Atividades Relacionadas à Função</Label>
        <Textarea value={form.function_activities} onChange={(e) => set("function_activities", e.target.value)} disabled={readOnly} rows={3} />
      </div>
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
        label="Treinamentos internos"
        options={optionsByCategory.internal_training || []}
        value={form.internal_trainings || []}
        onChange={(v) => set("internal_trainings", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Conhecimentos gerais"
        options={optionsByCategory.general_knowledge || []}
        value={form.general_knowledge || []}
        onChange={(v) => set("general_knowledge", v)}
        disabled={readOnly}
      />
      <MultiSelectStandardOptions
        label="Conhecimento técnico"
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
        <Label>Responsável pela análise e aprovação</Label>
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
          <>
            <select
              value={form.analysis_approval_responsible_id || ""}
              onChange={(e) => {
                const id = e.target.value;
                const emp = employees.find((x) => x.id === id);
                setForm((prev) => ({
                  ...prev,
                  analysis_approval_responsible_id: id,
                  analysis_approval_responsible_name: emp?.full_name || "",
                }));
              }}
              disabled={readOnly}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">— Selecionar —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
