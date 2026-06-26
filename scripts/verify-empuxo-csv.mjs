/**
 * Compara linhas válidas de Empuxo.CSV × P1.CSV com o motor EMP.P1.
 *
 * Uso: node scripts/verify-empuxo-csv.mjs [caminhoEmpuxo.csv] [caminhoP1.csv]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultEmpuxo = path.resolve(process.env.USERPROFILE || "", "OneDrive/Área de Trabalho/Empuxo.CSV");
const defaultP1 = path.resolve(process.env.USERPROFILE || "", "OneDrive/Área de Trabalho/P1.CSV");

const empuxoPath = process.argv[2] || defaultEmpuxo;
const p1Path = process.argv[3] || defaultP1;

const SQRT12 = Math.sqrt(12);
const UP_PA = 1e-5 / 100;
const UT_PA = (-4e-3) / (-273.15);
const URH_PA = -0.009;
const U_FORM = 2.4e-4;
const U_PRESSURE_HPA = 10;
const U_RHO_AIR = 70;
const RHO_AIR_REF = 1.2;
const RHO_SOLID_REF = 8000;
const DEFAULT_MATERIAL_DENSITY = 7900;

/** Ambientais conhecidos que reproduzem ΔT/ΔRH/ρ_ar das planilhas golden. */
const ENV_BY_CERT = {
  "Validacao 2025": {
    initial_temperature: 24,
    final_temperature: 24,
    initial_humidity: 65,
    final_humidity: 58,
    initial_pressure: 935,
    final_pressure: 935,
  },
  "Validacao 2026": {
    initial_temperature: 24,
    final_temperature: 23,
    initial_humidity: 65,
    final_humidity: 55,
    initial_pressure: 935,
    final_pressure: 935,
  },
  "001/2025": {
    initial_temperature: 23.2,
    final_temperature: 23.9,
    initial_humidity: 63,
    final_humidity: 58,
    initial_pressure: 935,
    final_pressure: 935,
  },
  "002/2025": {
    initial_temperature: 18.8,
    final_temperature: 19.4,
    initial_humidity: 64,
    final_humidity: 68,
    initial_pressure: 935,
    final_pressure: 937,
  },
  "003/2025": {
    initial_temperature: 19,
    final_temperature: 18.9,
    initial_humidity: 60,
    final_humidity: 55,
    initial_pressure: 935,
    final_pressure: 935,
  },
};

const P1_UE_COLUMN = 31;

function avg(a, b) {
  return (a + b) / 2;
}

function calculateAirDensity(tAvg, urAvg, pAvg) {
  const denominator = 273.15 + tAvg;
  const numerator = 0.348444 * pAvg - urAvg * (0.00252 * tAvg - 0.020582);
  return Math.round((numerator / denominator) * 100) / 100;
}

function resolveEmpMaterialDensity(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MATERIAL_DENSITY;
  if (Math.abs(raw - RHO_SOLID_REF) < 1e-9) return DEFAULT_MATERIAL_DENSITY;
  return raw;
}

function calculateBuoyancyUe(vc, materialDensity, env) {
  const rhoMat = resolveEmpMaterialDensity(materialDensity);
  const tAvg = avg(env.initial_temperature, env.final_temperature);
  const urAvg = avg(env.initial_humidity, env.final_humidity);
  const pAvg = avg(env.initial_pressure, env.final_pressure);
  const rhoAir = calculateAirDensity(tAvg, urAvg, pAvg);
  const deltaT = env.final_temperature - env.initial_temperature;
  const deltaRh = env.final_humidity - env.initial_humidity;
  const uT = Math.abs(deltaT) / SQRT12;
  const uRh = Math.abs(deltaRh) / SQRT12;
  const uPaRel = Math.sqrt(
    (UP_PA * U_PRESSURE_HPA) ** 2
    + (UT_PA * uT) ** 2
    + (URH_PA * uRh) ** 2
    + U_FORM ** 2,
  );
  const termInvDiffSq = (1 / rhoMat - 1 / RHO_SOLID_REF) ** 2;
  const x = uPaRel * termInvDiffSq;
  const y = ((rhoAir - RHO_AIR_REF) ** 2) * (U_RHO_AIR ** 2) / (RHO_SOLID_REF ** 4);
  const urel = Math.sqrt(x + y);
  return vc * urel;
}

function parseCsvLine(line, sep = ";") {
  return line.split(sep).map((c) => c.trim());
}

function parseBrNumber(raw) {
  if (!raw || raw.startsWith("#") || raw === "0") return null;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeCertName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function readEmpuxoRows(filePath) {
  const text = fs.readFileSync(filePath, "latin1");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const ueIdx = header.length - 1;
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const cert = normalizeCertName(cols[0]);
    const vc = parseBrNumber(cols[1]);
    const ueEmp = parseBrNumber(cols[ueIdx]);
    if (!cert || vc == null || ueEmp == null || cert === "0") continue;
    const rhoMat = parseBrNumber(cols[18]) ?? 7900;
    rows.push({ cert, vc, ueEmp, rhoMat, line: i + 1 });
  }
  return rows;
}

function readP1UeByCert(filePath) {
  const text = fs.readFileSync(filePath, "latin1");
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const cert = normalizeCertName(cols[0]);
    if (!cert || cert === "0") continue;
    const ue = parseBrNumber(cols[P1_UE_COLUMN]);
    if (ue != null) map.set(cert, ue);
  }
  return map;
}

function relDiff(a, b) {
  if (b === 0) return Math.abs(a);
  return Math.abs(a - b) / Math.abs(b);
}

function main() {
  if (!fs.existsSync(empuxoPath)) {
    console.error("Empuxo.CSV não encontrado:", empuxoPath);
    process.exit(1);
  }
  if (!fs.existsSync(p1Path)) {
    console.error("P1.CSV não encontrado:", p1Path);
    process.exit(1);
  }

  const empuxoRows = readEmpuxoRows(empuxoPath);
  const p1Ue = readP1UeByCert(p1Path);
  let failed = 0;

  console.log("Certificado\tV.C\tEmpuxo ue\tMotor ue\tP1 ue\tΔ motor%\tStatus");
  for (const row of empuxoRows) {
    const env = ENV_BY_CERT[row.cert];
    if (!env) {
      console.log(`${row.cert}\t—\t—\t—\t—\t—\tSKIP (sem ambientais)`);
      continue;
    }
    const motorUe = calculateBuoyancyUe(row.vc, row.rhoMat, env);
    const p1 = p1Ue.get(row.cert) ?? null;
    const ref = row.ueEmp;
    const okMotor = relDiff(motorUe, ref) < 0.01;
    const okP1 = p1 != null && relDiff(p1, ref) < 0.01;
    const status = okMotor && okP1 ? "OK" : "FAIL";
    if (status === "FAIL") failed += 1;
    const pct = (relDiff(motorUe, ref) * 100).toFixed(4);
    console.log(
      `${row.cert}\t${row.vc}\t${ref}\t${motorUe}\t${p1 ?? "—"}\t${pct}\t${status}`,
    );
  }

  if (failed > 0) {
    console.error(`\n${failed} linha(s) fora da tolerância (<1%).`);
    process.exit(1);
  }
  console.log("\nTodas as linhas válidas conferem com Empuxo.CSV e P1.CSV.");
}

main();
