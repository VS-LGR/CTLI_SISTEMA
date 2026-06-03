import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FilePdf, Plus, Users } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import FormDynamicRows from "@/components/forms/FormDynamicRows";
import FormRowCard from "@/components/forms/FormRowCard";
import {
  createAttendanceList,
  getAttendanceList,
  updateAttendanceList,
  computeAttendanceMovement,
} from "@/lib/personnelAttendanceListsApi";
import { loadOptionsByCategory } from "@/lib/personnelStandardOptionsApi";
import { emptyAttendanceListForm, emptyAttendanceParticipant } from "@/lib/personnelFormDefaults";
import { validateAttendanceList } from "@/lib/personnelValidation";
import { exportAttendanceListPdf } from "@/lib/personnelPdfExport";
import { PERSONNEL_PRESENCA_PATH } from "@/lib/personnelRoutes";
import { ATTENDANCE_RESULT_OPTIONS, ATTENDANCE_SIGNATURE_OPTIONS } from "@/lib/personnelSelectionConstants";
export default function AttendanceListEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
  const [form, setForm] = useState(emptyAttendanceListForm);
  const [employees, setEmployees] = useState([]);
  const [trainingOptions, setTrainingOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const applyMovement = (participants, overrides = {}) => {
    const m = computeAttendanceMovement(participants);
    setForm((prev) => ({
      ...prev,
      participants,
      concludes_count: overrides.concludes_count ?? m.concludes_count,
      approved_count: overrides.approved_count ?? m.approved_count,
      reproved_count: overrides.reproved_count ?? m.reproved_count,
      attendance_percentage: overrides.attendance_percentage ?? m.attendance_percentage,
    }));
  };

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    const [opts, em] = await Promise.all([
      loadOptionsByCategory(currentTenantId),
      supabase.from("employee_registrations").select("id, full_name, registration_code").eq("tenant_id", currentTenantId).order("full_name"),
    ]);
    setTrainingOptions(opts.internal_training || []);
    setEmployees(em.data || []);
    if (!isNew && id) {
      const row = await getAttendanceList(id);
      setForm({
        ...emptyAttendanceListForm(),
        ...row,
        participants: row.participants || [],
        course_date: row.course_date?.slice?.(0, 10) || "",
        document_model_issue_date: row.document_model_issue_date?.slice?.(0, 10) || "",
      });
    }
  }, [currentTenantId, id, isNew]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const updateParticipant = (idx, patch) => {
    const participants = [...(form.participants || [])];
    participants[idx] = { ...participants[idx], ...patch };
    applyMovement(participants);
  };

  const renderParticipantFields = (row, idx) => (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <Label className="text-xs">Colaborador</Label>
        <select className="w-full border rounded-md h-9 px-2 text-sm" value={row.employee_id || ""} onChange={(e) => {
          const emp = employees.find((x) => x.id === e.target.value);
          updateParticipant(idx, { employee_id: e.target.value, full_name: emp?.full_name || row.full_name });
        }}>
          <option value="">Manual</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
      </div>
      <div><Label className="text-xs">Nome *</Label><Input value={row.full_name} onChange={(e) => updateParticipant(idx, { full_name: e.target.value })} className="h-9" /></div>
      <div><Label className="text-xs">Departamento</Label><Input value={row.department} onChange={(e) => updateParticipant(idx, { department: e.target.value })} className="h-9" /></div>
      <div>
        <Label className="text-xs">Visto</Label>
        <select className="w-full border rounded-md h-9 px-2 text-sm" value={row.signature_status} onChange={(e) => updateParticipant(idx, { signature_status: e.target.value })}>
          <option value="">—</option>
          {ATTENDANCE_SIGNATURE_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <Label className="text-xs">Resultado</Label>
        <select className="w-full border rounded-md h-9 px-2 text-sm" value={row.result} onChange={(e) => updateParticipant(idx, { result: e.target.value })}>
          <option value="">—</option>
          {ATTENDANCE_RESULT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <Label className="text-xs">Frequência (%)</Label>
        <Input type="number" min={0} max={100} value={row.frequency_percentage ?? ""} onChange={(e) => updateParticipant(idx, { frequency_percentage: e.target.value === "" ? null : Number(e.target.value) })} className="h-9" />
      </div>
    </div>
  );

  const onTrainingSuggest = (label) => {
    if (!label) return;
    setForm((prev) => ({
      ...prev,
      suggested_training: label,
      course_title: prev.course_title || label,
      content_summary: prev.content_summary || `Treinamento: ${label}`,
    }));
  };

  const addBulkParticipants = () => {
    const existing = form.participants || [];
    const next = [...existing];
    let n = next.length;
    for (const empId of bulkSelected) {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) continue;
      if (next.some((p) => p.employee_id === empId)) continue;
      n += 1;
      next.push({
        ...emptyAttendanceParticipant(n),
        employee_id: emp.id,
        full_name: emp.full_name,
        order_number: n,
      });
    }
    applyMovement(next);
    setBulkOpen(false);
    setBulkSelected([]);
  };

  const save = async () => {
    const errors = validateAttendanceList(form);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      if (isNew) {
        const row = await createAttendanceList(currentTenantId, form);
        toast.success("Lista criada");
        navigate(`/pessoal/presenca/${row.id}`, { replace: true });
      } else {
        await updateAttendanceList(id, currentTenantId, form);
        toast.success("Guardado");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 min-w-0">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild><Link to={PERSONNEL_PRESENCA_PATH}><ArrowLeft size={18} /></Link></Button>
        <h1 className="text-xl font-bold">{isNew ? "Nova lista de presença" : "Editar lista de presença"}</h1>
        {!isNew && (
          <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={async () => {
            try {
              await exportAttendanceListPdf(id, currentTenant);
              toast.success("PDF gerado");
            } catch (e) { toast.error(e.message); }
          }}>
            <FilePdf size={16} className="mr-1" /> RE-6.2D
          </Button>
        )}
      </div>
      <Card><CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Curso *</Label><Input value={form.course_title} onChange={(e) => set("course_title", e.target.value)} className="h-10" /></div>
          <div><Label>Horário</Label><Input value={form.schedule} onChange={(e) => set("schedule", e.target.value)} className="h-10" /></div>
          <div><Label>Entidade Executora</Label><Input value={form.executing_entity} onChange={(e) => set("executing_entity", e.target.value)} className="h-10" /></div>
          <div><Label>Data *</Label><Input type="date" value={form.course_date} onChange={(e) => set("course_date", e.target.value)} className="h-10" /></div>
          <div><Label>Duração *</Label><Input value={form.duration_hours} onChange={(e) => set("duration_hours", e.target.value)} className="h-10" /></div>
          <div><Label>Instrutor(es) *</Label><Input value={form.instructors} onChange={(e) => set("instructors", e.target.value)} className="h-10" /></div>
        </div>

        <div>
          <Label>Sugerir a partir de treinamento interno</Label>
          <select className="w-full border rounded-md h-10 px-3 text-sm mt-1" value={form.suggested_training} onChange={(e) => onTrainingSuggest(e.target.value)}>
            <option value="">— Opcional —</option>
            {trainingOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <Label>Resumo de Conteúdo do Curso ou Palestra</Label>
          <Textarea value={form.content_summary} onChange={(e) => set("content_summary", e.target.value)} rows={4} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const p = [...(form.participants || []), emptyAttendanceParticipant((form.participants?.length || 0) + 1)];
            applyMovement(p);
          }}><Plus size={14} className="mr-1" /> Participante manual</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Users size={14} className="mr-1" /> Vários colaboradores</Button>
        </div>

        {bulkOpen && (
          <div className="border rounded-lg p-4 space-y-2 bg-slate-50">
            <Label>Selecionar colaboradores</Label>
            <div className="max-h-40 overflow-y-auto grid gap-1">
              {employees.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bulkSelected.includes(e.id)} onChange={(ev) => {
                    setBulkSelected((prev) => ev.target.checked ? [...prev, e.id] : prev.filter((x) => x !== e.id));
                  }} />
                  {e.full_name}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addBulkParticipants}>Adicionar</Button>
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <FormDynamicRows
          items={form.participants || []}
          onAdd={() => {
            const p = [...(form.participants || []), emptyAttendanceParticipant((form.participants?.length || 0) + 1)];
            applyMovement(p);
          }}
          addLabel="Adicionar participante"
          tableMinWidth="900px"
          renderMobileRow={(row, idx) => (
            <FormRowCard
              key={idx}
              index={idx}
              label={`Participante ${row.order_number || idx + 1}`}
              onRemove={() => {
                const p = form.participants.filter((_, i) => i !== idx);
                applyMovement(p);
              }}
            >
              {renderParticipantFields(row, idx)}
            </FormRowCard>
          )}
          renderTableHeader={() => (
            <>
              <th className="p-2 font-semibold">Nº</th>
              <th className="p-2 font-semibold">Nome</th>
              <th className="p-2 font-semibold">Departamento</th>
              <th className="p-2 font-semibold">Visto</th>
              <th className="p-2 font-semibold">Frequência</th>
              <th className="p-2 font-semibold">Resultado</th>
              <th className="p-2 w-16" />
            </>
          )}
          renderTableRow={(row, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{row.order_number || idx + 1}</td>
              <td className="p-2 min-w-[140px]">
                <Input value={row.full_name} onChange={(e) => updateParticipant(idx, { full_name: e.target.value })} className="h-8 text-xs" />
              </td>
              <td className="p-2"><Input value={row.department} onChange={(e) => updateParticipant(idx, { department: e.target.value })} className="h-8 text-xs" /></td>
              <td className="p-2">
                <select className="w-full border rounded h-8 px-1 text-xs" value={row.signature_status} onChange={(e) => updateParticipant(idx, { signature_status: e.target.value })}>
                  <option value="">—</option>
                  {ATTENDANCE_SIGNATURE_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="p-2">
                <Input type="number" className="h-8 text-xs w-16" value={row.frequency_percentage ?? ""} onChange={(e) => updateParticipant(idx, { frequency_percentage: e.target.value === "" ? null : Number(e.target.value) })} />
              </td>
              <td className="p-2">
                <select className="w-full border rounded h-8 px-1 text-xs" value={row.result} onChange={(e) => updateParticipant(idx, { result: e.target.value })}>
                  <option value="">—</option>
                  {ATTENDANCE_RESULT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="p-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  const p = form.participants.filter((_, i) => i !== idx);
                  applyMovement(p);
                }}>×</Button>
              </td>
            </tr>
          )}
        />

        <div className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
          <Label>Movimento Geral</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-xs">Nº de concluintes</Label><Input type="number" value={form.concludes_count} onChange={(e) => set("concludes_count", Number(e.target.value) || 0)} className="h-9" /></div>
            <div><Label className="text-xs">% de frequência</Label><Input type="number" value={form.attendance_percentage ?? ""} onChange={(e) => set("attendance_percentage", e.target.value === "" ? null : Number(e.target.value))} className="h-9" /></div>
            <div><Label className="text-xs">Aprovados</Label><Input type="number" value={form.approved_count} onChange={(e) => set("approved_count", Number(e.target.value) || 0)} className="h-9" /></div>
            <div><Label className="text-xs">Reprovados</Label><Input type="number" value={form.reproved_count} onChange={(e) => set("reproved_count", Number(e.target.value) || 0)} className="h-9" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Instrutor responsável</Label><Input value={form.instructor_responsible} onChange={(e) => set("instructor_responsible", e.target.value)} className="h-9" /></div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => applyMovement(form.participants)}>Recalcular a partir dos participantes</Button>
        </div>

        <div><Label>Observações</Label><Textarea value={form.observations} onChange={(e) => set("observations", e.target.value)} rows={2} /></div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(PERSONNEL_PRESENCA_PATH)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
