import { mergeColetaPayload, envCertLabel } from "./coletaSchema";
import { fmtDmyShortForExport } from "./dateFormat";

/**
 * Export VBA: uma linha por célula — ABA;COLUNA;DADO
 * COLUNA = apenas letras (sem número de linha); a planilha fixa a linha no VBA.
 */

const SHEET_COLETA = "COLETADEDADOS";
const SHEET_BALANCAS = "BALANÇAS";

const ECC_CELLS = [
  { antes: "Y", depois: "AD" },
  { antes: "Z", depois: "AE" },
  { antes: "AA", depois: "AF" },
  { antes: "AB", depois: "AG" },
  { antes: "AC", depois: "AH" },
];

function v(val) {
  if (val == null) return "";
  return String(val).replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
}

function line(sheet, colLetter, value) {
  const s = v(value);
  if (!s) return null;
  return `${sheet};${colLetter};${s}`;
}

/**
 * @param {Record<string, unknown>} row scale_calibration_collections row
 * @param {{ envCerts?: Array<Record<string, unknown>> }} opts
 * @returns {string[]}
 */
export function buildColetaVbaLines(row, { envCerts = [] } = {}) {
  const p = mergeColetaPayload(row?.payload);
  const lines = [];
  const cliente = p.cliente.cliente;

  const push = (sheet, col, value) => {
    const ln = line(sheet, col, value);
    if (ln) lines.push(ln);
  };

  // —— COLETADEDADOS ——
  push(SHEET_COLETA, "C", cliente);
  push(SHEET_COLETA, "F", row?.scale_serial || p.balanca.serie);
  push(SHEET_COLETA, "U", p.balanca.tipo_plataforma);
  push(
    SHEET_COLETA,
    "J",
    envCertLabel(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id)),
  );
  push(
    SHEET_COLETA,
    "K",
    envCertLabel(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id_2)),
  );
  push(SHEET_COLETA, "O", p.ambiente.temp_inicial);
  push(SHEET_COLETA, "P", p.ambiente.umidade_inicial);
  push(SHEET_COLETA, "Q", p.ambiente.pressao_inicial);
  push(SHEET_COLETA, "R", p.ambiente.temp_final);
  push(SHEET_COLETA, "S", p.ambiente.umidade_final);
  push(SHEET_COLETA, "T", p.ambiente.pressao_final);
  push(SHEET_COLETA, "H", p.controle.nome_executor);
  push(SHEET_COLETA, "E", fmtDmyShortForExport(p.controle.data_calibracao));
  push(SHEET_COLETA, "AY", p.controle.pontos_solicitados);
  push(SHEET_COLETA, "X", p.excentricidade.valor_aplicado);

  p.excentricidade.pontos.slice(0, 5).forEach((pt, i) => {
    const cells = ECC_CELLS[i];
    if (!cells) return;
    push(SHEET_COLETA, cells.antes, pt.antes);
    push(SHEET_COLETA, cells.depois, pt.depois);
  });

  // —— BALANÇAS ——
  push(SHEET_BALANCAS, "B", cliente);
  push(SHEET_BALANCAS, "D", p.balanca.fabricante);
  push(SHEET_BALANCAS, "E", p.balanca.modelo);
  push(SHEET_BALANCAS, "C", p.balanca.serie);
  push(SHEET_BALANCAS, "F", p.balanca.tag);
  push(SHEET_BALANCAS, "Q", p.balanca.local);
  push(SHEET_BALANCAS, "R", p.balanca.etiqueta_ipem);
  push(SHEET_BALANCAS, "H", p.balanca.capacidade);
  push(SHEET_BALANCAS, "K", p.balanca.resolucao);
  push(SHEET_BALANCAS, "S", p.balanca.unidade);
  push(SHEET_BALANCAS, "G", p.balanca.tipo_balanca);

  // —— P1..P10 ——
  p.calibracao.pontos.forEach((pt, i) => {
    const n = i + 1;
    const sheet = `P${n}`;
    push(sheet, "C", pt.leitura_antes);
    push(sheet, "W", pt.rep1);
    push(sheet, "X", pt.rep2);
    push(sheet, "Y", pt.rep3);
  });

  return lines;
}
