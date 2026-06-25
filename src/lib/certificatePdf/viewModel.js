import { formatCertificateNumber, certificateTypeLabel } from "@/lib/calibrationCertificates/certificateSchema";
import { defaultValidityDate } from "@/lib/calibrationCertificates/certificateDateUtils";
import { formatCalcDisplay, decimalPlacesFromResolution, resolveResolutionForNominal, resolveReadingsAfter, buildCertificatePointDisplay, enrichCertificatePointsForDisplay, resolvePointVeff } from "@/lib/certificateCalculations";
import { decimalPlacesForPoint } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import {
  environmentalAverage,
  environmentalUncertainty,
  calculateAirDensityFromEnvironmental,
  formatAirDensityDisplay,
  ENV_UNCERTAINTY_CONSTANTS,
} from "@/lib/certificateCalculations/environmentalCalculations";
import { unidadeLabel, TIPO_BALANCA_OPTIONS, TIPO_PLATAFORMA_OPTIONS } from "@/lib/coletaSchema";
import { fmtDmy } from "@/lib/coletaPdf/viewModel";
import { getCertificateObservations } from "./legalObservations";

function labelFromOptions(options, value) {
  return options.find((o) => o.value === value)?.label || value || "";
}

function resolveDisplayDecimals(point, balance, unit) {
  if (point.display_decimals != null && Number.isFinite(Number(point.display_decimals))) {
    return Number(point.display_decimals);
  }
  const resolutionStr = resolveResolutionForNominal(point.nominal_value, balance, unit);
  return decimalPlacesFromResolution(resolutionStr) ?? decimalPlacesForPoint(balance, point.point_number || 1);
}

function parseNum(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatBr(n, decimals = 1) {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatCalcDisplay(n, decimals).replace(".", ",");
}

function formatEnvCell(initial, final, constant, suffix, uncDecimals = 1) {
  const avg = environmentalAverage(initial, final);
  const unc = environmentalUncertainty(initial, final, constant);
  if (avg == null) return "—";
  const v = formatBr(avg, 1);
  const u = unc != null ? ` ± ${formatBr(unc, uncDecimals)}` : "";
  return `${v} ${suffix}${u}`.trim();
}

function pdfMeasure(value, unit, decimals) {
  if (value == null || value === "") {
    return { value: "--", unit: unit || "" };
  }
  return {
    value: formatCalcDisplay(value, decimals).replace(".", ","),
    unit: unit || "",
  };
}

function emptyRepeatabilityRow(unit) {
  const u = unit || "kg";
  const dash = { value: "--", unit: u };
  return {
    empty: true,
    reference: dash,
    beforeReading: dash,
    beforeError: dash,
    average: dash,
    indicationError: dash,
    expandedUncertainty: dash,
    veff: "--",
    k: "--",
  };
}

function mapRepeatabilityRow(p, balance, unit, decimals) {
  const display = buildCertificatePointDisplay({ ...p, display_decimals: decimals }, balance, unit);
  const m = (v) => pdfMeasure(v, unit, decimals);
  return {
    empty: false,
    reference: m(display.reference ?? p.nominal_value),
    beforeReading: m(p.reading_before_adjustment),
    beforeError: m(p.error_before_adjustment),
    average: m(display.average ?? p.average_reading),
    indicationError: m(display.indicationError),
    expandedUncertainty: m(display.expandedUncertainty),
    veff: resolvePointVeff(p),
    k: p.coverage_factor != null && p.coverage_factor !== ""
      ? formatCalcDisplay(p.coverage_factor, 2).replace(".", ",")
      : "--",
  };
}

function buildRepeatabilityRows(certPoints, balance, unit) {
  const activeByNum = Object.fromEntries(
    (certPoints || []).map((p) => [p.point_number, p]),
  );
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const p = activeByNum[n];
    if (!p) return emptyRepeatabilityRow(unit);
    const decimals = resolveDisplayDecimals(p, balance, unit);
    return mapRepeatabilityRow(p, balance, unit, decimals);
  });
}

function resolveReadingsPerPoint(cert) {
  const pts = activePoints(cert);
  const counts = pts
    .map((p) => resolveReadingsAfter(p).length)
    .filter((c) => c > 0);
  if (!counts.length) return "—";
  const uniq = [...new Set(counts)];
  return uniq.length === 1 ? String(uniq[0]) : uniq.join(" / ");
}

function withUnit(value, unit, decimals = 4) {
  if (value == null || value === "") return "—";
  const formatted = formatCalcDisplay(value, decimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

function activePoints(cert) {
  return (cert.points || []).filter(
    (p) => p.nominal_value || p.reading1 || p.reading2 || p.reading3
      || p.reading_before_adjustment || (resolveReadingsAfter(p).length > 0),
  );
}

function resolveClient(cert) {
  const snap = cert.technical_snapshot?.clientSnapshot || {};
  const address = snap.full_address || snap.address || cert.calibration_location || "";
  return {
    name: snap.name || cert.client_name || "",
    cnpj: snap.cnpj || "",
    address,
    city: snap.city || parseCityFromAddress(address),
    state: snap.state || "",
    unit: snap.unit || "",
    representative: snap.representative_name || "",
    website: snap.website || "",
  };
}

function parseCityFromAddress(address) {
  const addr = String(address || "").trim();
  if (!addr) return "";
  const parts = addr.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (last.length <= 3) return parts[parts.length - 2] || "";
    return last;
  }
  return "";
}

function formatPointVeff(point) {
  const formatted = resolvePointVeff(point);
  return formatted === "--" ? "—" : formatted;
}

export { enrichCertificatePointsForDisplay };

function resolveEnvironmental(cert) {
  const env = cert.environmental || cert.technical_snapshot?.environmentalConditionsSnapshot || {};
  const snap = env.snapshot || {};
  const collPayload = cert.collection_snapshot?.payload || {};
  const ambSnap = collPayload.ambiente || snap || {};

  const tempIni = env.initial_temperature || ambSnap.temp_inicial;
  const tempFin = env.final_temperature || ambSnap.temp_final;
  const humIni = env.initial_humidity || ambSnap.umidade_inicial;
  const humFin = env.final_humidity || ambSnap.umidade_final;
  const pressIni = env.initial_pressure || ambSnap.pressao_inicial;
  const pressFin = env.final_pressure || ambSnap.pressao_final;

  const airCalc = calculateAirDensityFromEnvironmental({
    initial_temperature: tempIni,
    final_temperature: tempFin,
    initial_humidity: humIni,
    final_humidity: humFin,
    initial_pressure: pressIni,
    final_pressure: pressFin,
  });
  const massaEspecifica = airCalc.valid
    ? formatAirDensityDisplay(airCalc.value)
    : formatAirDensityDisplay(env.air_density);

  return {
    initialFinal: {
      temperature: { initial: tempIni || "—", final: tempFin || "—" },
      humidity: { initial: humIni || "—", final: humFin || "—" },
      pressure: { initial: pressIni || "—", final: pressFin || "—" },
    },
    temperature: formatEnvCell(tempIni, tempFin, ENV_UNCERTAINTY_CONSTANTS.temperature, "°C", 2),
    humidity: formatEnvCell(humIni, humFin, ENV_UNCERTAINTY_CONSTANTS.humidity, "%", 1),
    pressure: formatEnvCell(pressIni, pressFin, ENV_UNCERTAINTY_CONSTANTS.pressure, "hPA", 1),
    airDensity: massaEspecifica !== "—" ? `${massaEspecifica} kg/m³` : "—",
    balanceAdjusted: env.balance_adjusted || ambSnap.balanca_ajustada || "",
    notes: env.notes || ambSnap.observacoes || "",
    popReference: "",
  };
}

function resolveEccentricity(cert) {
  const ecc = cert.eccentricity_snapshot
    || cert.technical_snapshot?.eccentricitySnapshot
    || {};
  const pontos = (ecc.pontos || []).slice(0, 5).map((pt, i) => ({
    number: i + 1,
    before: pt.antes ?? pt.leitura_antes ?? "",
    after: pt.depois ?? pt.leitura_depois ?? "",
  }));
  const hasData = ecc.valor_aplicado || pontos.some((p) => p.before || p.after);
  return {
    applicable: hasData,
    appliedValue: ecc.valor_aplicado || "",
    points: pontos.length ? pontos : Array.from({ length: 5 }, (_, i) => ({ number: i + 1, before: "", after: "" })),
  };
}

import { SUBSTITUICAO_LINHA_DEFS } from "@/lib/coletaSchema";

function resolveRepeatability(cert) {
  const rep = cert.repeatability_snapshot || cert.collection_snapshot?.payload?.verso?.repetitividade || {};
  if (rep.aplicavel === false) return { applicable: false, rows: [], observations: "" };

  const labelByKey = Object.fromEntries(
    SUBSTITUICAO_LINHA_DEFS.map((d) => [d.key, d.label]),
  );

  const linhas = rep.linhas || [];
  const rows = linhas
    .filter((l) => l.leitura1 || l.leitura2 || l.leitura3 || l.valor_nominal)
    .map((l) => ({
      label: l.label || labelByKey[l.key] || l.key || "",
      nominal: l.valor_nominal || "",
      reading1: l.leitura1 || "",
      reading2: l.leitura2 || "",
      reading3: l.leitura3 || "",
    }));

  if (!rows.length && rep.p1_valor_balanca) {
    rows.push({
      label: "P1",
      nominal: "",
      reading1: rep.p1_valor_balanca,
      reading2: "",
      reading3: "",
    });
  }

  return {
    applicable: rows.length > 0 || rep.aplicavel !== false,
    rows,
    observations: rep.observacoes || "",
  };
}

function conformityDeclaration(cert) {
  const conf = cert.conformity || {};
  if (!conf.legal_metrology_applicable) return "";
  const result = conf.general_conformity_result;
  if (result === "conforme") return "CERTIFICADO: CONFORME";
  if (result === "nao_conforme") return "CERTIFICADO: NÃO CONFORME";
  return "";
}

export function buildCertificatePdfViewModel(cert, {
  documentMeta = null,
  tenantName = "",
  tenant = null,
  preview = false,
  cancelled = false,
} = {}) {
  const enriched = enrichCertificatePointsForDisplay(cert);
  const balance = enriched.balance_snapshot || enriched.technical_snapshot?.balanceSnapshot || {};
  const meta = documentMeta || enriched.document_snapshot || {};
  const unit = unidadeLabel(balance.unidade);
  const points = activePoints(enriched);
  const env = resolveEnvironmental(enriched);
  env.popReference = tenant?.pop_calibration_code || "POP-CAL-02";

  const eccentricity = resolveEccentricity(enriched);
  const repeatability = resolveRepeatability(enriched);
  const validityDate = enriched.validity_date || defaultValidityDate(enriched.calibration_date);

  const weightStandards = (enriched.standards || [])
    .filter((s) => s.standard_type === "peso_padrao" || s.standard_type === "outro")
    .map((s) => ({
      code: s.identification_code,
      description: s.description,
      certificate: s.certificate_number,
      calibrationDate: fmtDmy(s.calibration_date),
      validUntil: fmtDmy(s.valid_until),
      traceability: s.traceability || s.laboratory || "",
    }));

  const instrumentStandards = (enriched.standards || [])
    .filter((s) => s.standard_type === "termo_baro_higrometro")
    .map((s) => ({
      code: s.identification_code,
      description: s.description,
      certificate: s.certificate_number,
      calibrationDate: fmtDmy(s.calibration_date),
      validUntil: fmtDmy(s.valid_until),
      traceability: s.traceability || s.laboratory || "",
    }));

  const adjustmentPerformed = (() => {
    const v = String(env.balanceAdjusted || "").trim().toLowerCase();
    if (!v) return null;
    if (v === "sim" || v === "s" || v === "yes") return true;
    if (v === "nao" || v === "não" || v === "n" || v === "nao." || v === "não.") return false;
    return null;
  })();

  return {
    tenantName: tenantName || tenant?.name || "",
    tenantWebsite: tenant?.lab_website || tenant?.website || "",
    lab: {
      name: tenantName || tenant?.name || "",
      address: tenant?.lab_address || "",
      phone: tenant?.lab_phone || "",
      website: tenant?.lab_website || tenant?.website || "",
      ipemNumber: tenant?.ipem_accreditation_number || "",
      cgcreCalNumber: tenant?.cgcre_cal_number || "",
      popCode: tenant?.pop_calibration_code || "POP-CAL-02",
    },
    preview,
    cancelled,
    certificateType: enriched.certificate_type,
    certificateTypeLabel: certificateTypeLabel(enriched.certificate_type),
    certificateNumber: formatCertificateNumber(enriched.certificate_number, enriched.certificate_year),
    revision: enriched.certificate_revision || meta.revision || meta.documentRevision || "00",
    documentMeta: {
      code: meta.code || meta.documentCode || "RE-7.2B",
      reference: meta.reference || meta.documentReference || "PR-7.2",
      revision: meta.revision || meta.documentRevision || enriched.certificate_revision || "00",
      modelIssueDate: meta.modelIssueDate || meta.documentIssueDate || "",
      title: meta.title || meta.documentTitle || "CERTIFICADO DE CALIBRAÇÃO",
    },
    client: resolveClient(enriched),
    balance: {
      identificacao: balance.tag || balance.codigo || "",
      fabricante: balance.fabricante || "",
      modelo: balance.modelo || "",
      descricao: balance.descricao || "",
      serie: balance.serie || enriched.scale_serial || "",
      tag: balance.tag || "",
      capacidade: balance.capacidade || "",
      capacidade2: balance.capacidade_2 || "",
      capacidade3: balance.capacidade_3 || "",
      resolucao: balance.resolucao || "",
      resolucao2: balance.resolucao_2 || "",
      resolucao3: balance.resolucao_3 || "",
      divisao: balance.divisao_verificacao || "",
      divisao2: balance.divisao_verificacao_2 || "",
      divisao3: balance.divisao_verificacao_3 || "",
      classe: balance.classe || "",
      pontoTrabalho: balance.ponto_trabalho || "",
      unidade: unit,
      tipo: labelFromOptions(TIPO_BALANCA_OPTIONS, balance.tipo_balanca),
      plataforma: labelFromOptions(TIPO_PLATAFORMA_OPTIONS, balance.tipo_plataforma),
      tipoPlataformaValue: balance.tipo_plataforma || "",
      tipoPlataformaLabel: labelFromOptions(TIPO_PLATAFORMA_OPTIONS, balance.tipo_plataforma),
      portaria: balance.portaria_inmetro || "",
      etiqueta: balance.etiqueta_ipem || "",
      local: balance.local || enriched.calibration_location || "",
      faixa: balance.capacidade ? `${balance.capacidade} ${unit}`.trim() : "",
    },
    calibrationDate: fmtDmy(enriched.calibration_date),
    validityDate: fmtDmy(validityDate),
    issueDate: fmtDmy(enriched.issue_date),
    proposalRef: enriched.commercial_proposal_ref || "",
    environmental: env,
    weightStandards,
    instrumentStandards,
    standards: weightStandards,
    points: points.map((p) => {
      const decimals = resolveDisplayDecimals(p, balance, unit);
      const display = buildCertificatePointDisplay({ ...p, display_decimals: decimals }, balance, unit);
      return {
      label: String(p.point_number),
      referenceValue: withUnit(display.reference ?? p.nominal_value, unit, decimals),
      referenceRaw: p.nominal_value,
      beforeAdjustment: {
        l1: withUnit(p.reading_before_adjustment, unit, decimals),
        error: withUnit(p.error_before_adjustment, unit, decimals),
      },
      readings: {
        r1: withUnit(p.reading1, unit, decimals),
        r2: withUnit(p.reading2, unit, decimals),
        r3: withUnit(p.reading3, unit, decimals),
      },
      results: {
        average: withUnit(display.average ?? p.average_reading, unit, decimals),
        indicationError: withUnit(display.indicationError, unit, decimals),
        expandedUncertainty: withUnit(display.expandedUncertainty, unit, decimals),
        veff: formatPointVeff(p),
        k: formatCalcDisplay(p.coverage_factor, 2),
      },
      conformity: p.conformity_result || "",
    };
    }),
    eccentricity,
    substitutionRepeatability: repeatability,
    repeatability,
    adjustmentPerformed,
    adjustmentNote: adjustmentPerformed === false ? "Não foi realizado o ajuste do equipamento" : "",
    calibratedPointsCount: points.length,
    readingsPerPoint: resolveReadingsPerPoint(enriched),
    repeatabilityRows: buildRepeatabilityRows(points, balance, unit),
    conformity: enriched.conformity || {},
    conformityDeclaration: conformityDeclaration(enriched),
    executorName: enriched.executor_name || enriched.technical_snapshot?.executorSnapshot?.full_name || "",
    signatoryName: enriched.signatory_name || enriched.technical_snapshot?.signatorySnapshot?.full_name || "",
    approvalDate: fmtDmy(enriched.approval_date),
    observations: getCertificateObservations(enriched.certificate_type),
    unit,
  };
}
