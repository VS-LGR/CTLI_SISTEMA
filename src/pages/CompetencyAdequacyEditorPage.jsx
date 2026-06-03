import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import PersonnelCompetencyFields from "@/components/personnel/PersonnelCompetencyFields";
import { createAdequacy, getAdequacy, updateAdequacy } from "@/lib/personnelAdequaciesApi";
import { listPositions } from "@/lib/personnelPositionsApi";
import { loadOptionsByCategory } from "@/lib/personnelStandardOptionsApi";
import { validateAdequacy } from "@/lib/personnelValidation";
import { emptyAdequacyForm } from "@/lib/personnelFormDefaults";
import { normalizeAuthorityValue } from "@/lib/personnelConstants";
import { usePersonnelPrefill } from "@/hooks/usePersonnelPrefill";
import { exportAdequacyPdf } from "@/lib/personnelPdfExport";
import { PERSONNEL_ADEQUACAO_PATH } from "@/lib/personnelRoutes";

export default function CompetencyAdequacyEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
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
    }
  }, [currentTenantId, id, isNew]);

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
        const row = await createAdequacy(currentTenantId, payload);
        toast.success("Adequação criada");
        navigate(`/pessoal/adequacao/${row.id}`, { replace: true });
      } else {
        await updateAdequacy(id, currentTenantId, payload);
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
        <Button variant="ghost" size="sm" asChild><Link to={PERSONNEL_ADEQUACAO_PATH}><ArrowLeft size={18} /></Link></Button>
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
          <Button variant="outline" onClick={() => navigate(PERSONNEL_ADEQUACAO_PATH)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
