import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { buildImportFromColeta } from "./importFromColeta";
import { buildTechnicalSnapshot } from "./certificateSnapshots";
import { validateBeforeCalculate, validateBeforeEmit, validateBeforeApproval } from "./certificateValidation";
import { canTransitionCertificateStatus, canColetaGenerateOfficial } from "./certificateSchema";
import { calculateCertificatePoints, calculateConformityForCertificate } from "@/lib/certificateCalculations";

export function assertSupabaseCertificates() {
  if (!isSupabaseAuthMode) throw new Error("Certificados requerem ligação Supabase.");
}

export async function suggestNextCertificateNumber(tenantId, year = new Date().getFullYear()) {
  assertSupabaseCertificates();
  const { data, error } = await supabase.rpc("next_calibration_certificate_number", {
    p_tenant_id: tenantId,
    p_year: year,
  });
  if (error) {
    const { data: rows } = await supabase
      .from("calibration_certificates")
      .select("certificate_number")
      .eq("tenant_id", tenantId)
      .eq("certificate_year", year)
      .order("certificate_number", { ascending: false })
      .limit(1);
    return (rows?.[0]?.certificate_number || 0) + 1;
  }
  return data;
}

export async function listCertificates(tenantId, filters = {}) {
  assertSupabaseCertificates();
  let q = supabase
    .from("calibration_certificates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.type && filters.type !== "all") q = q.eq("certificate_type", filters.type);
  if (filters.year) q = q.eq("certificate_year", Number(filters.year));
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getCertificate(id) {
  assertSupabaseCertificates();
  const { data: cert, error } = await supabase
    .from("calibration_certificates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  const [pointsRes, standardsRes, envRes, confRes, reviewsRes] = await Promise.all([
    supabase.from("calibration_certificate_points").select("*").eq("certificate_id", id).order("point_number"),
    supabase.from("calibration_certificate_standards").select("*").eq("certificate_id", id),
    supabase.from("calibration_certificate_environmental").select("*").eq("certificate_id", id).maybeSingle(),
    supabase.from("calibration_certificate_conformity").select("*").eq("certificate_id", id).maybeSingle(),
    supabase.from("calibration_certificate_reviews").select("*").eq("certificate_id", id).order("created_at", { ascending: false }),
  ]);

  return {
    ...cert,
    points: pointsRes.data || [],
    standards: standardsRes.data || [],
    environmental: envRes.data || null,
    conformity: confRes.data || null,
    reviews: reviewsRes.data || [],
  };
}

async function loadCadastrosForImport(tenantId) {
  const [customers, weights, weightCerts, envCerts, employees] = await Promise.all([
    supabase.from("end_customer_registrations").select("*").eq("tenant_id", tenantId),
    supabase.from("standard_weight_items").select("*").eq("tenant_id", tenantId).eq("active", true),
    supabase.from("weight_standard_certificates").select("*").eq("tenant_id", tenantId),
    supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tenantId),
    supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId),
  ]);
  return {
    endCustomers: customers.data || [],
    weightItems: weights.data || [],
    weightCerts: weightCerts.data || [],
    envCerts: envCerts.data || [],
    employees: employees.data || [],
  };
}

export async function createCertificateFromColeta(tenantId, collectionId, { certificateType = "rastreavel", userId } = {}) {
  assertSupabaseCertificates();

  const { data: collection, error: collErr } = await supabase
    .from("scale_calibration_collections")
    .select("*")
    .eq("id", collectionId)
    .single();
  if (collErr) throw collErr;

  const { data: existing } = await supabase
    .from("calibration_certificates")
    .select("id, status")
    .eq("collection_id", collectionId);
  const active = (existing || []).find((c) => !["cancelado", "substituido"].includes(c.status));
  if (active) throw new Error("Já existe certificado ativo para esta coleta.");

  const cadastros = await loadCadastrosForImport(tenantId);
  const calDate = collection.calibration_date || collection.payload?.controle?.data_calibracao;
  const year = calDate ? new Date(calDate).getFullYear() : new Date().getFullYear();
  const nextNum = await suggestNextCertificateNumber(tenantId, year);

  const imported = buildImportFromColeta({
    collectionRow: collection,
    ...cadastros,
    certificateType,
    certificateYear: year,
    certificateNumber: nextNum,
  });

  const { data: cert, error: certErr } = await supabase
    .from("calibration_certificates")
    .insert({
      tenant_id: tenantId,
      ...imported.certificate,
      certificate_number: nextNum,
      created_by: userId || null,
      updated_by: userId || null,
    })
    .select()
    .single();
  if (certErr) throw certErr;

  const certId = cert.id;

  if (imported.points.length) {
    const { error: ptErr } = await supabase.from("calibration_certificate_points").insert(
      imported.points.map((p) => ({ ...p, certificate_id: certId })),
    );
    if (ptErr) throw ptErr;
  }

  if (imported.standards.length) {
    const { error: stErr } = await supabase.from("calibration_certificate_standards").insert(
      imported.standards.map((s) => ({ ...s, certificate_id: certId })),
    );
    if (stErr) throw stErr;
  }

  const { error: envErr } = await supabase.from("calibration_certificate_environmental").insert({
    ...imported.environmental,
    certificate_id: certId,
  });
  if (envErr) throw envErr;

  const { error: confErr } = await supabase.from("calibration_certificate_conformity").insert({
    ...imported.conformity,
    certificate_id: certId,
  });
  if (confErr) throw confErr;

  return getCertificate(certId);
}

export async function updateCertificateHeader(id, patch, userId) {
  assertSupabaseCertificates();
  const { error } = await supabase
    .from("calibration_certificates")
    .update({ ...patch, updated_by: userId || null })
    .eq("id", id);
  if (error) throw error;
}

export async function updateCertificatePoint(pointId, patch) {
  assertSupabaseCertificates();
  const { error } = await supabase.from("calibration_certificate_points").update(patch).eq("id", pointId);
  if (error) throw error;
}

export async function recalculateCertificate(id, { weightItems, weightCerts } = {}) {
  const full = await getCertificate(id);
  if (!["rascunho", "calculado", "em_revisao_tecnica", "reprovado"].includes(full.status)) {
    throw new Error("Certificado bloqueado para recálculo.");
  }

  const validation = validateBeforeCalculate(full, full.points, full.standards, full.environmental);
  if (!validation.ok) throw new Error(validation.errors.join("; "));

  let items = weightItems;
  let certs = weightCerts;
  if (!items) {
    const cad = await loadCadastrosForImport(full.tenant_id);
    items = cad.weightItems;
    certs = cad.weightCerts;
  }

  const calculated = calculateCertificatePoints(full.points, full.balance_snapshot, items, certs);

  for (const pt of calculated) {
    if (!pt.id) continue;
    await updateCertificatePoint(pt.id, {
      nominal_value: pt.nominal_value,
      average_reading: pt.average_reading,
      indication_error: pt.indication_error,
      error_before_adjustment: pt.error_before_adjustment,
      repeatability: pt.repeatability,
      resolution: pt.resolution,
      standard_uncertainty: pt.standard_uncertainty,
      expanded_uncertainty: pt.expanded_uncertainty,
      coverage_factor: pt.coverage_factor,
      degrees_of_freedom: pt.degrees_of_freedom,
      calculation_memory: pt.calculation_memory || {},
      calc_status: pt.calc_status,
      calc_error: pt.calc_error || "",
    });
  }

  const confResult = calculateConformityForCertificate({
    balance: full.balance_snapshot,
    points: calculated,
    conformity: full.conformity,
    decisionRule: full.conformity?.decision_rule,
  });

  if (full.conformity?.id) {
    await supabase.from("calibration_certificate_conformity").update({
      instrument_class: confResult.instrumentClass || full.conformity.instrument_class,
      general_conformity_result: confResult.general,
      point_results: confResult.pointResults,
    }).eq("id", full.conformity.id);
  }

  await updateCertificateHeader(id, { status: "calculado" });
  return getCertificate(id);
}

export async function transitionCertificateStatus(id, newStatus, { userId, notes, checklist, employeeId } = {}) {
  const full = await getCertificate(id);
  if (!canTransitionCertificateStatus(full.status, newStatus)) {
    throw new Error(`Transição inválida: ${full.status} → ${newStatus}`);
  }

  if (newStatus === "aguardando_aprovacao") {
    const v = validateBeforeApproval(full, full.points, full.standards, full.environmental, checklist);
    if (!v.ok) throw new Error(v.errors.join("; "));
    await supabase.from("calibration_certificate_reviews").insert({
      certificate_id: id,
      review_type: "analise_critica",
      checklist: checklist || {},
      notes: notes || "",
      reviewed_by: userId || null,
    });
  }

  if (newStatus === "aprovado") {
    await supabase.from("calibration_certificate_reviews").insert({
      certificate_id: id,
      review_type: "aprovacao",
      notes: notes || "",
      reviewed_by: userId || null,
      employee_id: employeeId || full.signatory_id,
    });
    await updateCertificateHeader(id, {
      status: newStatus,
      approval_date: new Date().toISOString().slice(0, 10),
      approval_notes: notes || "",
    }, userId);
    return getCertificate(id);
  }

  if (newStatus === "reprovado") {
    await supabase.from("calibration_certificate_reviews").insert({
      certificate_id: id,
      review_type: "reprovacao",
      notes: notes || "",
      reviewed_by: userId || null,
    });
  }

  await updateCertificateHeader(id, { status: newStatus }, userId);
  return getCertificate(id);
}

export async function emitCertificate(id, { userId, documentMeta, fileName } = {}) {
  const full = await getCertificate(id);
  const v = validateBeforeEmit(full, full.points, full.standards);
  if (!v.ok) throw new Error(v.errors.join("; "));

  const cad = await loadCadastrosForImport(full.tenant_id);
  const executor = cad.employees.find((e) => e.id === full.executor_id);
  const signatory = cad.employees.find((e) => e.id === full.signatory_id);
  const endCustomer = cad.endCustomers.find((c) => c.id === full.end_customer_id);

  const technicalSnapshot = buildTechnicalSnapshot({
    certificate: full,
    points: full.points,
    standards: full.standards,
    environmental: full.environmental,
    conformity: full.conformity,
    endCustomer,
    executor,
    signatory,
    collectionRow: full.collection_snapshot,
  });

  const documentSnapshot = documentMeta ? {
    documentCode: documentMeta.code,
    documentTitle: documentMeta.title,
    documentReference: documentMeta.reference,
    documentRevision: documentMeta.revision,
    documentIssueDate: documentMeta.modelIssueDate,
    documentTemplateKey: documentMeta.templateKey,
    exportFileName: fileName,
    generatedAt: new Date().toISOString(),
    generatedBy: userId,
  } : {};

  await updateCertificateHeader(id, {
    status: "emitido",
    issue_date: new Date().toISOString().slice(0, 10),
    emitted_by: userId || null,
    is_preview_only: false,
    technical_snapshot: technicalSnapshot,
    document_snapshot: documentSnapshot,
  }, userId);

  if (full.collection_id) {
    await supabase.from("scale_calibration_collections").update({
      workflow_status: "certificado_gerado",
      certificate_id: id,
    }).eq("id", full.collection_id);
  }

  return getCertificate(id);
}

export async function substituteCertificate(id, { userId, reason, certificateType } = {}) {
  const original = await getCertificate(id);
  if (original.status !== "emitido") throw new Error("Somente certificados emitidos podem ser substituídos.");

  const year = original.certificate_year;
  const nextNum = await suggestNextCertificateNumber(original.tenant_id, year);
  const rev = String(Number(original.certificate_revision || "0") + 1).padStart(2, "0");

  const { data: newCert, error } = await supabase
    .from("calibration_certificates")
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
      scale_serial: original.scale_serial,
      commercial_proposal_ref: original.commercial_proposal_ref,
      calibration_date: original.calibration_date,
      calibration_location: original.calibration_location,
      replaces_certificate_id: id,
      replacement_reason: reason || "",
      balance_snapshot: original.balance_snapshot,
      collection_snapshot: original.collection_snapshot,
      eccentricity_snapshot: original.eccentricity_snapshot,
      control_snapshot: original.control_snapshot,
      executor_name: original.executor_name,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  const newId = newCert.id;

  const { data: pts } = await supabase.from("calibration_certificate_points").select("*").eq("certificate_id", id);
  if (pts?.length) {
    await supabase.from("calibration_certificate_points").insert(
      pts.map(({ id: _id, certificate_id: _c, created_at, updated_at, ...rest }) => ({
        ...rest,
        certificate_id: newId,
      })),
    );
  }

  const { data: stds } = await supabase.from("calibration_certificate_standards").select("*").eq("certificate_id", id);
  if (stds?.length) {
    await supabase.from("calibration_certificate_standards").insert(
      stds.map(({ id: _id, certificate_id: _c, created_at, updated_at, ...rest }) => ({
        ...rest,
        certificate_id: newId,
      })),
    );
  }

  const { data: env } = await supabase.from("calibration_certificate_environmental").select("*").eq("certificate_id", id).maybeSingle();
  if (env) {
    const { id: _e, certificate_id: _c, created_at, updated_at, ...rest } = env;
    await supabase.from("calibration_certificate_environmental").insert({ ...rest, certificate_id: newId });
  }

  const { data: conf } = await supabase.from("calibration_certificate_conformity").select("*").eq("certificate_id", id).maybeSingle();
  if (conf) {
    const { id: _e, certificate_id: _c, created_at, updated_at, ...rest } = conf;
    await supabase.from("calibration_certificate_conformity").insert({ ...rest, certificate_id: newId });
  }

  await updateCertificateHeader(id, { status: "substituido" }, userId);

  await supabase.from("calibration_certificate_reviews").insert({
    certificate_id: id,
    review_type: "substituicao",
    notes: reason || "",
    reviewed_by: userId || null,
  });

  return getCertificate(newId);
}

export async function cancelCertificate(id, { userId, reason } = {}) {
  const full = await getCertificate(id);
  if (full.status === "cancelado") throw new Error("Certificado já cancelado.");

  await updateCertificateHeader(id, {
    status: "cancelado",
    cancellation_reason: reason || "",
    cancelled_at: new Date().toISOString(),
    cancelled_by: userId || null,
  }, userId);

  await supabase.from("calibration_certificate_reviews").insert({
    certificate_id: id,
    review_type: "cancelamento",
    notes: reason || "",
    reviewed_by: userId || null,
  });

  return getCertificate(id);
}

export async function duplicateCertificate(id, { userId } = {}) {
  const full = await getCertificate(id);
  const nextNum = await suggestNextCertificateNumber(full.tenant_id, full.certificate_year);

  const { data: newCert, error } = await supabase
    .from("calibration_certificates")
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
      scale_serial: full.scale_serial,
      commercial_proposal_ref: full.commercial_proposal_ref,
      calibration_date: full.calibration_date,
      calibration_location: full.calibration_location,
      balance_snapshot: full.balance_snapshot,
      collection_snapshot: full.collection_snapshot,
      eccentricity_snapshot: full.eccentricity_snapshot,
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
  if (full.points?.length) {
    await supabase.from("calibration_certificate_points").insert(
      full.points.map(({ id: _id, certificate_id: _c, created_at, updated_at, ...rest }) => ({
        ...rest,
        certificate_id: newId,
        calc_status: "pendente",
        calculation_memory: {},
      })),
    );
  }
  return getCertificate(newId);
}

export async function listColetasForCertificate(tenantId) {
  const { data, error } = await supabase
    .from("scale_calibration_collections")
    .select("id, client_name, scale_serial, calibration_date, workflow_status, commercial_proposal_ref")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).filter((c) => !["cancelada", "certificado_gerado"].includes(c.workflow_status || "rascunho"));
}

export { canColetaGenerateOfficial };
