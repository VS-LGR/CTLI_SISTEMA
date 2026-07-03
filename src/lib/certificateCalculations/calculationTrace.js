import { formatCalcDisplay, fmtEmpMicro, parseCalibrationNumber } from "./parseNumber";
import {
  roundAverageForDisplay,
  roundReferenceForDisplay,
  roundIndicationErrorFromRoundedInputs,
  roundExpandedUncertainty,
  formatVeffForDisplay,
  resolveCertificateResolution,
} from "./certificateDisplayRounding";
import { REF_AIR_DENSITY, REF_SOLID_DENSITY } from "./conventionalMassCorrection";
import { RHO_SOLID_REF } from "./buoyancyCalculations";

const UE_DISPLAY_FACTOR = 4.4;

function fmt(v, decimals = 6) {
  if (v == null || v === "") return "—";
  if (typeof v === "string" && !/^-?\d/.test(v.trim())) return v;
  return formatCalcDisplay(v, decimals);
}

function fmtEmp(v, decimals = 8) {
  return fmtEmpMicro(v, decimals);
}

const EMP_STEP_META = { resultFormat: "emp", resultDecimals: 12 };

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

  if (mem.weightReference != null || mem.referenceValue != null || mem.vc_uncorrected != null) {
    const lot = mem.load_batch_conventional_value ?? mem.loadBatchNominal ?? mem.load_batch_nominal;
    const vcAk = mem.vc_uncorrected ?? mem.referenceValue;

    if (mem.vc_uncorrected != null) {
      const m = mem.errorMultiplier ?? 1;
      const formula = mem.use_load_batch && m !== 1
        ? "V.C = Vc_base × M (PR-7.6 §5.4.2)"
        : "Σ V.V.C dos pesos-padrão (+ lote se aplicável)";
      const expression = mem.use_load_batch && m !== 1 && mem.vc_base != null
        ? `${fmt(mem.vc_base)} × ${fmt(m, 2)} = ${fmt(mem.vc_uncorrected)}`
        : fmt(mem.vc_uncorrected);
      steps.push({
        id: "vc_uncorrected",
        label: "V.C Não Corrigido (AK49)",
        formula,
        expression,
        result: mem.vc_uncorrected,
        unit,
      });
    }

    if (mem.vcc_correction_applied && mem.vc_uncorrected != null) {
      const rho = mem.air_density;
      const du = mem.material_density;
      steps.push({
        id: "vcc",
        label: "Correção VCC (Certificado-RBC AI49)",
        formula: "V.R. = V.C × (1 + (ρ_ar−1,2)/ρ_mat − (ρ_ar−1,2)/8000)",
        expression: `${fmt(mem.vc_uncorrected)} × (1 + (${fmt(rho, 4)}−${REF_AIR_DENSITY})/${fmt(du, 0)} − (${fmt(rho, 4)}−${REF_AIR_DENSITY})/${REF_SOLID_DENSITY}) = ${fmt(mem.referenceValue)}`,
        result: mem.referenceValue,
        unit,
      });
    } else if (mem.air_density != null && Number.isFinite(Number(mem.air_density))) {
      steps.push({
        id: "vcc_skip",
        label: "Correção VCC",
        formula: "ρ_ar ∈ [1,08; 1,32] kg/m³ — não aplicada",
        expression: `ρ_ar = ${fmt(mem.air_density, 4)} kg/m³`,
        result: "não aplicada",
      });
    } else if (mem.vc_uncorrected == null) {
      if (mem.use_load_batch && lot != null && String(lot) !== "" && mem.weightReference != null) {
        steps.push({
          id: "vr",
          label: "Valor de referência (V.R.)",
          formula: "V.R. = Vc_base × M",
          expression: `${fmt(mem.weightReference)} × ${fmt(mem.errorMultiplier ?? 1, 2)} = ${fmt(vcAk)}`,
          result: mem.referenceValue,
          unit,
        });
      } else if (mem.referenceValue != null) {
        steps.push({
          id: "vr",
          label: "Valor de referência (V.R.)",
          formula: "V.R. = Σ V.V.C dos pesos-padrão",
          expression: fmt(mem.referenceValue),
          result: mem.referenceValue,
          unit,
        });
      }
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
      const vcBase = mem.vc_base ?? mem.weightReference ?? (mem.referenceValue != null ? Number(mem.referenceValue) / Number(m) : null);
      steps.push({
        id: "erro",
        label: "Erro de indicação (E)",
        formula: "E = Ib − (Vc × M)",
        expression: `${fmt(mem.average)} − (${fmt(vcBase)} × ${fmt(m, 2)}) = ${fmt(mem.indicationError)}`,
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

  if (mem.buoyancy_method === "emp") {
    if (mem.empDeltaT != null || mem.empDeltaRh != null) {
      steps.push({
        id: "emp_deltas",
        label: "EMP — variação ambiental",
        formula: "ΔT = T_final − T_inicial; ΔRH = UR_final − UR_inicial",
        expression: `ΔT = ${fmt(mem.empDeltaT, 2)} °C; ΔRH = ${fmt(mem.empDeltaRh, 2)} %`,
        result: null,
      });
    }
    if (mem.empUT != null || mem.empURh != null) {
      steps.push({
        id: "emp_uT_uRH",
        label: "EMP — u(T) e u(RH)",
        formula: "u(T) = |ΔT|/√12; u(RH) = |ΔRH|/√12",
        expression: `u(T) = ${fmt(mem.empUT, 6)}; u(RH) = ${fmt(mem.empURh, 6)}`,
        result: null,
      });
    }
    if (mem.empUPaRel != null) {
      steps.push({
        id: "emp_uPaRel",
        label: "EMP — u(pa)/pa",
        formula: "√((up×uP)² + (ut×uT)² + (urh×uRH)² + uform²)",
        expression: fmtEmp(mem.empUPaRel),
        result: mem.empUPaRel,
        ...EMP_STEP_META,
      });
    }
    if (mem.empMaterialDensityUsed != null) {
      const xWarn = mem.empX === 0 ? " — X=0 (ρ_mat=8000 ou ΔT/ΔRH=0?)" : "";
      steps.push({
        id: "emp_X",
        label: "EMP — termo X",
        formula: "X = u(pa)/pa × (1/ρ_mat − 1/8000)²",
        expression: `${fmtEmp(mem.empUPaRel)} × (1/${fmt(mem.empMaterialDensityUsed, 0)} − 1/${RHO_SOLID_REF})² = ${fmtEmp(mem.empX)}${xWarn}`,
        result: mem.empX,
        ...EMP_STEP_META,
      });
    }
    if (mem.empY != null) {
      steps.push({
        id: "emp_Y",
        label: "EMP — termo Y",
        formula: "Y = (ρ_ar − 1,2)² × 70²/8000⁴",
        expression: `(${fmt(mem.air_density, 4)} − ${REF_AIR_DENSITY})² × 70²/${RHO_SOLID_REF}⁴ = ${fmtEmp(mem.empY)}`,
        result: mem.empY,
        ...EMP_STEP_META,
      });
    }
    if (mem.empUrel != null) {
      const empX = mem.empX ?? 0;
      const empY = mem.empY ?? 0;
      const empSum = empX + empY;
      steps.push({
        id: "emp_Urel",
        label: "EMP — Urel",
        formula: "Urel = √(X + Y)",
        expression: `X + Y = ${fmtEmp(empX)} + ${fmtEmp(empY)} = ${fmtEmp(empSum)} → Urel = √(${fmtEmp(empSum)}) = ${fmtEmp(mem.empUrel)}`,
        result: mem.empUrel,
        ...EMP_STEP_META,
      });
    }
    steps.push({
      id: "empuxo",
      label: "Empuxo (ue)",
      formula: "ue = V.C × Urel (EMP.P1)",
      expression: `${fmt(mem.empConventionalMass ?? mem.vc_uncorrected ?? mem.referenceValue)} × ${fmtEmp(mem.empUrel ?? mem.urel)} = ${fmt(mem.ue)}`,
      result: mem.ue,
      unit,
    });
    if (mem.buoyancy_warning) {
      steps.push({
        id: "emp_warning",
        label: "Empuxo — aviso",
        formula: mem.buoyancy_warning,
        expression: mem.buoyancy_warning,
        result: null,
      });
    }
  } else if (mem.buoyancy_method === "ppm") {
    steps.push({
      id: "empuxo",
      label: "Empuxo (ue) — fallback PPM",
      formula: "ue = (V.R.×PPM/10⁶)/√3",
      expression: [
        mem.ppmEffective != null ? `PPM = ${fmt(mem.ppmEffective, 2)}` : "",
        fmt(mem.ue),
      ].filter(Boolean).join("; ") || fmt(mem.ue),
      result: mem.ue,
      unit,
    });
  } else if (mem.buoyancy_method) {
    steps.push({
      id: "empuxo",
      label: "Empuxo (ue)",
      formula: "ue não calculado",
      expression: fmt(mem.ue),
      result: mem.ue,
      unit,
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
