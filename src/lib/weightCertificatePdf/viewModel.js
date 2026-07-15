import {
  formatCertificateNumber,
  certificateTypeLabel,
} from "@/lib/weightCalibration/weightCertificateSchema";
import { defaultValidityDate } from "@/lib/calibrationCertificates/certificateDateUtils";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

function s(v, fallback = "—") {
  const t = v == null ? "" : String(v).trim();
  return t || fallback;
}

function formatNum(v, decimals = 4) {
  if (v == null || v === "") return "—";
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(decimals).replace(".", ",");
}

function resolveObservations(cert) {
  const fromDoc = cert?.document_snapshot?.certificateObservations;
  if (Array.isArray(fromDoc) && fromDoc.length) return fromDoc.map(String);

  const typed = cert?.document_snapshot?.certificateObservations?.[cert.certificate_type];
  if (Array.isArray(typed) && typed.length) return typed.map(String);

  const custom = [cert.observation_1, cert.observation_2, cert.observation_3]
    .map((o) => String(o || "").trim())
    .filter(Boolean);
  if (custom.length) return custom;

  return [
    "Os resultados apresentados referem-se exclusivamente aos pesos caracterizados neste certificado.",
    "A incerteza expandida de medição é declarada com probabilidade de abrangência de aproximadamente 95,45%.",
    "Este certificado só poderá ser utilizado para fins publicitários quando autorizado pelo laboratório.",
  ];
}

/**
 * View-model do PDF RE-5.4.2B (certificado de calibração de pesos-padrão).
 */
export function buildWeightCertificatePdfViewModel(cert, opts = {}) {
  const snap = cert.technical_snapshot || {};
  const clientSnap = snap.clientSnapshot || snap.client_snapshot || {};
  const collectionPayload = cert.collection_snapshot?.payload || {};
  const cliente = collectionPayload.cliente || {};
  const env = cert.environmental || {};
  const items = cert.items || [];
  const standards = cert.standards || [];

  const numberLabel = formatCertificateNumber(cert.certificate_number, cert.certificate_year);
  const validity = cert.validity_date || defaultValidityDate(cert.calibration_date);

  return {
    preview: Boolean(opts.preview ?? (cert.status !== "emitido" || cert.is_preview_only)),
    cancelled: Boolean(opts.cancelled || cert.status === "cancelado"),
    document: {
      code: opts.documentMeta?.code || cert.document_snapshot?.documentCode || "RE-5.4.2B",
      title:
        opts.documentMeta?.title
        || (cert.certificate_type === "rbc"
          ? "CERTIFICADO DE CALIBRAÇÃO DE PESOS RBC"
          : "CERTIFICADO DE CALIBRAÇÃO DE PESOS"),
      reference: opts.documentMeta?.reference || cert.document_snapshot?.documentReference || "PR-7.2",
      revision: opts.documentMeta?.revision || cert.document_snapshot?.documentRevision || cert.certificate_revision || "03",
      issueDate: opts.documentMeta?.modelIssueDate || cert.document_snapshot?.documentIssueDate || "",
      number: numberLabel,
      type: cert.certificate_type || "rastreavel",
      typeLabel: certificateTypeLabel(cert.certificate_type),
      revisionLabel: cert.certificate_revision || "00",
    },
    tenantName: opts.tenantName || opts.tenant?.name || "",
    client: {
      name: s(cert.client_name || clientSnap.name || cliente.solicitante),
      contractor: s(cert.contractor_name || cliente.contratante, ""),
      cnpj: s(clientSnap.cnpj || cliente.cnpj),
      representative: s(cliente.responsavel || collectionPayload?.cliente?.responsavel),
      address: s(cliente.endereco),
      city: s(cliente.cidade),
      state: s(cliente.estado),
      unit: s(cliente.unidade),
    },
    weight: {
      identification: s(cert.weight_tag),
      serial: s(cert.weight_serial),
      class: s(cert.weight_class),
      manufacturer: s(cert.manufacturer),
      processNumber: s(cert.process_number),
      commercialProposal: s(cert.commercial_proposal_ref),
      location: s(cert.calibration_location),
      wasAdjusted: s(cert.was_adjusted, "nao"),
      descriptions: Array.isArray(cert.instrument_descriptions)
        ? cert.instrument_descriptions.filter(Boolean)
        : [],
    },
    dates: {
      calibration: formatDateBr(cert.calibration_date) || "—",
      issue: formatDateBr(cert.issue_date) || "—",
      approval: formatDateBr(cert.approval_date) || "—",
      validity: formatDateBr(validity) || "—",
    },
    environmental: {
      tempInitial: s(env.initial_temperature),
      tempFinal: s(env.final_temperature),
      tempMean: env.mean_temperature != null ? formatNum(env.mean_temperature, 1) : "—",
      humidityInitial: s(env.initial_humidity),
      humidityFinal: s(env.final_humidity),
      humidityMean: env.mean_humidity != null ? formatNum(env.mean_humidity, 1) : "—",
      pressureInitial: s(env.initial_pressure),
      pressureFinal: s(env.final_pressure),
      pressureMean: env.mean_pressure != null ? formatNum(env.mean_pressure, 1) : "—",
      airDensity: env.air_density != null ? formatNum(env.air_density, 4) : "—",
    },
    standards: standards.map((st) => ({
      type: s(st.standard_type),
      identification: s(st.identification_code),
      certificate: s(st.certificate_number),
      validUntil: formatDateBr(st.valid_until) || "—",
      laboratory: s(st.laboratory),
      description: s(st.description, ""),
    })),
    items: items.map((it) => {
      const decimals = Number.isFinite(Number(it.decimal_places))
        ? Math.max(0, Math.floor(Number(it.decimal_places)))
        : 2;
      return {
        number: it.item_number,
        identification: s(it.identification),
        material: s(it.uut_material),
        nominal: it.nominal_value != null
          ? `${formatNum(it.nominal_value, decimals)} ${it.nominal_unit || "g"}`
          : "—",
        density: it.specific_density != null ? formatNum(it.specific_density, 1) : "—",
        conventional: formatNum(it.conventional_value, decimals),
        deviation: formatNum(it.deviation, decimals),
        uncertainty: formatNum(it.expanded_uncertainty, decimals),
        k: it.coverage_factor != null ? formatNum(it.coverage_factor, 2) : "—",
        class: s(it.uut_class),
        before: formatNum(it.value_before_adjustment, decimals),
        after: formatNum(it.value_after_adjustment, decimals),
        conformity: s(it.conformity_result, "nao_avaliado"),
        approved: it.approved == null ? "—" : (it.approved ? "Sim" : "Não"),
      };
    }),
    observations: resolveObservations(cert),
    people: {
      executor: s(
        cert.executor_name
        || snap.executorSnapshot?.full_name
        || cert.control_snapshot?.executores,
      ),
      signatory: s(cert.signatory_name || snap.signatorySnapshot?.full_name),
    },
  };
}
