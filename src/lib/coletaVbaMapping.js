import { mergeColetaPayload, envCertLabel } from "./coletaSchema";
import { fmtDmyShortForExport } from "./dateFormat";

const SHEET_COLETA = "COLETADEDADOS";
const SHEET_BALANCAS = "BALANÇAS";

const ECC_CELLS = [
  { antes: "Y4", depois: "AD4" },
  { antes: "Z4", depois: "AE4" },
  { antes: "AA4", depois: "AF4" },
  { antes: "AB4", depois: "AG4" },
  { antes: "AC4", depois: "AH4" },
];

function v(val) {
  if (val == null) return "";
  return String(val).replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
}

function line(sheet, col, value) {
  const s = v(value);
  if (!s) return null;
  return `${sheet};${col};${s}`;
}

/**
 * @param {Record<string, unknown>} row scale_calibration_collections row
 * @param {{ envCerts?: Array<Record<string, unknown>> }} opts
 * @returns {string[]}
 */
export function buildColetaVbaLines(row, { envCerts = [] } = {}) {
  const p = mergeColetaPayload(row?.payload);
  const lines = [];

  const push = (sheet, col, value) => {
    const ln = line(sheet, col, value);
    if (ln) lines.push(ln);
  };

  // —— COLETADEDADOS ——
  push(SHEET_COLETA, "C4", p.cliente.cliente);
  push(SHEET_COLETA, "F4", row?.scale_serial || p.balanca.serie);
  push(SHEET_COLETA, "U4", p.balanca.tipo_plataforma);
  push(
    SHEET_COLETA,
    "J4",
    envCertLabel(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id)),
  );
  push(
    SHEET_COLETA,
    "K4",
    envCertLabel(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id_2)),
  );
  push(SHEET_COLETA, "O4", p.ambiente.temp_inicial);
  push(SHEET_COLETA, "P4", p.ambiente.umidade_inicial);
  push(SHEET_COLETA, "Q4", p.ambiente.pressao_inicial);
  push(SHEET_COLETA, "R4", p.ambiente.temp_final);
  push(SHEET_COLETA, "S4", p.ambiente.umidade_final);
  push(SHEET_COLETA, "T4", p.ambiente.pressao_final);
  push(SHEET_COLETA, "H4", p.controle.nome_executor);
  push(SHEET_COLETA, "E4", fmtDmyShortForExport(p.controle.data_calibracao));
  push(SHEET_COLETA, "AY4", p.controle.pontos_solicitados);
  push(SHEET_COLETA, "X4", p.excentricidade.valor_aplicado);

  p.excentricidade.pontos.slice(0, 5).forEach((pt, i) => {
    const cells = ECC_CELLS[i];
    if (!cells) return;
    push(SHEET_COLETA, cells.antes, pt.antes);
    push(SHEET_COLETA, cells.depois, pt.depois);
  });

  // —— BALANÇAS ——
  push(SHEET_BALANCAS, "D4", p.balanca.fabricante);
  push(SHEET_BALANCAS, "E4", p.balanca.modelo);
  push(SHEET_BALANCAS, "C4", p.balanca.serie);
  push(SHEET_BALANCAS, "F4", p.balanca.tag);
  push(SHEET_BALANCAS, "Q4", p.balanca.local);
  push(SHEET_BALANCAS, "R4", p.balanca.etiqueta_ipem);
  push(SHEET_BALANCAS, "H4", p.balanca.capacidade);
  push(SHEET_BALANCAS, "K4", p.balanca.resolucao);
  push(SHEET_BALANCAS, "S4", p.balanca.unidade);
  push(SHEET_BALANCAS, "G4", p.balanca.tipo_balanca);

  // —— P1..P10 ——
  p.calibracao.pontos.forEach((pt, i) => {
    const n = i + 1;
    const sheet = `P${n}`;
    push(sheet, "C8", pt.leitura_antes);
    push(sheet, "W8", pt.rep1);
    push(sheet, "X8", pt.rep2);
    push(sheet, "Y8", pt.rep3);
  });

  return lines;
}
