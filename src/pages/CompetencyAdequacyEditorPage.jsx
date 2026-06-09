import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import PersonnelCompetencyFields from "@/components/personnel/PersonnelCompetencyFields";
import { createAdequacy, getAdequacy, updateAdequacy } from "@/lib/personnelAdequaciesApi";
import { getPosition, listPositions } from "@/lib/personnelPositionsApi";
import { educationLabel } from "@/lib/cadastroConstants";
import { mergePositionIntoFormFields } from "@/lib/personnelSnapshots";
import { loadOptionsByCategory } from "@/lib/personnelStandardOptionsApi";
import { validateAdequacy } from "@/lib/personnelValidation";
import { emptyAdequacyForm } from "@/lib/personnelFormDefaults";
import { normalizeAuthorityValue } from "@/lib/personnelConstants";
import { usePersonnelPrefill } from "@/hooks/usePersonnelPrefill";
import { exportAdequacyPdf } from "@/lib/personnelPdfExport";
import { personnelRegistrosPath } from "@/lib/personnelRegistrosRoutes";

export default function CompetencyAdequacyEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
  const returnTo = searchParams.get("returnTo");
  const registrosBack = returnTo || personnelRegistrosPath({ topic: "re-62a" });
  const [form, setForm] = useState(emptyAdequacyForm);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [optionsByCategory, setOptionsByCategory] = useState({});
  const [busy, setBusy] = useState(false);

  const { onEmployeeChange, onPositionChange } = usePersonnelPrefill({ employees, optionsByCategory });

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    const [opts, em, pos] = await Promise.all([
      loadOptionsByCategory(currentTenantId),
      supabase.from("employee_registrations").select("*").eq("tenant_id", currentTenantId).order("full_name"),
      listPositions(currentTenantId, { status: "ativo" }),
    ]);
    setOptionsByCategory(opts);
    setEmployees(em.data || []);
    setPositions(pos);
    if (!isNew && id) {
      const row = await getAdequacy(id);
      setForm({
        ...emptyAdequacyForm(),
        ...row,
        technical_authorities: normalizeAuthorityValue(row.technical_authorities),
        managerial_authorities: normalizeAuthorityValue(row.managerial_authorities),
        analysis_approval_responsible_na: !row.analysis_approval_responsible_id && !row.analysis_approval_responsible_name,
        admission_date: row.admission_date?.slice?.(0, 10) || "",
        last_update_date: row.last_update_date?.slice?.(0, 10) || "",
        document_model_issue_date: row.document_model_issue_date?.slice?.(0, 10) || "",
      });
    } else {
      const employeeId = searchParams.get("employee_id");
      if (employeeId && (em.data || []).some((e) => e.id === employeeId)) {
        const map = Object.fromEntries((em.data || []).map((e) => [e.id, e]));
        const emp = map[employeeId];
        const sup = emp.supervisor_id ? map[emp.supervisor_id] : null;
        const eduOpts = opts.education_level || [];
        const eduFromOpts = eduOpts.find((o) => o.label === educationLabel(emp.education_level));
        setForm((prev) => ({
          ...prev,
          employee_id: emp.id,
          registration_number: emp.registration_code || "",
          occupant_name: emp.full_name || "",
          admission_date: emp.admission_date?.slice?.(0, 10) || emp.admission_date || "",
          position_id: emp.position_id || prev.position_id || "",
          current_education: eduFromOpts?.label || educationLabel(emp.education_level),
          immediate_supervisor: sup?.full_name || prev.immediate_supervisor || "",
        }));
        if (emp.position_id) {
          try {
            const pos = await getPosition(emp.position_id);
            setForm((prev) => ({
              ...prev,
              ...mergePositionIntoFormFields(pos),
              position_title: pos.title,
              immediate_supervisor: sup?.full_name || prev.immediate_supervisor || pos.immediate_supervisor || "",
              analysis_approval_responsible_name: pos.analysis_approval_responsible?.full_name || prev.analysis_approval_responsible_name || "",
            }));
          } catch { /* ignore */ }
        }
      }
    }
  }, [currentTenantId, id, isNew, searchParams]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const save = async () => {
    const errors = validateAdequacy(form);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const payload = {
        ...form,
        analysis_approval_responsible_id: form.analysis_approval_responsible_na ? null : form.analysis_approval_responsible_id || null,
        adequacy_status: "concluida",
      };
      if (isNew) {
        await createAdequacy(currentTenantId, payload);
        toast.success("Adequação criada");
        navigate(registrosBack, { replace: true });
      } else {
        await updateAdequacy(id, currentTenantId, payload);
        toast.success("Guardado");
        if (returnTo) navigate(returnTo, { replace: true });
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
        <Button variant="ghost" size="sm" asChild><Link to={registrosBack}><ArrowLeft size={18} /></Link></Button>
        <h1 className="text-xl font-bold">{isNew ? "Nova adequação" : "Adequação de competência"}</h1>
        {!isNew && (
          <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={async () => {
            try {
              await exportAdequacyPdf(id, currentTenant);
              toast.success("PDF gerado");
            } catch (e) { toast.error(e.message); }
          }}><FilePdf size={16} className="mr-1" /> RE-6.2A</Button>
        )}
      </div>
      {returnTo && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-700">A registar adequação no fluxo de integração de pessoal.</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-blue-700" asChild>
            <Link to={returnTo}>Voltar ao fluxo</Link>
          </Button>
        </div>
      )}
      <Card><CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <select
              value={form.employee_id}
              onChange={(e) => {
                const v = e.target.value;
                setForm((p) => ({ ...p, employee_id: v }));
                onEmployeeChange(v, setForm);
              }}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">— Selecionar —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.registration_code})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Cargo *</Label>
            <select
              value={form.position_id}
              onChange={(e) => {
                const v = e.target.value;
                setForm((p) => ({ ...p, position_id: v }));
                onPositionChange(v, setForm);
              }}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">— Selecionar —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>
        <PersonnelCompetencyFields
          form={form}
          setForm={setForm}
          optionsByCategory={optionsByCategory}
          employees={employees}
        />
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(registrosBack)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
