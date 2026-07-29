import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function monthFromIso(iso) {
  if (!iso) return null;
  const m = Number(String(iso).slice(5, 7));
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m : null;
}

function yearFromIso(iso) {
  if (!iso) return null;
  const y = Number(String(iso).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

/** Linhas derivadas dos certificados + overrides Previsto/Realizado. */
export function buildCalibrationScheduleRows({
  weightCertificates = [],
  envCertificates = [],
  overrides = [],
  yearStart,
  yearCount = 4,
} = {}) {
  const years = Array.from({ length: yearCount }, (_, i) => yearStart + i);
  const overrideMap = new Map();
  for (const o of overrides || []) {
    const key = `${o.source}:${o.source_id}:${o.year}:${o.month}:${o.mark_kind}`;
    overrideMap.set(key, o.marked !== false);
  }

  const getMark = (source, sourceId, year, month, kind, defaultVal = false) => {
    const key = `${source}:${sourceId}:${year}:${month}:${kind}`;
    if (overrideMap.has(key)) return overrideMap.get(key);
    return defaultVal;
  };

  const rows = [];

  for (const c of weightCertificates || []) {
    const label = [c.set_name, c.certificate_number].filter(Boolean).join(" · ") || c.id;
    const dueYear = yearFromIso(c.expiry_date);
    const dueMonth = monthFromIso(c.expiry_date);
    const marks = {};
    for (const y of years) {
      marks[y] = { previsto: {}, realizado: {} };
      for (const m of MONTHS) {
        const defPrevisto = dueYear === y && dueMonth === m;
        marks[y].previsto[m] = getMark("peso", c.id, y, m, "previsto", defPrevisto);
        marks[y].realizado[m] = getMark("peso", c.id, y, m, "realizado", false);
      }
    }
    rows.push({
      source: "peso",
      sourceId: c.id,
      label,
      certificateNumber: c.certificate_number || "",
      expiryDate: c.expiry_date || null,
      marks,
      overdue: c.expiry_date && String(c.expiry_date) < new Date().toISOString().slice(0, 10),
    });
  }

  for (const c of envCertificates || []) {
    const label = [c.equipment_name, c.certificate_number].filter(Boolean).join(" · ") || c.id;
    const dueYear = yearFromIso(c.expiry_date);
    const dueMonth = monthFromIso(c.expiry_date);
    const marks = {};
    for (const y of years) {
      marks[y] = { previsto: {}, realizado: {} };
      for (const m of MONTHS) {
        const defPrevisto = dueYear === y && dueMonth === m;
        marks[y].previsto[m] = getMark("thermo", c.id, y, m, "previsto", defPrevisto);
        marks[y].realizado[m] = getMark("thermo", c.id, y, m, "realizado", false);
      }
    }
    rows.push({
      source: "thermo",
      sourceId: c.id,
      label,
      certificateNumber: c.certificate_number || "",
      expiryDate: c.expiry_date || null,
      marks,
      overdue: c.expiry_date && String(c.expiry_date) < new Date().toISOString().slice(0, 10),
    });
  }

  return { years, rows };
}

export async function listCalibrationScheduleOverrides(tenantId, yearStart, yearCount = 4) {
  if (!tenantId || !isSupabaseAuthMode) return [];
  const yearEnd = yearStart + yearCount - 1;
  const { data, error } = await supabase
    .from("calibration_schedule_overrides")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("year", yearStart)
    .lte("year", yearEnd);
  if (error) throw error;
  return data || [];
}

export async function upsertCalibrationScheduleMark({
  tenantId,
  source,
  sourceId,
  year,
  month,
  markKind,
  marked,
}) {
  if (!tenantId || !isSupabaseAuthMode) throw new Error("Supabase necessário");
  const { data, error } = await supabase
    .from("calibration_schedule_overrides")
    .upsert({
      tenant_id: tenantId,
      source,
      source_id: sourceId,
      year,
      month,
      mark_kind: markKind,
      marked: Boolean(marked),
    }, { onConflict: "tenant_id,source,source_id,year,month,mark_kind" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
