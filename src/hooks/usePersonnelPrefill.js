import { useCallback } from "react";
import { educationLabel } from "@/lib/cadastroConstants";
import { mergePositionIntoFormFields } from "@/lib/personnelSnapshots";
import { getPosition } from "@/lib/personnelPositionsApi";
import { getLastMonitoringForEmployee } from "@/lib/personnelMonitoringsApi";

function sliceDate(d) {
  return d?.slice?.(0, 10) || d || "";
}

export function usePersonnelPrefill({ employees = [], optionsByCategory = {} }) {
  const employeesById = useCallback(() => {
    const map = {};
    for (const e of employees) map[e.id] = e;
    return map;
  }, [employees]);

  const onEmployeeChange = useCallback(
    (employeeId, setForm) => {
      const map = employeesById();
      const emp = map[employeeId];
      if (!emp) return;
      const sup = emp.supervisor_id ? map[emp.supervisor_id] : null;
      const eduOpts = optionsByCategory.education_level || [];
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
      const supervisorName = sup?.full_name || "";
      if (emp.position_id) {
        getPosition(emp.position_id)
          .then((pos) => setForm((prev) => ({
            ...prev,
            ...mergePositionIntoFormFields(pos),
            position_title: pos.title,
            immediate_supervisor: supervisorName || prev.immediate_supervisor || pos.immediate_supervisor || "",
            analysis_approval_responsible_name: pos.analysis_approval_responsible?.full_name || prev.analysis_approval_responsible_name || "",
          })))
          .catch(() => {});
      }
    },
    [employeesById, optionsByCategory.education_level],
  );

  const onPositionChange = useCallback(async (positionId, setForm) => {
    if (!positionId) return;
    const pos = await getPosition(positionId);
    setForm((prev) => ({
      ...prev,
      ...mergePositionIntoFormFields(pos),
      position_title: pos.title,
      analysis_approval_responsible_id: pos.analysis_approval_responsible_id || "",
      analysis_approval_responsible_name: pos.analysis_approval_responsible?.full_name || "",
    }));
  }, []);

  const onMonitoringEmployeeChange = useCallback(
    async (employeeId, setForm, { tenantId, isNew, excludeId } = {}) => {
      onEmployeeChange(employeeId, setForm);
      if (!isNew || !tenantId || !employeeId) return null;
      try {
        const last = await getLastMonitoringForEmployee(tenantId, employeeId, { excludeId });
        if (!last) return null;
        setForm((prev) => ({
          ...prev,
          last_update_date: sliceDate(last.last_update_date) || prev.last_update_date,
          last_interlaboratory_date: sliceDate(last.last_interlaboratory_date) || prev.last_interlaboratory_date,
          last_intralaboratory_date: sliceDate(last.last_intralaboratory_date) || prev.last_intralaboratory_date,
          occupation_authorization_date: sliceDate(last.occupation_authorization_date) || prev.occupation_authorization_date,
        }));
        return last;
      } catch {
        return null;
      }
    },
    [onEmployeeChange],
  );

  return { onEmployeeChange, onPositionChange, onMonitoringEmployeeChange };
}
