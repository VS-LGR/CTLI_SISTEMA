import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { calculateWeightItem } from "@/lib/weightCalibrationCalculations";
import { defaultValidityDate } from "@/lib/calibrationCertificates/certificateDateUtils";
import {
  INACTIVE_CERTIFICATE_STATUSES,
  canColetaGenerateOfficial,
  canTransitionCertificateStatus,
  canMarkCertificateObsolete,
  EDITABLE_CERTIFICATE_STATUSES,
} from "./weightCertificateSchema";

export function assertSupabaseWeightCertificates() {
  if (!isSupabaseAuthMode) throw new Error("Certificados de pesos requerem ligação Supabase.");
}

function parseNum(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function envAverage(initial, final) {
  const a = parseNum(initial);
  const b = parseNum(final);
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b ?? null;
}

function stripMeta(row) {
  if (!row) return {};
  const { id, certificate_id, created_at, updated_at, ...rest } = row;
  return rest;
}

async function syncPreviewOnlyFromColeta(certificate) {
  if (!certificate?.collection_id || certificate.status === "emitido") return certificate;
  const { data: coll } = await supabase
    .from("weight_calibration_collections")
    .select("workflow_status")
    .eq("id", certificate.collection_id)
    .maybeSingle();
  if (!coll) return certificate;

  const official = canColetaGenerateOfficial(coll.workflow_status);
  const patch = {};
  if (official !== !certificate.is_preview_only) {
    patch.is_preview_only = !official;
  }
  const snapStatus = certificate.collection_snapshot?.workflow_status;
  if (snapStatus !== coll.workflow_status) {
    patch.collection_snapshot = {
      ...(certificate.collection_snapshot || {}),
      workflow_status: coll.workflow_status,
    };
  }
  if (!Object.keys(patch).length) return certificate;
  await updateWeightCertificateHeader(certificate.id, patch);
  return { ...certificate, ...patch };
}

export async function suggestNextWeightCertificateNumber(tenantId, year = new Date().getFullYear()) {
  assertSupabaseWeightCertificates();
  const { data, error } = await supabase.rpc("next_weight_calibration_certificate_number", {
    p_tenant_id: tenantId,
    p_year: year,
  });
  if (error) {
    const { data: rows } = await supabase
      .from("weight_calibration_certificates")
      .select("certificate_number")
      .eq("tenant_id", tenantId)
      .eq("certificate_year", year)
      .order("certificate_number", { ascending: false })
      .limit(1);
    return (rows?.[0]?.certificate_number || 0) + 1;
  }
  return data;
}

export async function listWeightCertificates(tenantId, { status, search, type, year } = {}) {
  assertSupabaseWeightCertificates();
  let q = supabase
    .from("weight_calibration_certificates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (status && status !== "all") q = q.eq("status", status);
  if (type && type !== "all") q = q.eq("certificate_type", type);
  if (year) q = q.eq("certificate_year", Number(year));

  const { data, error } = await q;
  if (error) throw error;

  let rows = data || [];
  if (search) {
    const term = String(search).trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) => {
        const hay = [
          r.client_name,
          r.weight_tag,
          r.weight_serial,
          r.process_number,
          r.commercial_proposal_ref,
          r.certificate_number != null ? `${r.certificate_number}/${r.certificate_year}` : "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }
  }
  return rows;
}

export async function getWeightCertificate(id) {
  assertSupabaseWeightCertificates();
  const { data: cert, error } = await supabase
    .from("weight_calibration_certificates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  const [itemsRes, standardsRes, envRes, reviewsRes] = await Promise.all([
    supabase
      .from("weight_calibration_certificate_items")
      .select("*")
      .eq("certificate_id", id)
      .order("item_number"),
    supabase
      .from("weight_calibration_certificate_standards")
      .select("*")
      .eq("certificate_id", id)
      .order("sort_order"),
    supabase
      .from("weight_calibration_certificate_environmental")
      .select("*")
      .eq("certificate_id", id)
      .maybeSingle(),
    supabase
      .from("weight_calibration_certificate_reviews")
      .select("*")
      .eq("certificate_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const result = {
    ...cert,
    items: itemsRes.data || [],
    standards: standardsRes.data || [],
    environmental: envRes.data || null,
    reviews: reviewsRes.data || [],
  };
  return syncPreviewOnlyFromColeta(result);
}

async function loadCadastrosForImport(tenantId) {
  const [customers, employees] = await Promise.all([
    supabase.from("end_customer_registrations").select("*").eq("tenant_id", tenantId),
    supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId),
  ]);
  return {
    endCustomers: customers.data || [],
    employees: employees.data || [],
  };
}

/** Monta linhas de itens a partir do payload (coleta / manual). */
export function buildWeightItemsFromPayload(itens = []) {
  return (itens || [])
    .map((it, idx) => {
      const itemNumber = Number(it.item_number) || idx + 1;
      if (itemNumber < 1 || itemNumber > 24) return null;
      const hasContent =
        it.identification
        || it.nominal_value != null
        || it.reference_identification
        || (Array.isArray(it.cycles) && it.cycles.some((c) => c?.standard_reading || c?.measuring_reading));
      if (!hasContent) return null;

      return {
        item_number: itemNumber,
        identification: String(it.identification || "").trim(),
        nominal_value: parseNum(it.nominal_value),
        nominal_unit: it.nominal_unit || "g",
        reference_standard_id: it.reference_standard_id || null,
        reference_identification: String(it.reference_identification || "").trim(),
        reference_conventional_value: parseNum(it.reference_conventional_value),
        reference_uncertainty: parseNum(it.reference_uncertainty),
        reference_material: String(it.reference_material || "").trim(),
        uut_material: String(it.uut_material || "").trim(),
        uut_class: String(it.uut_class || "").trim(),
        balance_resolution: parseNum(it.balance_resolution),
        decimal_places: Number(it.decimal_places) || 2,
        cycle_count: Number(it.cycle_count) || 3,
        was_adjusted: Boolean(it.was_adjusted),
        value_before_adjustment: parseNum(it.value_before_adjustment),
        assume_class_uncertainty: it.assume_class_uncertainty !== false,
        cycle_readings: Array.isArray(it.cycles) ? it.cycles : (it.cycle_readings || []),
        notes: String(it.notes || "").trim(),
        calc_status: "pendente",
        calc_error: "",
        calculation_memory: {},
      };
    })
    .filter(Boolean);
}

/** Padrões a partir de rastreabilidade do payload. */
export function buildWeightStandardsFromPayload(rastreabilidade = {}) {
  const rows = [];
  let sort = 0;
  const pushGroup = (list, standardType) => {
    for (const s of list || []) {
      if (!s) continue;
      const identification = String(s.identificacao || s.identification_code || "").trim();
      const certNum = String(s.certificado || s.certificate_number || "").trim();
      if (!identification && !certNum) continue;
      rows.push({
        standard_type: standardType,
        standard_id: s.standard_id || s.id || null,
        identification_code: identification,
        description: String(s.description || s.descricao || "").trim(),
        certificate_number: certNum,
        calibration_date: s.calibration_date || null,
        valid_until: s.validade || s.valid_until || null,
        laboratory: String(s.laboratorio || s.laboratory || "").trim(),
        traceability: String(s.traceability || "").trim(),
        snapshot: s,
        sort_order: sort,
      });
      sort += 1;
    }
  };
  pushGroup(rastreabilidade.balancas, "balanca_laboratorio");
  pushGroup(rastreabilidade.conjuntos_peso, "peso_padrao");
  pushGroup(rastreabilidade.tbh, "termo_baro_higrometro");
  pushGroup(rastreabilidade.outros, "outro");
  return rows;
}

export function buildWeightEnvironmentalFromPayload(ambiente = {}, extras = {}) {
  const initial_temperature = String(ambiente.temp_inicial ?? ambiente.initial_temperature ?? "").trim();
  const final_temperature = String(ambiente.temp_final ?? ambiente.final_temperature ?? "").trim();
  const initial_humidity = String(ambiente.ur_inicial ?? ambiente.initial_humidity ?? "").trim();
  const final_humidity = String(ambiente.ur_final ?? ambiente.final_humidity ?? "").trim();
  const initial_pressure = String(ambiente.pressao_inicial ?? ambiente.initial_pressure ?? "").trim();
  const final_pressure = String(ambiente.pressao_final ?? ambiente.final_pressure ?? "").trim();

  return {
    initial_temperature,
    final_temperature,
    initial_humidity,
    final_humidity,
    initial_pressure,
    final_pressure,
    mean_temperature: envAverage(initial_temperature, final_temperature),
    mean_humidity: envAverage(initial_humidity, final_humidity),
    mean_pressure: envAverage(initial_pressure, final_pressure),
    air_density: extras.air_density ?? null,
    notes: String(ambiente.notes || extras.notes || "").trim(),
    snapshot: ambiente || {},
  };
}

function headerFromPayload(payload = {}, opts = {}) {
  const cliente = payload.cliente || {};
  const geral = payload.geral || {};
  return {
    client_name: opts.clientName || String(cliente.solicitante || "").trim(),
    contractor_name: String(cliente.contratante || "").trim(),
    weight_tag: opts.weightTag || String(geral.identificacao || "").trim(),
    weight_serial: String(geral.serie || "").trim(),
    weight_class: String(geral.classe || "").trim(),
    manufacturer: String(geral.fabricante || "").trim(),
    process_number: String(geral.processo_numero || "").trim(),
    commercial_proposal_ref: opts.commercialProposalRef || String(geral.processo_numero || "").trim(),
    calibration_date: opts.calibrationDate || geral.data_calibracao || null,
    calibration_location: opts.calibrationLocation || "",
    was_adjusted: geral.foi_ajuste || "nao",
    display_rows: Number(geral.qtde_linhas) || 2,
    observation_1: String(geral.obs1 || "").trim(),
    observation_2: String(geral.obs2 || "").trim(),
    observation_3: String(geral.obs3 || "").trim(),
    instrument_descriptions: Array.isArray(payload.peso_descricoes) ? payload.peso_descricoes : [],
    executor_name: String(payload.executores || opts.executorName || "").trim(),
  };
}

async function insertWeightCertificateBundle(tenantId, bundle, { userId, certificateNumber }) {
  const { data: cert, error: certErr } = await supabase
    .from("weight_calibration_certificates")
    .insert({
      tenant_id: tenantId,
      ...bundle.certificate,
      certificate_number: certificateNumber,
      created_by: userId || null,
      updated_by: userId || null,
    })
    .select()
    .single();
  if (certErr) throw certErr;

  const certId = cert.id;

  if (bundle.items?.length) {
    const { error: itemErr } = await supabase
      .from("weight_calibration_certificate_items")
      .insert(bundle.items.map((p) => ({ ...p, certificate_id: certId })));
    if (itemErr) throw itemErr;
  }

  if (bundle.standards?.length) {
    const { error: stErr } = await supabase
      .from("weight_calibration_certificate_standards")
      .insert(bundle.standards.map((s) => ({ ...s, certificate_id: certId })));
    if (stErr) throw stErr;
  }

  if (bundle.environmental) {
    const { error: envErr } = await supabase
      .from("weight_calibration_certificate_environmental")
      .insert({ ...bundle.environmental, certificate_id: certId });
    if (envErr) throw envErr;
  }

  return certId;
}

function buildBundleFromPayload({
  payload,
  certificateType,
  certificateYear,
  collectionId = null,
  collectionSnapshot = {},
  isPreviewOnly = false,
  endCustomerId = null,
  executorId = null,
  signatoryId = null,
  validityDate = null,
}) {
  const header = headerFromPayload(payload);
  return {
    certificate: {
      collection_id: collectionId,
      certificate_year: certificateYear,
      certificate_revision: "00",
      certificate_type: certificateType || "rastreavel",
      status: "rascunho",
      end_customer_id: endCustomerId,
      executor_id: executorId,
      signatory_id: signatoryId,
      ...header,
      validity_date: validityDate || defaultValidityDate(header.calibration_date),
      is_preview_only: isPreviewOnly,
      collection_snapshot: collectionSnapshot,
      control_snapshot: { executores: payload?.executores || "" },
      technical_snapshot: {},
      document_snapshot: {},
    },
    items: buildWeightItemsFromPayload(payload?.itens || []),
    standards: buildWeightStandardsFromPayload(payload?.rastreabilidade || {}),
    environmental: buildWeightEnvironmentalFromPayload(payload?.ambiente || {}),
  };
}

export async function createWeightCertificateManual({
  tenantId,
  userId,
  payload,
  certificateType = "rastreavel",
  endCustomerId = null,
  executorId = null,
  signatoryId = null,
  calibrationDate = null,
  commercialProposalRef = "",
} = {}) {
  assertSupabaseWeightCertificates();
  if (!tenantId) throw new Error("tenantId é obrigatório");

  const calDate = calibrationDate || payload?.geral?.data_calibracao || new Date().toISOString().slice(0, 10);
  const year = new Date(calDate).getFullYear();
  const nextNum = await suggestNextWeightCertificateNumber(tenantId, year);

  const bundle = buildBundleFromPayload({
    payload: payload || {},
    certificateType,
    certificateYear: year,
    collectionId: null,
    collectionSnapshot: { source: "manual", payload: payload || {} },
    isPreviewOnly: false,
    endCustomerId,
    executorId,
    signatoryId,
  });

  if (commercialProposalRef) {
    bundle.certificate.commercial_proposal_ref = commercialProposalRef;
  }
  if (calibrationDate) {
    bundle.certificate.calibration_date = calibrationDate;
  }

  const certId = await insertWeightCertificateBundle(tenantId, bundle, {
    userId,
    certificateNumber: nextNum,
  });

  let recalcWarning = null;
  try {
    await recalculateWeightCertificate(certId);
  } catch (e) {
    recalcWarning = e?.message || "Cálculo não concluído automaticamente";
  }

  return {
    certificate: await getWeightCertificate(certId),
    recalcWarning,
  };
}

export async function createWeightCertificateFromColeta({
  tenantId,
  userId,
  collectionId,
  certificateType = "rastreavel",
} = {}) {
  assertSupabaseWeightCertificates();
  if (!tenantId || !collectionId) throw new Error("tenantId e collectionId são obrigatórios");

  const { data: collection, error: collErr } = await supabase
    .from("weight_calibration_collections")
    .select("*")
    .eq("id", collectionId)
    .single();
  if (collErr) throw collErr;
  if (collection.tenant_id !== tenantId) throw new Error("Coleta não pertence a este ambiente.");

  const { data: existing } = await supabase
    .from("weight_calibration_certificates")
    .select("id, status")
    .eq("collection_id", collectionId);
  const active = (existing || []).find((c) => !INACTIVE_CERTIFICATE_STATUSES.includes(c.status));
  if (active) throw new Error("Já existe certificado ativo para esta coleta.");

  const workflowStatus = collection.workflow_status || "rascunho";
  const isOfficial = canColetaGenerateOfficial(workflowStatus);
  const isPreviewOnly = !isOfficial;

  const calDate = collection.calibration_date || collection.payload?.geral?.data_calibracao;
  const year = calDate ? new Date(calDate).getFullYear() : new Date().getFullYear();
  const nextNum = await suggestNextWeightCertificateNumber(tenantId, year);

  const payload = collection.payload || {};
  const bundle = buildBundleFromPayload({
    payload,
    certificateType,
    certificateYear: year,
    collectionId,
    collectionSnapshot: {
      id: collection.id,
      workflow_status: workflowStatus,
      payload,
    },
    isPreviewOnly,
  });

  bundle.certificate.client_name = collection.client_name || bundle.certificate.client_name;
  bundle.certificate.weight_tag = collection.weight_tag || bundle.certificate.weight_tag;
  bundle.certificate.calibration_date = collection.calibration_date || bundle.certificate.calibration_date;
  bundle.certificate.commercial_proposal_ref =
    collection.commercial_proposal_ref || bundle.certificate.commercial_proposal_ref;

  const certId = await insertWeightCertificateBundle(tenantId, bundle, {
    userId,
    certificateNumber: nextNum,
  });

  await supabase
    .from("weight_calibration_collections")
    .update({ certificate_id: certId })
    .eq("id", collectionId);

  let recalcWarning = null;
  try {
    await recalculateWeightCertificate(certId);
  } catch (e) {
    recalcWarning = e?.message || "Cálculo não concluído automaticamente";
  }

  return {
    certificate: await getWeightCertificate(certId),
    recalcWarning,
    isPreviewOnly,
  };
}

export async function updateWeightCertificateHeader(id, patch, userId) {
  assertSupabaseWeightCertificates();
  const { error } = await supabase
    .from("weight_calibration_certificates")
    .update({ ...patch, updated_by: userId || null })
    .eq("id", id);
  if (error) throw error;
}

export async function replaceWeightCertificateItems(certificateId, items = []) {
  assertSupabaseWeightCertificates();
  const { error: delErr } = await supabase
    .from("weight_calibration_certificate_items")
    .delete()
    .eq("certificate_id", certificateId);
  if (delErr) throw delErr;

  if (!items.length) return [];

  const rows = items.map((it, idx) => {
    const { id: _id, certificate_id: _c, created_at, updated_at, ...rest } = it;
    return {
      ...rest,
      certificate_id: certificateId,
      item_number: rest.item_number || idx + 1,
    };
  });

  const { data, error } = await supabase
    .from("weight_calibration_certificate_items")
    .insert(rows)
    .select();
  if (error) throw error;
  return data || [];
}

export async function replaceWeightCertificateStandards(certificateId, standards = []) {
  assertSupabaseWeightCertificates();
  const { error: delErr } = await supabase
    .from("weight_calibration_certificate_standards")
    .delete()
    .eq("certificate_id", certificateId);
  if (delErr) throw delErr;

  if (!standards.length) return [];

  const rows = standards.map((s, idx) => {
    const { id: _id, certificate_id: _c, created_at, updated_at, ...rest } = s;
    return {
      ...rest,
      certificate_id: certificateId,
      sort_order: rest.sort_order ?? idx,
    };
  });

  const { data, error } = await supabase
    .from("weight_calibration_certificate_standards")
    .insert(rows)
    .select();
  if (error) throw error;
  return data || [];
}

export async function upsertWeightCertificateEnvironmental(certificateId, env = {}) {
  assertSupabaseWeightCertificates();
  const row = {
    certificate_id: certificateId,
    initial_temperature: String(env.initial_temperature ?? "").trim(),
    final_temperature: String(env.final_temperature ?? "").trim(),
    initial_humidity: String(env.initial_humidity ?? "").trim(),
    final_humidity: String(env.final_humidity ?? "").trim(),
    initial_pressure: String(env.initial_pressure ?? "").trim(),
    final_pressure: String(env.final_pressure ?? "").trim(),
    mean_temperature: env.mean_temperature ?? envAverage(env.initial_temperature, env.final_temperature),
    mean_humidity: env.mean_humidity ?? envAverage(env.initial_humidity, env.final_humidity),
    mean_pressure: env.mean_pressure ?? envAverage(env.initial_pressure, env.final_pressure),
    air_density: env.air_density ?? null,
    notes: String(env.notes || "").trim(),
    snapshot: env.snapshot || {},
  };

  const { data: existing } = await supabase
    .from("weight_calibration_certificate_environmental")
    .select("id")
    .eq("certificate_id", certificateId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("weight_calibration_certificate_environmental")
      .update(row)
      .eq("certificate_id", certificateId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("weight_calibration_certificate_environmental")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

function itemCalcInput(item, environmental) {
  const env = environmental || {};
  return {
    identification: item.identification,
    nominal_value: item.nominal_value,
    nominal_unit: item.nominal_unit || "g",
    reference_conventional_value: item.reference_conventional_value,
    reference_uncertainty: item.reference_uncertainty,
    reference_material: item.reference_material,
    uut_material: item.uut_material,
    uut_class: item.uut_class,
    balance_resolution: item.balance_resolution,
    decimal_places: item.decimal_places,
    cycle_count: item.cycle_count,
    was_adjusted: item.was_adjusted,
    value_before_adjustment: item.value_before_adjustment,
    assume_class_uncertainty: item.assume_class_uncertainty !== false,
    cycles: item.cycle_readings || [],
    ambient_temp: env.mean_temperature ?? envAverage(env.initial_temperature, env.final_temperature),
    ambient_humidity: env.mean_humidity ?? envAverage(env.initial_humidity, env.final_humidity),
    ambient_pressure: env.mean_pressure ?? envAverage(env.initial_pressure, env.final_pressure),
  };
}

export async function recalculateWeightCertificate(id) {
  let full = await getWeightCertificate(id);
  full = await syncPreviewOnlyFromColeta(full);

  if (!["rascunho", "calculado", "em_revisao_tecnica", "reprovado"].includes(full.status)) {
    throw new Error("Certificado bloqueado para recálculo.");
  }
  if (!full.items?.length) {
    throw new Error("Certificado sem itens para calcular.");
  }

  for (const item of full.items) {
    if (!item.id) continue;
    try {
      const result = calculateWeightItem(itemCalcInput(item, full.environmental));
      const { error } = await supabase
        .from("weight_calibration_certificate_items")
        .update({
          conventional_value: result.conventionalValue ?? null,
          deviation: result.deviation ?? null,
          expanded_uncertainty: result.expandedUncertainty ?? result.roundedUncertainty ?? null,
          coverage_factor: result.coverageFactor ?? null,
          degrees_of_freedom: result.degreesOfFreedom ?? null,
          class_uncertainty: result.classUncertainty ?? null,
          specific_density: result.specificDensity ?? null,
          approved: result.approved ?? null,
          conformity_result: result.conformity_result || "nao_avaliado",
          value_after_adjustment: result.correctedValue ?? result.conventionalValue ?? null,
          calculation_memory: result.calculation_memory || {},
          calc_status: result.calc_status || "calculado",
          calc_error: result.calc_error || "",
        })
        .eq("id", item.id);
      if (error) throw error;
    } catch (e) {
      await supabase
        .from("weight_calibration_certificate_items")
        .update({
          calc_status: "erro",
          calc_error: e?.message || String(e),
        })
        .eq("id", item.id);
    }
  }

  if (full.status === "rascunho") {
    await updateWeightCertificateHeader(id, { status: "calculado" });
  } else if (full.status !== "calculado") {
    await updateWeightCertificateHeader(id, { status: "calculado" });
  }

  return getWeightCertificate(id);
}

export async function transitionWeightCertificateStatus(
  id,
  toStatus,
  { userId, notes, checklist, employeeId } = {},
) {
  const full = await getWeightCertificate(id);
  if (!canTransitionCertificateStatus(full.status, toStatus)) {
    throw new Error(`Transição inválida: ${full.status} → ${toStatus}`);
  }

  if (toStatus === "aguardando_aprovacao") {
    if (full.is_preview_only) {
      throw new Error("Prévia técnica não pode seguir para aprovação oficial — confira a coleta primeiro");
    }
    await supabase.from("weight_calibration_certificate_reviews").insert({
      certificate_id: id,
      review_type: "analise_critica",
      checklist: checklist || {},
      notes: notes || "",
      reviewed_by: userId || null,
    });
  }

  if (toStatus === "aprovado") {
    const cad = await loadCadastrosForImport(full.tenant_id);
    const signatory = cad.employees.find((e) => e.id === (employeeId || full.signatory_id));
    await supabase.from("weight_calibration_certificate_reviews").insert({
      certificate_id: id,
      review_type: "aprovacao",
      notes: notes || "",
      reviewed_by: userId || null,
      employee_id: employeeId || full.signatory_id,
    });
    await updateWeightCertificateHeader(id, {
      status: toStatus,
      approval_date: new Date().toISOString().slice(0, 10),
      approval_notes: notes || "",
      signatory_id: employeeId || full.signatory_id || null,
      signatory_name: signatory?.full_name || full.signatory_name || "",
    }, userId);
    return getWeightCertificate(id);
  }

  if (toStatus === "reprovado") {
    await supabase.from("weight_calibration_certificate_reviews").insert({
      certificate_id: id,
      review_type: "reprovacao",
      notes: notes || "",
      reviewed_by: userId || null,
    });
  }

  await updateWeightCertificateHeader(id, { status: toStatus }, userId);
  const updated = await getWeightCertificate(id);

  if (toStatus === "aguardando_aprovacao") {
    try {
      const { notifyWeightSignatoryPendingApproval } = await import("./weightCertificateEmailApi");
      await notifyWeightSignatoryPendingApproval(updated, { tenantId: updated.tenant_id });
    } catch {
      /* notificação opcional */
    }
  }

  return updated;
}

export async function bulkApproveWeightCertificates(ids, userId, notes = "") {
  assertSupabaseWeightCertificates();
  if (!ids?.length) return { approved: 0, ids: [] };

  const { data, error } = await supabase.rpc("approve_weight_calibration_certificates", {
    p_certificate_ids: ids,
    p_user_id: userId || null,
    p_notes: notes || "",
  });
  if (error) throw error;

  return { approved: Number(data) || 0, ids };
}

export async function emitWeightCertificate(id, userId, { documentMeta, fileName } = {}) {
  const full = await getWeightCertificate(id);
  if (!canTransitionCertificateStatus(full.status, "emitido")) {
    throw new Error(`Transição inválida: ${full.status} → emitido`);
  }
  if (full.is_preview_only) {
    throw new Error("Prévia técnica não pode ser emitida oficialmente.");
  }
  if (!full.items?.length) {
    throw new Error("Certificado sem itens — não é possível emitir.");
  }
  if (full.items.some((i) => i.calc_status === "erro")) {
    throw new Error("Há itens com erro de cálculo. Recalcule antes de emitir.");
  }

  const cad = await loadCadastrosForImport(full.tenant_id);
  const executor = cad.employees.find((e) => e.id === full.executor_id);
  const signatory = cad.employees.find((e) => e.id === full.signatory_id);
  const endCustomer = cad.endCustomers.find((c) => c.id === full.end_customer_id);

  const technicalSnapshot = {
    frozenAt: new Date().toISOString(),
    clientSnapshot: endCustomer
      ? {
        id: endCustomer.id,
        name: endCustomer.name,
        email: endCustomer.email,
        cnpj: endCustomer.cnpj,
      }
      : { name: full.client_name },
    executorSnapshot: executor
      ? {
        id: executor.id,
        full_name: executor.full_name,
        signature_storage_path: executor.signature_storage_path,
      }
      : { full_name: full.executor_name },
    signatorySnapshot: signatory
      ? {
        id: signatory.id,
        full_name: signatory.full_name,
        signature_storage_path: signatory.signature_storage_path,
      }
      : { full_name: full.signatory_name },
    items: full.items,
    standards: full.standards,
    environmental: full.environmental,
  };

  const documentSnapshot = documentMeta
    ? {
      documentCode: documentMeta.code,
      documentTitle: documentMeta.title,
      documentReference: documentMeta.reference,
      documentRevision: documentMeta.revision,
      documentIssueDate: documentMeta.modelIssueDate,
      documentTemplateKey: documentMeta.templateKey,
      certificateObservations: documentMeta.certificateObservations || null,
      exportFileName: fileName,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
    }
    : {
      ...(full.document_snapshot || {}),
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
    };

  await updateWeightCertificateHeader(id, {
    status: "emitido",
    issue_date: new Date().toISOString().slice(0, 10),
    validity_date: full.validity_date || defaultValidityDate(full.calibration_date),
    emitted_by: userId || null,
    is_preview_only: false,
    signatory_name: signatory?.full_name || full.signatory_name || "",
    executor_name: executor?.full_name || full.executor_name || "",
    technical_snapshot: technicalSnapshot,
    document_snapshot: documentSnapshot,
  }, userId);

  if (full.collection_id) {
    await supabase
      .from("weight_calibration_collections")
      .update({
        workflow_status: "certificado_gerado",
        certificate_id: id,
      })
      .eq("id", full.collection_id);
  }

  return getWeightCertificate(id);
}

export async function substituteWeightCertificate(id, { userId, reason, certificateType } = {}) {
  const original = await getWeightCertificate(id);
  if (original.status !== "emitido") {
    throw new Error("Somente certificados emitidos podem ser substituídos.");
  }

  const year = original.certificate_year;
  const nextNum = await suggestNextWeightCertificateNumber(original.tenant_id, year);
  const rev = String(Number(original.certificate_revision || "0") + 1).padStart(2, "0");

  const { data: newCert, error } = await supabase
    .from("weight_calibration_certificates")
    .insert({
      tenant_id: original.tenant_id,
      collection_id: original.collection_id,
      certificate_number: nextNum,
      certificate_year: year,
      certificate_revision: rev,
      certificate_type: certificateType || original.certificate_type,
      status: "rascunho",
      end_customer_id: original.end_customer_id,
      executor_id: original.executor_id,
      signatory_id: original.signatory_id,
      client_name: original.client_name,
      contractor_name: original.contractor_name,
      weight_tag: original.weight_tag,
      weight_serial: original.weight_serial,
      weight_class: original.weight_class,
      manufacturer: original.manufacturer,
      process_number: original.process_number,
      commercial_proposal_ref: original.commercial_proposal_ref,
      calibration_date: original.calibration_date,
      validity_date: original.validity_date,
      calibration_location: original.calibration_location,
      was_adjusted: original.was_adjusted,
      display_rows: original.display_rows,
      observation_1: original.observation_1,
      observation_2: original.observation_2,
      observation_3: original.observation_3,
      instrument_descriptions: original.instrument_descriptions,
      replaces_certificate_id: id,
      replacement_reason: reason || "",
      collection_snapshot: original.collection_snapshot,
      control_snapshot: original.control_snapshot,
      executor_name: original.executor_name,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  const newId = newCert.id;

  if (original.items?.length) {
    await supabase.from("weight_calibration_certificate_items").insert(
      original.items.map((row) => ({ ...stripMeta(row), certificate_id: newId })),
    );
  }
  if (original.standards?.length) {
    await supabase.from("weight_calibration_certificate_standards").insert(
      original.standards.map((row) => ({ ...stripMeta(row), certificate_id: newId })),
    );
  }
  if (original.environmental) {
    await supabase
      .from("weight_calibration_certificate_environmental")
      .insert({ ...stripMeta(original.environmental), certificate_id: newId });
  }

  await updateWeightCertificateHeader(id, { status: "substituido" }, userId);
  await supabase.from("weight_calibration_certificate_reviews").insert({
    certificate_id: id,
    review_type: "substituicao",
    notes: reason || "",
    reviewed_by: userId || null,
  });

  return getWeightCertificate(newId);
}

export async function cancelWeightCertificate(id, { userId, reason } = {}) {
  const full = await getWeightCertificate(id);
  if (full.status === "cancelado") throw new Error("Certificado já cancelado.");
  if (!canTransitionCertificateStatus(full.status, "cancelado")) {
    throw new Error(`Não é possível cancelar certificado com status ${full.status}`);
  }

  await updateWeightCertificateHeader(id, {
    status: "cancelado",
    cancellation_reason: reason || "",
    cancelled_at: new Date().toISOString(),
    cancelled_by: userId || null,
  }, userId);

  await supabase.from("weight_calibration_certificate_reviews").insert({
    certificate_id: id,
    review_type: "cancelamento",
    notes: reason || "",
    reviewed_by: userId || null,
  });

  if (full.collection_id) {
    await supabase
      .from("weight_calibration_collections")
      .update({ workflow_status: "conferida", certificate_id: null })
      .eq("id", full.collection_id);
  }

  return getWeightCertificate(id);
}

export async function markWeightCertificateObsolete(id, { userId, reason } = {}) {
  const full = await getWeightCertificate(id);
  if (full.status === "obsoleto") throw new Error("Certificado já está obsoleto.");
  if (!canMarkCertificateObsolete(full.status)) {
    if (full.status === "emitido") {
      throw new Error("Certificado emitido deve ser cancelado ou substituído antes de marcar como obsoleto.");
    }
    throw new Error(`Não é possível marcar como obsoleto com status ${full.status}.`);
  }
  if (!canTransitionCertificateStatus(full.status, "obsoleto")) {
    throw new Error(`Transição inválida: ${full.status} → obsoleto`);
  }

  await updateWeightCertificateHeader(id, {
    status: "obsoleto",
    cancellation_reason: reason || full.cancellation_reason || "",
  }, userId);

  await supabase.from("weight_calibration_certificate_reviews").insert({
    certificate_id: id,
    review_type: "cancelamento",
    notes: reason ? `Obsoleto: ${reason}` : "Marcado como obsoleto",
    reviewed_by: userId || null,
  });

  if (full.collection_id) {
    await supabase
      .from("weight_calibration_collections")
      .update({ certificate_id: null, workflow_status: "conferida" })
      .eq("id", full.collection_id);
  }

  return getWeightCertificate(id);
}

/** Remove apenas certificados em estados de rascunho/edição. */
export async function deleteWeightCertificate(id, { tenantId } = {}) {
  const full = await getWeightCertificate(id);
  if (tenantId && full.tenant_id !== tenantId) {
    throw new Error("Certificado não pertence a este ambiente.");
  }
  const draftLike = EDITABLE_CERTIFICATE_STATUSES.includes(full.status);
  if (!draftLike) {
    throw new Error(
      "Somente certificados em rascunho/edição podem ser excluídos. Cancele ou marque como obsoleto os demais.",
    );
  }

  const collectionId = full.collection_id;
  const { error } = await supabase.from("weight_calibration_certificates").delete().eq("id", id);
  if (error) throw error;

  if (collectionId) {
    await supabase
      .from("weight_calibration_collections")
      .update({ certificate_id: null })
      .eq("id", collectionId)
      .eq("certificate_id", id);
  }

  return { id };
}

export async function duplicateWeightCertificate(id, { userId } = {}) {
  const full = await getWeightCertificate(id);
  const nextNum = await suggestNextWeightCertificateNumber(full.tenant_id, full.certificate_year);

  const { data: newCert, error } = await supabase
    .from("weight_calibration_certificates")
    .insert({
      tenant_id: full.tenant_id,
      collection_id: null,
      certificate_number: nextNum,
      certificate_year: full.certificate_year,
      certificate_revision: "00",
      certificate_type: full.certificate_type,
      status: "rascunho",
      end_customer_id: full.end_customer_id,
      executor_id: full.executor_id,
      client_name: full.client_name,
      contractor_name: full.contractor_name,
      weight_tag: full.weight_tag,
      weight_serial: full.weight_serial,
      weight_class: full.weight_class,
      manufacturer: full.manufacturer,
      process_number: full.process_number,
      commercial_proposal_ref: full.commercial_proposal_ref,
      calibration_date: full.calibration_date,
      validity_date: full.validity_date,
      calibration_location: full.calibration_location,
      was_adjusted: full.was_adjusted,
      display_rows: full.display_rows,
      observation_1: full.observation_1,
      observation_2: full.observation_2,
      observation_3: full.observation_3,
      instrument_descriptions: full.instrument_descriptions,
      collection_snapshot: full.collection_snapshot,
      control_snapshot: full.control_snapshot,
      executor_name: full.executor_name,
      is_preview_only: true,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  const newId = newCert.id;
  if (full.items?.length) {
    await supabase.from("weight_calibration_certificate_items").insert(
      full.items.map((row) => ({
        ...stripMeta(row),
        certificate_id: newId,
        calc_status: "pendente",
        calc_error: "",
        calculation_memory: {},
        conventional_value: null,
        deviation: null,
        expanded_uncertainty: null,
        approved: null,
        conformity_result: "nao_avaliado",
      })),
    );
  }
  if (full.standards?.length) {
    await supabase.from("weight_calibration_certificate_standards").insert(
      full.standards.map((row) => ({ ...stripMeta(row), certificate_id: newId })),
    );
  }
  if (full.environmental) {
    await supabase
      .from("weight_calibration_certificate_environmental")
      .insert({ ...stripMeta(full.environmental), certificate_id: newId });
  }

  return getWeightCertificate(newId);
}

export async function listWeightColetasForCertificate(tenantId) {
  const { data, error } = await supabase
    .from("weight_calibration_collections")
    .select(
      "id, client_name, weight_tag, calibration_date, workflow_status, commercial_proposal_ref, certificate_id",
    )
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const coletas = (data || []).filter((c) => c.workflow_status !== "cancelada");
  const geradoIds = coletas
    .filter((c) => c.workflow_status === "certificado_gerado")
    .map((c) => c.id);
  if (!geradoIds.length) {
    return coletas.filter((c) => c.workflow_status !== "certificado_gerado");
  }

  const { data: certs } = await supabase
    .from("weight_calibration_certificates")
    .select("collection_id, status")
    .in("collection_id", geradoIds);

  const activeCertByCollection = new Set(
    (certs || [])
      .filter((c) => !INACTIVE_CERTIFICATE_STATUSES.includes(c.status))
      .map((c) => c.collection_id),
  );

  return coletas.filter((c) => {
    if (c.workflow_status !== "certificado_gerado") return true;
    return !activeCertByCollection.has(c.id);
  });
}

export { canColetaGenerateOfficial };
