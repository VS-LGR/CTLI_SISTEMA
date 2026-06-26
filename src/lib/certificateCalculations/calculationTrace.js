import { formatCalcDisplay, parseCalibrationNumber } from "./parseNumber";
import {
  roundAverageForDisplay,
  roundReferenceForDisplay,
  roundIndicationErrorFromRoundedInputs,
  roundExpandedUncertainty,
  formatVeffForDisplay,
  resolveCertificateResolution,
} from "./certificateDisplayRounding";

const UE_DISPLAY_FACTOR = 4.4;

function fmt(v, decimals = 6) {
  if (v == null || v === "") return "—";
  if (typeof v === "string" && !/^-?\d/.test(v.trim())) return v;
  return formatCalcDisplay(v, decimals);
}

/**
 * Rastreio passo a passo — espelha RE-7.2B / PR-7.6 (somente editor, não PDF).
 * @returns {{ steps: Array<{ id, label, formula, expression, result, unit? }> }}
 */
export function buildPointCalculationTrace(point, balance = {}, unit = "g") {
  const mem = point?.calculation_memory || {};
  const steps = [];
  const d = resolveCertificateResolution(point, balance, unit, { preferMemory: true });
  const dNum = parseCalibrationNumber(d);
  const resStr = dNum.valid ? fmt(dNum.value, 6) : String(d ?? "—");

  if (mem.weightReference != null || mem.referenceValue != null) {
    const wRef = mem.weightReference ?? mem.referenceValue;
    const lot = mem.loadBatchNominal;
    if (mem.use_load_batch && lot != null && String(lot) !== "") {
      steps.push({
        id: "vr",
        label: "Valor de referência (V.R.)",
        formula: "V.R. = VVC_pesos + nominal_lote",
        expression: `${fmt(wRef)} + ${fmt(lot)} = ${fmt(mem.referenceValue)}`,
        result: mem.referenceValue,
        unit,
      });
    } else {
      steps.push({
        id: "vr",
        label: "Valor de referência (V.R.)",
        formula: "V.R. = Σ V.V.C dos pesos-padrão",
        expression: fmt(mem.referenceValue),
        result: mem.referenceValue,
        unit,
      });
    }
    if (mem.vcc_correction_applied) {
      steps.push({
        id: "vcc",
        label: "Correção VCC",
        formula: "ρ_ar ∉ [1,08; 1,32] kg/m³",
        expression: `ρ_ar = ${fmt(mem.air_density, 4)} kg/m³`,
        result: "aplicada",
      });
    }
  }

  if (mem.average != null) {
    steps.push({
      id: "media",
      label: "Média das leituras (Ib)",
      formula: "Ib = média(leituras depois do ajuste)",
      expression: `${fmt(mem.average)} (${mem.readingCount ?? "—"} leituras)`,
      result: mem.average,
      unit,
    });
  }

  if (mem.indicationError != null) {
    const m = mem.errorMultiplier ?? 1;
    if (m !== 1) {
      steps.push({
        id: "erro",
        label: "Erro de indicação (E)",
        formula: "E = Ib − V.R. × M",
        expression: `${fmt(mem.average)} − ${fmt(mem.referenceValue)} × ${fmt(m, 2)} = ${fmt(mem.indicationError)}`,
        result: mem.indicationError,
        unit,
      });
    } else {
      steps.push({
        id: "erro",
        label: "Erro de indicação (E)",
        formula: "E = Ib − V.R.",
        expression: `${fmt(mem.average)} − ${fmt(mem.referenceValue)} = ${fmt(mem.indicationError)}`,
        result: mem.indicationError,
        unit,
      });
    }
  }

  const components = [
    { key: "ua", label: "ua (repetitividade)" },
    { key: "up", label: "up (padrão)" },
    { key: "ud", label: "ud (deriva)" },
    { key: "ue", label: "ue (empuxo)" },
    { key: "ur", label: "ur (resolução)" },
    { key: "upLC", label: "upLC (lote de carga)" },
  ];

  components.forEach(({ key, label }) => {
    const val = mem[key];
    if (val != null && Number(val) !== 0) {
      steps.push({
        id: key,
        label,
        formula: key === "ur" ? "ur = d / (2×√3)" : key === "ua" ? "ua = STDEV / √n" : "",
        expression: fmt(val),
        result: val,
        unit,
      });
    }
  });

  if (mem.upLC > 0 && mem.upLcSource) {
    steps.push({
      id: "upLcSource",
      label: "Fonte upLC (Tabela 01)",
      formula: "upLC = uc(passo anterior)",
      expression: `uc(${mem.upLcSource}) = ${fmt(mem.upLC)}`,
      result: mem.upLC,
    });
  }

  if (mem.upLcSpreadsheet != null && mem.use_load_batch) {
    steps.push({
      id: "upLcSheet",
      label: "upLC (fórmula planilha P2 AI — referência)",
      formula: "√((n−1−2×up_P1+2×up)² + 2×(n−1)×(ua+ur)²)",
      expression: fmt(mem.upLcSpreadsheet),
      result: mem.upLcSpreadsheet,
    });
  }

  if (mem.buoyancy_method) {
    steps.push({
      id: "empuxo",
      label: "Empuxo (ue)",
      formula: mem.buoyancy_method === "emp" ? "ue = V.R. × Urel (EMP.Pn)" : "ue = (V.R.×PPM/10⁶)/√3",
      expression: [
        mem.ppmEffective != null ? `PPM = ${fmt(mem.ppmEffective, 2)}` : "",
        mem.urel != null ? `Urel = ${fmt(mem.urel, 8)}` : "",
        mem.air_density != null ? `ρ_ar = ${fmt(mem.air_density, 4)}` : "",
      ].filter(Boolean).join("; ") || fmt(mem.ue),
      result: mem.ue,
    });
  }

  if (mem.combinedUncertainty != null) {
    const parts = ["ua", "up", "ud", "ue", "ur", "upLC"]
      .filter((k) => mem[k] != null && Number(mem[k]) !== 0)
      .map((k) => `${fmt(mem[k])}²`);
    steps.push({
      id: "uc",
      label: "Incerteza combinada (uc)",
      formula: "uc = √(Σ uᵢ²)",
      expression: `√(${parts.join(" + ")}) = ${fmt(mem.combinedUncertainty)}`,
      result: mem.combinedUncertainty,
      unit,
    });
  }

  if (mem.degreesOfFreedom != null) {
    steps.push({
      id: "veff",
      label: "Graus de liberdade (Veff)",
      formula: "Welch-Satterthwaite (somente ua)",
      expression: fmt(mem.degreesOfFreedom, 2),
      result: mem.degreesOfFreedom,
    });
  }

  if (mem.coverageFactor != null) {
    steps.push({
      id: "k",
      label: "Fator k",
      formula: "T.INV(0,97725; Veff truncado)",
      expression: fmt(mem.coverageFactor, 2),
      result: mem.coverageFactor,
    });
  }

  if (mem.expandedUncertainty != null && mem.combinedUncertainty != null) {
    steps.push({
      id: "U",
      label: "Incerteza expandida (U)",
      formula: "U = k × uc",
      expression: `${fmt(mem.coverageFactor, 2)} × ${fmt(mem.combinedUncertainty)} = ${fmt(mem.expandedUncertainty)}`,
      result: mem.expandedUncertainty,
      unit,
    });
  }

  if (mem.expandedUncertainty != null && dNum.valid) {
    const factor = (dNum.value / 10) * UE_DISPLAY_FACTOR;
    const ueDisp = mem.expandedUncertaintyDisplay ?? roundExpandedUncertainty(mem.expandedUncertainty, d);
    steps.push({
      id: "U_display",
      label: "U exibida (Certificado-RBC)",
      formula: "MROUND(Ue + (d/10)×4,4, d)",
      expression: `MROUND(${fmt(mem.expandedUncertainty)} + (${resStr}/10)×4,4 = ${fmt(factor, 6)}, ${resStr}) = ${fmt(ueDisp)}`,
      result: ueDisp,
      unit,
    });
  }

  if (mem.average != null && mem.referenceValue != null && dNum.valid) {
    const avgR = roundAverageForDisplay(mem.average, d);
    const refR = roundReferenceForDisplay(mem.referenceValue, d);
    const eDisp = roundIndicationErrorFromRoundedInputs(mem.average, mem.referenceValue, d);
    steps.push({
      id: "display_round",
      label: "Exibição V.R. / média / E",
      formula: "MROUND(V.R., d); MROUND(Ib, d); E = MROUND(Ib,d) − MROUND(V.R., d)",
      expression: `V.R.=${fmt(refR)}; Ib=${fmt(avgR)}; E=${fmt(eDisp)}`,
      result: eDisp,
      unit,
    });
  }

  if (mem.veffDisplay != null) {
    steps.push({
      id: "veff_display",
      label: "Veff exibido",
      formula: "Veff > 99 → ∞",
      expression: String(mem.veffDisplay),
      result: mem.veffDisplay,
    });
  }

  if (Array.isArray(mem.weightContributions) && mem.weightContributions.length) {
    mem.weightContributions.forEach((w, i) => {
      steps.push({
        id: `weight_${i}`,
        label: `Peso ${w.identification || i + 1}`,
        formula: "up: Ue/k; ud: |deriva|/√3",
        expression: `Ue/k=${fmt(w.uFromUe)}; ud=${fmt(w.uFromDrift)}`,
        result: w.vvc ?? w.nominal,
        unit: w.unit || unit,
      });
    });
  }

  return { steps };
}
