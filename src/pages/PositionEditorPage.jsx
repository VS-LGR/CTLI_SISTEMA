import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import PositionForm from "@/components/personnel/PositionForm";
import { createPosition, getPosition, updatePosition } from "@/lib/personnelPositionsApi";
import { loadOptionsByCategory } from "@/lib/personnelStandardOptionsApi";
import { validatePosition } from "@/lib/personnelValidation";
import { emptyPositionForm } from "@/lib/personnelFormDefaults";
import { normalizeAuthorityValue } from "@/lib/personnelConstants";
import { exportPositionCompetencyPdf } from "@/lib/personnelPdfExport";
import { PERSONNEL_CARGOS_PATH } from "@/lib/personnelRoutes";

export default function PositionEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
  const [form, setForm] = useState(emptyPositionForm);
  const [employees, setEmployees] = useState([]);
  const [optionsByCategory, setOptionsByCategory] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    const [opts, em] = await Promise.all([
      loadOptionsByCategory(currentTenantId),
      supabase.from("employee_registrations").select("id, full_name").eq("tenant_id", currentTenantId).order("full_name"),
    ]);
    setOptionsByCategory(opts);
    setEmployees(em.data || []);
    if (!isNew && id) {
      const row = await getPosition(id);
      setForm({
        ...emptyPositionForm(),
        ...row,
        technical_authorities: normalizeAuthorityValue(row.technical_authorities),
        managerial_authorities: normalizeAuthorityValue(row.managerial_authorities),
        analysis_approval_responsible_na: !row.analysis_approval_responsible_id,
        document_model_issue_date: row.document_model_issue_date?.slice?.(0, 10) || row.document_model_issue_date,
        inclusion_date: row.inclusion_date?.slice?.(0, 10) || row.inclusion_date,
        last_update_date: row.last_update_date?.slice?.(0, 10) || row.last_update_date,
      });
    }
  }, [currentTenantId, id, isNew]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const save = async () => {
    const errors = validatePosition(form);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const payload = {
        ...form,
        analysis_approval_responsible_id: form.analysis_approval_responsible_na ? null : form.analysis_approval_responsible_id || null,
      };
      if (isNew) {
        const row = await createPosition(currentTenantId, payload);
        toast.success("Cargo criado");
        navigate(`/pessoal/cargos/${row.id}`, { replace: true });
      } else {
        await updatePosition(id, payload);
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
        <Button variant="ghost" size="sm" asChild><Link to={PERSONNEL_CARGOS_PATH}><ArrowLeft size={18} /></Link></Button>
        <h1 className="text-xl font-bold">{isNew ? "Novo cargo" : "Editar cargo"}</h1>
        {!isNew && (
          <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={async () => {
            try {
              await exportPositionCompetencyPdf(id, currentTenant);
              toast.success("PDF gerado");
            } catch (e) { toast.error(e.message); }
          }}>
            <FilePdf size={16} className="mr-1" /> RE-6.2C
          </Button>
        )}
      </div>
      <Card><CardContent className="p-4">
        <PositionForm form={form} setForm={setForm} optionsByCategory={optionsByCategory} employees={employees} />
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(PERSONNEL_CARGOS_PATH)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
