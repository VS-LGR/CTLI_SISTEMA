import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  createExperienceEvaluation,
  getExperienceEvaluation,
  updateExperienceEvaluation,
} from "@/lib/personnelExperienceEvaluationsApi";
import { listPositions } from "@/lib/personnelPositionsApi";
import { emptyExperienceEvaluationForm } from "@/lib/personnelFormDefaults";
import { validateExperienceEvaluation } from "@/lib/personnelValidation";
import { exportExperienceEvaluationPdf } from "@/lib/personnelPdfExport";
import { PERSONNEL_AVALIACAO_EXPERIENCIA_PATH } from "@/lib/personnelRoutes";
import { getPosition } from "@/lib/personnelPositionsApi";
import {
  EXPERIENCE_EVALUATION_SCORES,
  EXPERIENCE_OPINION_LABELS,
  EXPERIENCE_OPINION_APPROVED,
  EXPERIENCE_OPINION_REJECTED,
  EXPERIENCE_APPROVAL_MIN_AVERAGE,
  calculateExperienceAverage,
  suggestExperienceOpinion,
  defaultExperienceEvaluationItems,
  formatExperiencePeriodLabel,
  experienceResultLabel,
} from "@/lib/personnelExperienceConstants";

export default function ExperienceEvaluationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
  const [form, setForm] = useState(emptyExperienceEvaluationForm);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [opinionManual, setOpinionManual] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const updateItemsAndSuggest = (items) => {
    const avg = calculateExperienceAverage(items);
    setForm((prev) => {
      const next = { ...prev, items, average_score: avg };
      if (!opinionManual && avg !== null) {
        next.conclusive_opinion = suggestExperienceOpinion(avg);
      }
      return next;
    });
  };

  const onEmployeeChange = async (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    setForm((prev) => ({
      ...prev,
      employee_id: emp.id,
      registration_number: emp.registration_code || "",
      occupant_name: emp.full_name || "",
      admission_date: emp.admission_date?.slice?.(0, 10) || emp.admission_date || "",
      position_id: emp.position_id || "",
      evaluator_id: emp.supervisor_id || prev.evaluator_id || "",
    }));
    if (emp.position_id) {
      try {
        const pos = await getPosition(emp.position_id);
        setForm((prev) => ({
          ...prev,
          position_id: pos.id,
          position_title: pos.title || "",
        }));
      } catch { /* ignore */ }
    }
  };

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    const [em, pos] = await Promise.all([
      supabase.from("employee_registrations").select("id, full_name, registration_code, admission_date, position_id, supervisor_id").eq("tenant_id", currentTenantId).order("full_name"),
      listPositions(currentTenantId, { status: "ativo" }),
    ]);
    setEmployees(em.data || []);
    setPositions(pos);
    if (!isNew && id) {
      const row = await getExperienceEvaluation(id);
      setForm({
        ...emptyExperienceEvaluationForm(),
        ...row,
        items: row.items?.length ? row.items : defaultExperienceEvaluationItems(),
        admission_date: row.admission_date?.slice?.(0, 10) || "",
        evaluation_date: row.evaluation_date?.slice?.(0, 10) || "",
        signature_date: row.signature_date?.slice?.(0, 10) || "",
        document_model_issue_date: row.document_model_issue_date?.slice?.(0, 10) || "",
      });
      setOpinionManual(true);
    }
  }, [currentTenantId, id, isNew]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const save = async () => {
    const errors = validateExperienceEvaluation(form);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const payload = {
        ...form,
        average_score: calculateExperienceAverage(form.items),
        evaluator_name: employees.find((e) => e.id === form.evaluator_id)?.full_name || form.evaluator_name,
      };
      if (isNew) {
        const row = await createExperienceEvaluation(currentTenantId, payload);
        toast.success("Avaliação criada");
        navigate(`/pessoal/avaliacao-experiencia/${row.id}`, { replace: true });
      } else {
        await updateExperienceEvaluation(id, currentTenantId, payload);
        toast.success("Guardado");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 min-w-0">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild><Link to={PERSONNEL_AVALIACAO_EXPERIENCIA_PATH}><ArrowLeft size={18} /></Link></Button>
        <h1 className="text-xl font-bold">{isNew ? "Nova avaliação de experiência" : "Editar avaliação"}</h1>
        {!isNew && (
          <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={async () => {
            try {
              await exportExperienceEvaluationPdf(id, currentTenant);
              toast.success("PDF gerado");
            } catch (e) { toast.error(e.message); }
          }}>
            <FilePdf size={16} className="mr-1" /> RE-6.2B
          </Button>
        )}
      </div>
      <Card><CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.employee_id} onChange={(e) => onEmployeeChange(e.target.value)}>
              <option value="">— Selecionar —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Cargo *</Label>
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.position_id} onChange={async (e) => {
              const pid = e.target.value;
              set("position_id", pid);
              if (pid) {
                const pos = await getPosition(pid);
                set("position_title", pos.title);
              }
            }}>
              <option value="">— Selecionar —</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div><Label>Nome</Label><Input value={form.occupant_name} onChange={(e) => set("occupant_name", e.target.value)} className="h-10" /></div>
          <div><Label>Admissão *</Label><Input type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} className="h-10" /></div>
          <div><Label>Setor</Label><Input value={form.department} onChange={(e) => set("department", e.target.value)} className="h-10" /></div>
          <div>
            <Label>Avaliador *</Label>
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.evaluator_id} onChange={(e) => set("evaluator_id", e.target.value)}>
              <option value="">— Selecionar —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div><Label>Data da avaliação *</Label><Input type="date" value={form.evaluation_date} onChange={(e) => set("evaluation_date", e.target.value)} className="h-10" /></div>
          <div><Label>Data assinatura</Label><Input type="date" value={form.signature_date} onChange={(e) => set("signature_date", e.target.value)} className="h-10" /></div>
        </div>

        {form.admission_date && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
            <strong>Período de experiência:</strong> {formatExperiencePeriodLabel(form.admission_date)}
          </div>
        )}

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">Item</th>
                {EXPERIENCE_EVALUATION_SCORES.map((s) => (
                  <th key={s} className="p-2 text-center w-10">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.items || []).map((it, idx) => (
                <tr key={it.item_number} className="border-t">
                  <td className="p-2">{it.item_number}. {it.description}</td>
                  {EXPERIENCE_EVALUATION_SCORES.map((score) => (
                    <td key={score} className="p-1 text-center">
                      <input
                        type="radio"
                        name={`item-${it.item_number}`}
                        checked={it.score === score}
                        onChange={() => {
                          const items = [...form.items];
                          items[idx] = { ...items[idx], score };
                          updateItemsAndSuggest(items);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`rounded-lg border px-4 py-3 ${
          form.conclusive_opinion === EXPERIENCE_OPINION_APPROVED
            ? "border-green-300 bg-green-50"
            : form.conclusive_opinion === EXPERIENCE_OPINION_REJECTED
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-slate-50"
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              Média: <strong className="text-base">{form.average_score ?? "—"}</strong>
            </span>
            <span className="text-xs text-slate-500">
              (mínimo {EXPERIENCE_APPROVAL_MIN_AVERAGE},0 para aprovação)
            </span>
            {form.conclusive_opinion && (
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                form.conclusive_opinion === EXPERIENCE_OPINION_APPROVED
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}>
                {experienceResultLabel(form.conclusive_opinion)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Parecer conclusivo *</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="opinion" checked={form.conclusive_opinion === EXPERIENCE_OPINION_APPROVED} onChange={() => { setOpinionManual(true); set("conclusive_opinion", EXPERIENCE_OPINION_APPROVED); }} />
            {EXPERIENCE_OPINION_LABELS.aprovado}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="opinion" checked={form.conclusive_opinion === EXPERIENCE_OPINION_REJECTED} onChange={() => { setOpinionManual(true); set("conclusive_opinion", EXPERIENCE_OPINION_REJECTED); }} />
            {EXPERIENCE_OPINION_LABELS.reprovado}
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(PERSONNEL_AVALIACAO_EXPERIENCIA_PATH)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
