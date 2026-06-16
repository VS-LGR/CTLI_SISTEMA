import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import MultiSelectStandardOptions from "@/components/personnel/MultiSelectStandardOptions";
import { createSelection, getSelection, updateSelection } from "@/lib/personnelSelectionsApi";
import { listPositions, getPosition } from "@/lib/personnelPositionsApi";
import { loadOptionsByCategory } from "@/lib/personnelStandardOptionsApi";
import { emptySelectionForm } from "@/lib/personnelFormDefaults";
import { validateSelection } from "@/lib/personnelValidation";
import { exportSelectionPdf, exportSelectionDocx } from "@/lib/personnelExport";
import PersonnelExportMenu from "@/components/personnel/PersonnelExportMenu";
import { personnelRegistrosPath } from "@/lib/personnelRegistrosRoutes";
import { mergePositionIntoFormFields } from "@/lib/personnelSnapshots";
import { labelsFromOptionItems, optionItemsFromLabels } from "@/lib/personnelConstants";
import {
  PERSONNEL_SELECTION_EDUCATION_LEVELS,
  SELECTION_APPROVAL_TEXT,
  DEFAULT_POSITION_ATTRIBUTIONS,
} from "@/lib/personnelSelectionConstants";

function Field({ label, children }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function PersonnelSelectionEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
  const returnTo = searchParams.get("returnTo");
  const registrosBack = returnTo || personnelRegistrosPath({ topic: "re-62f" });
  const [form, setForm] = useState(emptySelectionForm);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [optionsByCategory, setOptionsByCategory] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const onPositionChange = async (positionId) => {
    if (!positionId) return;
    const pos = await getPosition(positionId);
    const merged = mergePositionIntoFormFields(pos);
    const eduLabel = pos.required_education || "";
    setForm((prev) => ({
      ...prev,
      position_id: positionId,
      position_title: pos.title,
      vacancy: prev.vacancy || pos.title,
      required_education_level: eduLabel,
      selected_education_levels: eduLabel ? optionItemsFromLabels([eduLabel]) : [],
      selected_position_attributions: { ...DEFAULT_POSITION_ATTRIBUTIONS },
      function_activities: merged.function_activities,
      technical_authorities: merged.technical_authorities,
      managerial_authorities: merged.managerial_authorities,
      selected_general_knowledge: [...(merged.general_knowledge || [])],
      selected_technical_knowledge: [...(merged.technical_knowledge || [])],
      selected_skills: [...(merged.skills || [])],
      selected_qualifications: [...(merged.qualification || [])],
      selected_experience: [...(merged.experience || [])],
      analysis_approval_responsible_id: pos.analysis_approval_responsible_id || "",
    }));
  };

  const toggleEducation = (label) => {
    const current = labelsFromOptionItems(form.selected_education_levels);
    const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
    set("selected_education_levels", optionItemsFromLabels(next));
  };

  const toggleAttribution = (key) => {
    setForm((prev) => ({
      ...prev,
      selected_position_attributions: {
        ...prev.selected_position_attributions,
        [key]: !prev.selected_position_attributions?.[key],
      },
    }));
  };

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    const [opts, em, pos] = await Promise.all([
      loadOptionsByCategory(currentTenantId),
      supabase.from("employee_registrations").select("id, full_name").eq("tenant_id", currentTenantId).order("full_name"),
      listPositions(currentTenantId, { status: "ativo" }),
    ]);
    setOptionsByCategory(opts);
    setEmployees(em.data || []);
    setPositions(pos);
    if (!isNew && id) {
      const row = await getSelection(id);
      setForm({
        ...emptySelectionForm(),
        ...row,
        selected_position_attributions: row.selected_position_attributions || { ...DEFAULT_POSITION_ATTRIBUTIONS },
        selection_date: row.selection_date?.slice?.(0, 10) || "",
        document_model_issue_date: row.document_model_issue_date?.slice?.(0, 10) || "",
      });
    }
  }, [currentTenantId, id, isNew]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const save = async () => {
    const errors = validateSelection(form);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const payload = {
        ...form,
        selection_conductor_name: employees.find((e) => e.id === form.selection_conductor_id)?.full_name || form.selection_conductor_name,
        analysis_approval_responsible_name: employees.find((e) => e.id === form.analysis_approval_responsible_id)?.full_name || form.analysis_approval_responsible_name,
      };
      if (isNew) {
        await createSelection(currentTenantId, payload);
        toast.success("Seleção criada");
        navigate(registrosBack, { replace: true });
      } else {
        await updateSelection(id, currentTenantId, payload);
        toast.success("Guardado");
        if (returnTo) navigate(returnTo, { replace: true });
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const attr = form.selected_position_attributions || DEFAULT_POSITION_ATTRIBUTIONS;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 min-w-0">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild><Link to={registrosBack}><ArrowLeft size={18} /></Link></Button>
        <h1 className="text-xl font-bold">{isNew ? "Nova seleção de pessoal" : "Editar seleção"}</h1>
        {!isNew && (
          <PersonnelExportMenu
            variant="outline"
            className="ml-auto"
            disabled={busy}
            label="RE-6.2F"
            onExportPdf={() => exportSelectionPdf(id, currentTenant)}
            onExportDocx={() => exportSelectionDocx(id, currentTenant)}
          />
        )}
      </div>
      {returnTo && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-700">A registar seleção no fluxo de integração de pessoal.</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-blue-700" asChild>
            <Link to={returnTo}>Voltar ao fluxo</Link>
          </Button>
        </div>
      )}
      <Card><CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data *"><Input type="date" value={form.selection_date} onChange={(e) => set("selection_date", e.target.value)} className="h-10" /></Field>
          <Field label="Vaga *"><Input value={form.vacancy} onChange={(e) => set("vacancy", e.target.value)} className="h-10" /></Field>
          <Field label="Nível de Formação Exigido *"><Input value={form.required_education_level} onChange={(e) => set("required_education_level", e.target.value)} className="h-10" /></Field>
          <Field label="Condutor do Processo Seletivo *">
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.selection_conductor_id} onChange={(e) => set("selection_conductor_id", e.target.value)}>
              <option value="">— Selecionar —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </Field>
          <Field label="Candidato *"><Input value={form.candidate_name} onChange={(e) => set("candidate_name", e.target.value)} className="h-10" /></Field>
          <Field label="Cargo vinculado">
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.position_id} onChange={(e) => onPositionChange(e.target.value)}>
              <option value="">— Selecionar —</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
        </div>

        <div className="border rounded-lg p-4 space-y-2 bg-slate-50/50">
          <Label>Nível de Formação (checklist)</Label>
          <div className="grid gap-1 sm:grid-cols-2">
            {PERSONNEL_SELECTION_EDUCATION_LEVELS.map((lvl) => (
              <label key={lvl} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={labelsFromOptionItems(form.selected_education_levels).includes(lvl)} onChange={() => toggleEducation(lvl)} />
                {lvl}
              </label>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <Label>Atribuições do Cargo conforme RE-6.2C</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!attr.function_activities} onChange={() => toggleAttribution("function_activities")} />
            Conjunto de Atividades Relacionadas à Função
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!attr.technical_authorities} onChange={() => toggleAttribution("technical_authorities")} />
            Autoridades e Responsabilidades Técnicas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!attr.managerial_authorities} onChange={() => toggleAttribution("managerial_authorities")} />
            Autoridades e Responsabilidades Gerenciais
          </label>
        </div>

        <MultiSelectStandardOptions label="Conhecimentos Gerais" options={optionsByCategory.general_knowledge || []} value={form.selected_general_knowledge || []} onChange={(v) => set("selected_general_knowledge", v)} />
        <MultiSelectStandardOptions label="Conhecimento Técnico" options={optionsByCategory.technical_knowledge || []} value={form.selected_technical_knowledge || []} onChange={(v) => set("selected_technical_knowledge", v)} />
        <Field label="Outros (conhecimento técnico)"><Input value={form.technical_knowledge_other} onChange={(e) => set("technical_knowledge_other", e.target.value)} className="h-10" /></Field>
        <MultiSelectStandardOptions label="Habilidade" options={optionsByCategory.skill || []} value={form.selected_skills || []} onChange={(v) => set("selected_skills", v)} />
        <MultiSelectStandardOptions label="Qualificação" options={optionsByCategory.qualification || []} value={form.selected_qualifications || []} onChange={(v) => set("selected_qualifications", v)} />
        <Field label="Outros (qualificação)"><Input value={form.qualification_other} onChange={(e) => set("qualification_other", e.target.value)} className="h-10" /></Field>
        <MultiSelectStandardOptions label="Experiência" options={optionsByCategory.experience || []} value={form.selected_experience || []} onChange={(v) => set("selected_experience", v)} />

        <div className="border rounded-lg p-4 space-y-2">
          <Label>Parecer conclusivo *</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="parecer" checked={form.conclusive_opinion_approved === true} onChange={() => set("conclusive_opinion_approved", true)} /> Sim
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="parecer" checked={form.conclusive_opinion_approved === false} onChange={() => set("conclusive_opinion_approved", false)} /> Não
          </label>
          {form.conclusive_opinion_approved === true && (
            <p className="text-xs text-slate-600 mt-2">{SELECTION_APPROVAL_TEXT}</p>
          )}
          {form.conclusive_opinion_approved === false && (
            <Textarea value={form.conclusive_opinion_text} onChange={(e) => set("conclusive_opinion_text", e.target.value)} rows={3} placeholder="Justificativa" />
          )}
        </div>

        <Field label="Responsável pela Análise e Aprovação *">
          <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.analysis_approval_responsible_id} onChange={(e) => set("analysis_approval_responsible_id", e.target.value)}>
            <option value="">— Selecionar —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </Field>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(registrosBack)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
