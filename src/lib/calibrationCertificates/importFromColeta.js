import { determineInstrumentClass } from "@/lib/certificateCalculations";
import { canColetaGenerateOfficial } from "./certificateSchema";
import { defaultValidityDate } from "./certificateDateUtils";

function matchEmployeeByName(name, employees = []) {
  const n = (name || "").trim().toLowerCase();
  if (!n) return null;
  return employees.find((e) => (e.full_name || "").trim().toLowerCase() === n) || null;
}

function buildWeightStandardRow(item, cert) {
  return {
    standard_type: "peso_padrao",
    standard_id: item.id,
    identification_code: item.identification || "",
    description: `${item.nominal_value || ""} ${item.unit || "g"}`.trim(),
    certificate_number: item.certificate_number || cert?.certificate_number || "",
    calibration_date: cert?.calibration_date || null,
    valid_until: cert?.expiry_date || null,
    uncertainty: null,
    laboratory: cert?.calibrated_by || "",
    traceability: cert?.set_name || "",
    snapshot: { item, cert },
  };
}

function buildEnvStandardRow(envCert) {
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

export function buildImportFromColeta({
  collectionRow,
  endCustomers = [],
  weightItems = [],
  weightCerts = [],
  envCerts = [],
  employees = [],
  certificateType = "rastreavel",
  certificateYear,
  certificateNumber,
}) {
  const payload = mergeColetaPayload(collectionRow?.payload);
  const workflowStatus = collectionRow?.workflow_status || "rascunho";
  const isPreviewOnly = !canColetaGenerateOfficial(workflowStatus);

  const endCustomerId = resolveEndCustomerId(payload, endCustomers);
  const endCustomer = endCustomers.find((c) => c.id === endCustomerId) || null;

  const calDate = collectionRow?.calibration_date
    || payload.controle?.data_calibracao
    || null;
  const year = certificateYear || (calDate ? new Date(calDate).getFullYear() : new Date().getFullYear());

  const executorMatch = matchEmployeeByName(payload.controle?.nome_executor, employees);

  const points = (payload.calibracao?.pontos || []).map((pt, i) => ({
    point_number: i + 1,
    nominal_value: pt.peso_nominal || null,
    reading_before_adjustment: pt.leitura_antes || null,
    reading1: pt.rep1 || null,
    reading2: pt.rep2 || null,
    reading3: pt.rep3 || null,
    standard_weight_ids: pt.pesos_padrao_ids || [],
    notes: "",
  }));

  const weightIdsUsed = new Set();
  points.forEach((p) => (p.standard_weight_ids || []).forEach((id) => weightIdsUsed.add(id)));

  const standards = [];
  for (const wid of weightIdsUsed) {
    const item = weightItems.find((w) => w.id === wid);
    if (!item) continue;
    const cert = weightCerts.find((c) => c.id === item.weight_certificate_id);
    standards.push(buildWeightStandardRow(item, cert));
  }

  const env1 = envCerts.find((e) => e.id === payload.ambiente?.thermo_cert_id);
  const env2 = envCerts.find((e) => e.id === payload.ambiente?.thermo_cert_id_2);
  const envRow1 = buildEnvStandardRow(env1);
  const envRow2 = buildEnvStandardRow(env2);
  if (envRow1) standards.push(envRow1);
  if (envRow2) standards.push(envRow2);

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
    snapshot: payload.ambiente,
  };

  const balance = payload.balanca || {};
  const legalApplicable = Boolean(balance.portaria_inmetro || balance.etiqueta_ipem);
  const classResult = legalApplicable
    ? determineInstrumentClass(balance.capacidade, balance.resolucao, balance.unidade)
    : { instrumentClass: "" };

  return {
    certificate: {
      collection_id: collectionRow.id,
      certificate_type: certificateType,
      certificate_year: year,
      certificate_number: certificateNumber ?? null,
      certificate_revision: "00",
      status: "rascunho",
      end_customer_id: endCustomerId || null,
      executor_id: executorMatch?.id || null,
      executor_name: payload.controle?.nome_executor || "",
      client_name: collectionRow?.client_name || payload.cliente?.cliente || endCustomer?.name || "",
      scale_serial: collectionRow?.scale_serial || balance.serie || "",
      commercial_proposal_ref: collectionRow?.commercial_proposal_ref || "",
      calibration_date: calDate,
      validity_date: defaultValidityDate(calDate),
      calibration_location: balance.local || endCustomer?.full_address || endCustomer?.address || "",
      is_preview_only: isPreviewOnly,
      balance_snapshot: balance,
      collection_snapshot: { id: collectionRow.id, workflow_status: workflowStatus, payload },
      eccentricity_snapshot: payload.excentricidade || {},
      control_snapshot: payload.controle || {},
    },
    points,
    standards,
    environmental,
    conformity: {
      legal_metrology_applicable: legalApplicable,
      instrument_class: classResult.instrumentClass || "",
      applicable_ordinance: balance.portaria_inmetro || "",
      customer_criterion: payload.controle?.pontos_solicitados || "",
      decision_rule: "simples",
      declaration_of_conformity: "",
      general_conformity_result: "nao_avaliado",
      notes: "",
      point_results: [],
    },
    endCustomer,
    isPreviewOnly,
    workflowStatus,
  };
}
