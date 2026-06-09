import { supabase } from "@/lib/supabaseClient";

/**
 * Valida vínculo de seleção de origem antes de gravar colaborador.
 * @param {string} tenantId
 * @param {string | null | undefined} sourceSelectionId
 * @param {string | null | undefined} excludeEmployeeId
 */
export async function validateEmployeeSourceSelection(tenantId, sourceSelectionId, excludeEmployeeId = null) {
  if (!sourceSelectionId) return;

  const { data: selection, error: selErr } = await supabase
    .from("personnel_selections")
    .select("id, tenant_id, conclusive_opinion_approved, candidate_name")
    .eq("id", sourceSelectionId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (!selection) throw new Error("Seleção de origem não encontrada.");
  if (selection.tenant_id !== tenantId) throw new Error("Seleção de origem pertence a outro ambiente.");
  if (selection.conclusive_opinion_approved !== true) {
    throw new Error("Somente seleções com parecer aprovado podem ser vinculadas ao colaborador.");
  }

  let q = supabase
    .from("employee_registrations")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .eq("source_selection_id", sourceSelectionId);

  if (excludeEmployeeId) q = q.neq("id", excludeEmployeeId);

  const { data: linked, error: linkErr } = await q.maybeSingle();
  if (linkErr) throw linkErr;
  if (linked) {
    throw new Error(`Esta seleção já está vinculada ao colaborador ${linked.full_name}.`);
  }
}

/**
 * Seleções aprovadas disponíveis para vínculo (livres ou a do colaborador em edição).
 */
export async function listAvailableSourceSelections(tenantId, { excludeEmployeeId } = {}) {
  const [selectionsRes, employeesRes] = await Promise.all([
    supabase
      .from("personnel_selections")
      .select("id, candidate_name, vacancy, position_title, selection_date")
      .eq("tenant_id", tenantId)
      .eq("conclusive_opinion_approved", true)
      .order("selection_date", { ascending: false }),
    supabase
      .from("employee_registrations")
      .select("id, source_selection_id")
      .eq("tenant_id", tenantId)
      .not("source_selection_id", "is", null),
  ]);

  if (selectionsRes.error) throw selectionsRes.error;
  if (employeesRes.error) throw employeesRes.error;

  const takenIds = new Set(
    (employeesRes.data || [])
      .filter((e) => e.id !== excludeEmployeeId && e.source_selection_id)
      .map((e) => e.source_selection_id),
  );

  return (selectionsRes.data || []).filter((s) => !takenIds.has(s.id));
}
