import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { buildImportFromColeta, buildCertificateFromPayload } from "./buildCertificatePayload";
import { sanitizePointsForDb, sanitizeStandardsForDb, sanitizeCalculatedPointPatchForDb, enrichEnvironmentalAirDensity } from "./certificateImportSanitize";
import { buildTechnicalSnapshot } from "./certificateSnapshots";
import { validateBeforeCalculate, validateBeforeEmit, validateBeforeApproval } from "./certificateValidation";
import { canTransitionCertificateStatus, canColetaGenerateOfficial, canMarkCertificateObsolete, canDeleteCertificate, INACTIVE_CERTIFICATE_STATUSES } from "./certificateSchema";
import { defaultValidityDate } from "./certificateDateUtils";
import { calculateCertificatePoints, calculateConformityForCertificate } from "@/lib/certificateCalculations";
import { evaluateCertificateMaxTolerance } from "@/lib/certificateCalculations/pointMaxToleranceVerification";

export function assertSupabaseCertificates() {
  if (!isSupabaseAuthMode) throw new Error("Certificados requerem ligação Supabase.");
}

async function syncPreviewOnlyFromColeta(certificate) {
  if (!certificate?.collection_id || certificate.status === "emitido") return certificate;
  const { data: coll } = await supabase
    .from("scale_calibration_collections")
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
  await updateCertificateHeader(certificate.id, patch);
  return { ...certificate, ...patch };
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

  const result = {
    ...cert,
    points: pointsRes.data || [],
    standards: standardsRes.data || [],
    environmental: enrichEnvironmentalAirDensity(envRes.data || null, cert),
    conformity: confRes.data || null,
    reviews: reviewsRes.data || [],
  };
  return syncPreviewOnlyFromColeta(result);
}

async function loadCadastrosForImport(tenantId) {
  const [customers, weights, weightCerts, envCerts, employees, scales] = await Promise.all([
    supabase.from("end_customer_registrations").select("*").eq("tenant_id", tenantId),
    supabase.from("standard_weight_items").select("*").eq("tenant_id", tenantId).eq("active", true),
    supabase.from("weight_standard_certificates").select("*").eq("tenant_id", tenantId),
    supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tenantId),
    supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId),
    supabase.from("scale_registrations").select("*").eq("tenant_id", tenantId).eq("active", true),
  ]);
  return {
    endCustomers: customers.data || [],
    weightItems: weights.data || [],
    weightCerts: weightCerts.data || [],
    envCerts: envCerts.data || [],
    employees: employees.data || [],
    scaleRegistrations: scales.data || [],
  };
}

async function insertCertificateBundle(tenantId, imported, { userId, certificateNumber }) {
  const { data: cert, error: certErr } = await supabase
    .from("calibration_certificates")
    .insert({
      tenant_id: tenantId,
      ...imported.certificate,
      collection_snapshot: imported.certificate?.collection_snapshot ?? {},
      certificate_number: certificateNumber,
      created_by: userId || null,
      updated_by: userId || null,
    })
    .select()
    .single();
  if (certErr) throw certErr;

  const certId = cert.id;

  if (imported.points.length) {
    const { error: ptErr } = await supabase.from("calibration_certificate_points").insert(
      sanitizePointsForDb(imported.points).map((p) => ({ ...p, certificate_id: certId })),
    );
    if (ptErr) throw ptErr;
  }

  if (imported.standards.length) {
    const { error: stErr } = await supabase.from("calibration_certificate_standards").insert(
      sanitizeStandardsForDb(imported.standards).map((s) => ({ ...s, certificate_id: certId })),
    );
    if (stErr) throw stErr;
  }

  const { error: envErr } = await supabase.from("calibration_certificate_environmental").insert({
    ...enrichEnvironmentalAirDensity(imported.environmental, {
      collection_snapshot: imported.certificate?.collection_snapshot,
    }),
    certificate_id: certId,
  });
  if (envErr) throw envErr;

  const { error: confErr } = await supabase.from("calibration_certificate_conformity").insert({
    ...imported.conformity,
    certificate_id: certId,
  });
  if (confErr) throw confErr;

  return certId;
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
  const active = (existing || []).find((c) => !INACTIVE_CERTIFICATE_STATUSES.includes(c.status));
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

  const certId = await insertCertificateBundle(tenantId, imported, { userId, certificateNumber: nextNum });

  await supabase.from("scale_calibration_collections").update({
    certificate_id: certId,
  }).eq("id", collectionId);

  let recalcWarning = null;
  try {
    await recalculateCertificate(certId);
  } catch (e) {
    recalcWarning = e?.message || "Cálculo não concluído automaticamente";
  }

  return {
    certificate: await getCertificate(certId),
    recalcWarning,
    importWarnings: imported.importWarnings || [],
  };
}

export async function createCertificateManual(tenantId, input, { userId } = {}) {
  assertSupabaseCertificates();

  const cadastros = await loadCadastrosForImport(tenantId);
  const calDate = input.calibrationDate || new Date().toISOString().slice(0, 10);
  const year = input.certificateYear || new Date(calDate).getFullYear();
  const nextNum = await suggestNextCertificateNumber(tenantId, year);

  const imported = buildCertificateFromPayload({
    payload: input.payload,
    ...cadastros,
    certificateType: input.certificateType || "rastreavel",
    certificateYear: year,
    certificateNumber: nextNum,
    commercialProposalRef: input.commercialProposalRef || "",
    clientName: input.clientName,
    scaleSerial: input.scaleSerial,
    calibrationDate: calDate,
    collectionId: null,
    collectionSnapshot: {
      source: "manual",
      payload: input.payload,
    },
    isPreviewOnly: false,
    scaleRegistrationId: input.scaleRegistrationId || null,
    repeatabilitySnapshot: input.repeatabilitySnapshot || null,
  });

  if (input.executorId) imported.certificate.executor_id = input.executorId;
  if (input.executorName) imported.certificate.executor_name = input.executorName;
  if (input.endCustomerId) imported.certificate.end_customer_id = input.endCustomerId;
  if (input.validityDate) imported.certificate.validity_date = input.validityDate;
  if (input.calibrationLocation) imported.certificate.calibration_location = input.calibrationLocation;

  const certId = await insertCertificateBundle(tenantId, imported, { userId, certificateNumber: nextNum });

  let recalcWarning = null;
  try {
    await recalculateCertificate(certId);
  } catch (e) {
    recalcWarning = e?.message || "Cálculo não concluído automaticamente";
  }

  return {
    certificate: await getCertificate(certId),
    recalcWarning,
    importWarnings: imported.importWarnings || [],
  };
}

export async function updateCertificateHeader(id, patch, userId) {
  assertSupabaseCertificates();
  const { error } = await supabase
    .from("calibration_certificates")
    .update({ ...patch, updated_by: userId || null })
    .eq("id", id);
  if (error) throw error;
}

export async function updateCertificateStandard(standardId, patch) {
  assertSupabaseCertificates();
  const { error } = await supabase.from("calibration_certificate_standards").update(patch).eq("id", standardId);
  if (error) throw error;
}

export async function updateCertificatePoint(pointId, patch) {
  assertSupabaseCertificates();
  const { error } = await supabase.from("calibration_certificate_points").update(patch).eq("id", pointId);
  if (error) throw error;
}

export async function updateCertificateEnvironmental(certificateId, patch) {
  assertSupabaseCertificates();
  const { error } = await supabase
    .from("calibration_certificate_environmental")
    .update(patch)
    .eq("certificate_id", certificateId);
  if (error) throw error;
}

export async function recalculateCertificate(id, { weightItems, weightCerts } = {}) {
  let full = await getCertificate(id);
  full = await syncPreviewOnlyFromColeta(full);
  if (!["rascunho", "calculado", "em_revisao_tecnica", "reprovado"].includes(full.status)) {
    throw new Error("Certificado bloqueado para recálculo.");
  }

  const validation = validateBeforeCalculate(full, full.points, full.standards, full.environmental);
  if (!validation.ok) throw new Error(validation.errors.join("; "));

  let items = weightItems;
  let certs = weightCerts;
  const cad = await loadCadastrosForImport(full.tenant_id);
  if (!items) {
    items = cad.weightItems;
    certs = cad.weightCerts;
  }

  const scaleReg = cad.scaleRegistrations.find((s) => s.id === full.scale_registration_id);

  const calculated = calculateCertificatePoints(
    full.points,
    full.balance_snapshot,
    items,
    certs,
    full.environmental || {},
    { repeatabilitySnapshot: full.repeatability_snapshot || {} },
  );

  const confResult = calculateConformityForCertificate({
    balance: full.balance_snapshot,
    points: calculated,
    conformity: full.conformity,
    decisionRule: full.conformity?.decision_rule,
    pointMaxTolerances: scaleReg?.point_max_tolerances || full.balance_snapshot?.point_max_tolerances || [],
    weightItems: items,
    eccentricitySnapshot: full.eccentricity_snapshot || null,
  });

  const confByPoint = Object.fromEntries(
    (confResult.pointResults || []).map((pr) => [pr.pointNumber, pr]),
  );

  const maxTolCheck = evaluateCertificateMaxTolerance(
    calculated,
    scaleReg?.point_max_tolerances || full.balance_snapshot?.point_max_tolerances || [],
    { defaultUnit: full.balance_snapshot?.unidade || "g", weightItems: items },
  );

  for (const pt of calculated) {
    if (!pt.id) continue;
    const conf = confByPoint[pt.point_number];
    await updateCertificatePoint(pt.id, sanitizeCalculatedPointPatchForDb({
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
      conformity_result: conf?.result || "nao_avaliado",
      tolerance_positive: conf?.tolerance?.positive ?? null,
      tolerance_negative: conf?.tolerance?.negative ?? null,
    }));
  }

  if (full.conformity?.id) {
    await supabase.from("calibration_certificate_conformity").update({
      instrument_class: confResult.instrumentClass || full.conformity.instrument_class,
      general_conformity_result: confResult.general,
      point_results: confResult.pointResults,
      max_tolerance_point_results: maxTolCheck.pointResults,
      general_max_tolerance_result: maxTolCheck.general,
    }).eq("id", full.conformity.id);
  }

  const enrichedEnv = enrichEnvironmentalAirDensity(full.environmental, full);
  if (full.environmental?.certificate_id || full.environmental?.id) {
    await updateCertificateEnvironmental(id, { air_density: enrichedEnv.air_density || "" });
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
    if (full.is_preview_only) {
      throw new Error("Prévia técnica não pode seguir para aprovação oficial — confira a coleta primeiro");
    }
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
    const signatory = (await loadCadastrosForImport(full.tenant_id)).employees
      .find((e) => e.id === (employeeId || full.signatory_id));
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
      signatory_id: employeeId || full.signatory_id || null,
      signatory_name: signatory?.full_name || full.signatory_name || "",
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
  const updated = await getCertificate(id);

  if (newStatus === "aguardando_aprovacao") {
    try {
      const { notifySignatoryPendingApproval } = await import("@/lib/certificateEmail/certificateEmailApi");
      await notifySignatoryPendingApproval(updated, { tenantId: updated.tenant_id });
    } catch {
      /* notificação opcional — não bloqueia fluxo */
    }
  }

  return updated;
}

export async function bulkApproveCertificates(certificateIds, { userId, notes = "" } = {}) {
  assertSupabaseCertificates();
  if (!certificateIds?.length) return { approved: 0, ids: [] };

  const { data, error } = await supabase.rpc("approve_calibration_certificates", {
    p_certificate_ids: certificateIds,
    p_user_id: userId || null,
    p_notes: notes || "",
  });
  if (error) throw error;

  return { approved: Number(data) || 0, ids: certificateIds };
}

export async function emitCertificate(id, { userId, documentMeta, fileName } = {}) {
  const full = await getCertificate(id);
  if (!canTransitionCertificateStatus(full.status, "emitido")) {
    throw new Error(`Transição inválida: ${full.status} → emitido`);
  }
  const cad = await loadCadastrosForImport(full.tenant_id);
  const v = validateBeforeEmit(
    full,
    full.points,
    full.standards,
    full.environmental,
    {
      scaleRegistration: cad.scaleRegistrations.find((s) => s.id === full.scale_registration_id),
      weightItems: cad.weightItems,
    },
  );
  if (!v.ok) throw new Error(v.errors.join("; "));

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
    certificateObservations: documentMeta.certificateObservations || null,
    exportFileName: fileName,
    generatedAt: new Date().toISOString(),
    generatedBy: userId,
  } : {};

  await updateCertificateHeader(id, {
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
      validity_date: original.validity_date,
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
  if (!canTransitionCertificateStatus(full.status, "cancelado")) {
    throw new Error(`Não é possível cancelar certificado com status ${full.status}`);
  }

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

  if (full.collection_id) {
    await supabase.from("scale_calibration_collections").update({
      workflow_status: "conferida",
      certificate_id: null,
    }).eq("id", full.collection_id);
  }

  return getCertificate(id);
}

export async function markCertificateObsolete(id, { userId, reason } = {}) {
  const full = await getCertificate(id);
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

  await updateCertificateHeader(id, {
    status: "obsoleto",
    obsolete_reason: reason || "",
    obsoleted_at: new Date().toISOString(),
    obsoleted_by: userId || null,
  }, userId);

  await supabase.from("calibration_certificate_reviews").insert({
    certificate_id: id,
    review_type: "obsolescencia",
    notes: reason || "",
    reviewed_by: userId || null,
  });

  if (full.collection_id) {
    await supabase.from("scale_calibration_collections").update({
      certificate_id: null,
      workflow_status: "conferida",
    }).eq("id", full.collection_id);
  }

  return getCertificate(id);
}

export async function deleteCertificate(id, { tenantId } = {}) {
  const full = await getCertificate(id);
  if (tenantId && full.tenant_id !== tenantId) {
    throw new Error("Certificado não pertence a este ambiente.");
  }
  if (!canDeleteCertificate(full.status)) {
    throw new Error("Somente certificados obsoletos podem ser removidos permanentemente. Marque como obsoleto primeiro.");
  }

  const { error } = await supabase.from("calibration_certificates").delete().eq("id", id);
  if (error) throw error;
  return { id };
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
      validity_date: full.validity_date,
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
    .select("id, client_name, scale_serial, calibration_date, workflow_status, commercial_proposal_ref, certificate_id")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const coletas = (data || []).filter((c) => c.workflow_status !== "cancelada");
  const geradoIds = coletas
    .filter((c) => c.workflow_status === "certificado_gerado")
    .map((c) => c.id);
  if (!geradoIds.length) return coletas.filter((c) => c.workflow_status !== "certificado_gerado");

  const { data: certs } = await supabase
    .from("calibration_certificates")
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
