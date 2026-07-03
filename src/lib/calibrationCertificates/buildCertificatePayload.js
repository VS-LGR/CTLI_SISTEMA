import { mergeColetaPayload, resolveEndCustomerId } from "@/lib/coletaSchema";
import { determineInstrumentClass } from "@/lib/certificateCalculations";
import { toDbNumeric } from "@/lib/certificateCalculations/parseNumber";
import { canColetaGenerateOfficial } from "./certificateSchema";
import { defaultValidityDate } from "./certificateDateUtils";
import { mapColetaPointForDb } from "./certificateImportSanitize";
import {
  resolveScaleRegistration,
  mergeBalanceSnapshotFromScale,
  resolveExecutor,
  validateWeightIdsForCalibration,
} from "./certificateResolvers";

export function buildWeightStandardRow(item, cert) {
  return {
    standard_type: "peso_padrao",
    standard_id: item.id,
    identification_code: item.identification || "",
    description: `${item.nominal_value || ""} ${item.unit || "g"}`.trim(),
    certificate_number: item.certificate_number || cert?.certificate_number || "",
    calibration_date: cert?.calibration_date || null,
    valid_until: cert?.expiry_date || null,
    uncertainty: toDbNumeric(item.expanded_uncertainty),
    laboratory: cert?.calibrated_by || "",
    traceability: cert?.set_name || "",
    snapshot: { item, cert },
  };
}

export function buildEnvStandardRow(envCert) {
  if (!envCert) return null;
  return {
    standard_type: "termo_baro_higrometro",
    standard_id: envCert.id,
    identification_code: envCert.equipment_name || envCert.identification || "",
    description: envCert.manufacturer || "",
    certificate_number: envCert.certificate_number || "",
    calibration_date: envCert.calibration_date || null,
    valid_until: envCert.expiry_date || null,
    uncertainty: null,
    laboratory: envCert.calibrated_by || "",
    traceability: envCert.equipment_name || "",
    snapshot: { envCert },
  };
}

function buildStandardsFromPoints(points, weightItems, weightCerts, envCerts, envIds = []) {
  const weightIdsUsed = new Set();
  (points || []).forEach((p) => (p.standard_weight_ids || []).forEach((id) => weightIdsUsed.add(id)));

  const standards = [];
  for (const wid of weightIdsUsed) {
    const item = weightItems.find((w) => w.id === wid);
    if (!item) continue;
    const cert = weightCerts.find((c) => c.id === item.weight_certificate_id);
    standards.push(buildWeightStandardRow(item, cert));
  }

  for (const eid of envIds.filter(Boolean)) {
    const envCert = envCerts.find((e) => e.id === eid);
    const row = buildEnvStandardRow(envCert);
    if (row) standards.push(row);
  }
  return standards;
}

function buildConformity(balance, control = {}, certificateType = "rastreavel") {
  if (certificateType === "rbc") {
    return {
      legal_metrology_applicable: false,
      instrument_class: "",
      applicable_ordinance: "",
      customer_criterion: control.pontos_solicitados || "",
      decision_rule: "simples",
      declaration_of_conformity: "",
      general_conformity_result: "nao_aplicavel",
      notes: "",
      point_results: [],
    };
  }

  const legalApplicable = Boolean(balance.portaria_inmetro || balance.etiqueta_ipem);
  const classResult = legalApplicable
    ? determineInstrumentClass(balance.capacidade, balance.resolucao, balance.unidade)
    : { instrumentClass: balance.classe || "" };

  return {
    legal_metrology_applicable: legalApplicable,
    instrument_class: classResult.instrumentClass || balance.classe || "",
    applicable_ordinance: balance.portaria_inmetro || "",
    customer_criterion: control.pontos_solicitados || "",
    decision_rule: legalApplicable && balance.portaria_inmetro ? "portaria_157" : "simples",
    declaration_of_conformity: "",
    general_conformity_result: "nao_avaliado",
    notes: "",
    point_results: [],
  };
}

/** Monta estrutura completa a partir de payload de coleta (sem collectionRow). */
export function buildCertificateFromPayload({
  payload: rawPayload,
  endCustomers = [],
  weightItems = [],
  weightCerts = [],
  envCerts = [],
  employees = [],
  scaleRegistrations = [],
  certificateType = "rastreavel",
  certificateYear,
  certificateNumber,
  commercialProposalRef = "",
  clientName,
  scaleSerial,
  calibrationDate,
  collectionId = null,
  collectionSnapshot = null,
  isPreviewOnly = false,
  scaleRegistrationId = null,
  repeatabilitySnapshot = null,
}) {
  const payload = mergeColetaPayload(rawPayload);
  const endCustomerId = resolveEndCustomerId(payload, endCustomers);
  const endCustomer = endCustomers.find((c) => c.id === endCustomerId) || null;

  const calDate = calibrationDate || payload.controle?.data_calibracao || null;
  const year = certificateYear || (calDate ? new Date(calDate).getFullYear() : new Date().getFullYear());
  const executor = resolveExecutor(payload, employees);
  const serial = scaleSerial || payload.balanca?.serie || "";
  const scaleReg = resolveScaleRegistration(serial, endCustomerId, scaleRegistrations);
  const balance = mergeBalanceSnapshotFromScale(payload.balanca || {}, scaleReg);
  const importWarnings = [];

  const repSnap = repeatabilitySnapshot || payload.verso?.repetitividade || {};

  const points = (payload.calibracao?.pontos || []).slice(0, 10).map((pt, i) =>
    mapColetaPointForDb(pt, i + 1, importWarnings, repSnap),
  );

  points.forEach((pt) => validateWeightIdsForCalibration(
    pt.standard_weight_ids,
    weightItems,
    weightCerts,
    calDate,
    importWarnings,
  ));

  const envIds = [payload.ambiente?.thermo_cert_id, payload.ambiente?.thermo_cert_id_2].filter(Boolean);
  const standards = buildStandardsFromPoints(points, weightItems, weightCerts, envCerts, envIds);

  const environmental = {
    thermo_hygrometer_id: payload.ambiente?.thermo_cert_id || null,
    thermo_hygrometer_id_2: payload.ambiente?.thermo_cert_id_2 || null,
    start_time: payload.ambiente?.horario_inicial || "",
    end_time: payload.ambiente?.horario_final || "",
    initial_temperature: payload.ambiente?.temp_inicial || "",
    final_temperature: payload.ambiente?.temp_final || "",
    initial_humidity: payload.ambiente?.umidade_inicial || "",
    final_humidity: payload.ambiente?.umidade_final || "",
    initial_pressure: payload.ambiente?.pressao_inicial || "",
    final_pressure: payload.ambiente?.pressao_final || "",
    balance_adjusted: payload.ambiente?.balanca_ajustada || "",
    balance_leveled: payload.ambiente?.balanca_nivelada || "",
    has_vibration: payload.ambiente?.existe_vibracao || "",
    has_air_flow: payload.ambiente?.existe_corrente_ar || "",
    notes: payload.ambiente?.observacoes || "",
    air_density: "",
    snapshot: payload.ambiente,
  };

  return {
    certificate: {
      collection_id: collectionId,
      scale_registration_id: scaleRegistrationId || scaleReg?.id || null,
      certificate_type: certificateType,
      certificate_year: year,
      certificate_number: certificateNumber ?? null,
      certificate_revision: "00",
      status: "rascunho",
      end_customer_id: endCustomerId || null,
      executor_id: executor.executor_id,
      executor_name: executor.executor_name,
      client_name: clientName || payload.cliente?.cliente || endCustomer?.name || "",
      scale_serial: serial,
      commercial_proposal_ref: commercialProposalRef || "",
      calibration_date: calDate,
      validity_date: defaultValidityDate(calDate),
      calibration_location: balance.local || endCustomer?.full_address || "",
      is_preview_only: isPreviewOnly,
      balance_snapshot: balance,
      collection_snapshot: collectionSnapshot ?? { source: "manual" },
      eccentricity_snapshot: payload.excentricidade || {},
      repeatability_snapshot: repSnap,
      control_snapshot: payload.controle || {},
    },
    points,
    standards,
    environmental,
    conformity: buildConformity(balance, payload.controle, certificateType),
    endCustomer,
    importWarnings,
  };
}

export function buildImportFromColeta({
  collectionRow,
  endCustomers = [],
  weightItems = [],
  weightCerts = [],
  envCerts = [],
  employees = [],
  scaleRegistrations = [],
  certificateType = "rastreavel",
  certificateYear,
  certificateNumber,
}) {
  const payload = mergeColetaPayload(collectionRow?.payload);
  const workflowStatus = collectionRow?.workflow_status || "rascunho";
  const isPreviewOnly = !canColetaGenerateOfficial(workflowStatus);

  const built = buildCertificateFromPayload({
    payload,
    endCustomers,
    weightItems,
    weightCerts,
    envCerts,
    employees,
    scaleRegistrations,
    certificateType,
    certificateYear,
    certificateNumber,
    commercialProposalRef: collectionRow?.commercial_proposal_ref || "",
    clientName: collectionRow?.client_name,
    scaleSerial: collectionRow?.scale_serial,
    calibrationDate: collectionRow?.calibration_date || payload.controle?.data_calibracao,
    collectionId: collectionRow.id,
    collectionSnapshot: { id: collectionRow.id, workflow_status: workflowStatus, payload },
    isPreviewOnly,
  });

  return {
    ...built,
    isPreviewOnly,
    workflowStatus,
    importWarnings: built.importWarnings || [],
  };
}
