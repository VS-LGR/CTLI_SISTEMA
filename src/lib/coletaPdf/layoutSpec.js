/** Canvas A4 PDF24 (coletaa.html / coletaVerso.html) */
export const PAGE_EM_W = 49.58333;
export const PAGE_EM_H = 70.08334;
export const PAGE_PX_W = 794;
export const PAGE_PX_H = 1123;
/** 10pt base → 1em ≈ 13.33px; page width ≈ 794px at 96dpi */
export const PAGE_FONT_PT = 10;
/** px por em para o canvas bater com PAGE_PX_W (794px) */
export const PAGE_EM_PX = PAGE_PX_W / PAGE_EM_W;

/** @param {number} top @param {number} left @param {number} [width] @param {number} [height] */
export function pos(top, left, width, height) {
  const style = { position: "absolute", boxSizing: "border-box" };
  if (top != null) style.top = `${top}em`;
  if (left != null) style.left = `${left}em`;
  if (width != null) style.width = `${width}em`;
  if (height != null) style.height = `${height}em`;
  return style;
}

export const FRENTE = {
  header: {
    logo: pos(0.5, 0.5, 8, 3.5),
    proposal: pos(1.2, 40.7, 8.5, 1.2),
    title: pos(1.1, 11.57, 27, 1.2),
    code: pos(3.1, 19.03, 12, 0.8),
  },
  sec1: {
    title: pos(4.74, 0.73, 20, 0.8),
    cliente: pos(6.0, 0.73, 48, 0.9),
    responsavel: pos(7.1, 0.73, 48, 0.9),
  },
  sec2: {
    title: pos(8.55, 0.73, 22, 0.8),
    row1: pos(9.65, 2.25, 47.5, 2.1),
    row2: pos(11.9, 2.25, 47.5, 2.1),
    tipoBalanca: pos(14.5, 0.74, 48.5, 2.2),
    tipoPlataforma: pos(16.87, 0.74, 48.5, 3.5),
  },
  sec3: {
    title: pos(20.54, 0.73, 30, 0.8),
    block: pos(21.6, 0.73, 48.5, 11.5),
    ambLeft: pos(21.8, 2.24, 31, 10.5),
    ambRight: pos(21.8, 34, 15, 10.5),
  },
  sec4: {
    title: pos(33.89, 0.73, 18, 0.8),
    valor: pos(35.2, 0.73, 18, 1),
    table: pos(36.5, 0.73, 18.5, 9.5),
  },
  sec5: {
    title: pos(33.89, 21.32, 12, 0.8),
    block: pos(35.2, 21.32, 28, 10.5),
  },
  sec6: {
    title: pos(46.51, 0.73, 25, 0.8),
    subTitle: pos(48.52, 19.46, 12, 0.7),
    table: pos(49.68, 0.75, 48.5, 19.5),
  },
  footer: pos(69.57, 43.4, 6, 0.6),
};

/** Colunas tabela calibração (left em em, width em em) */
export const CAL_TABLE_COLS = {
  label: { left: 0, width: 1.8 },
  peso: { left: 1.8, width: 6.5 },
  antes: { left: 8.3, width: 6.5 },
  rep1: { left: 14.8, width: 5.8 },
  rep2: { left: 20.6, width: 5.8 },
  rep3: { left: 26.4, width: 5.8 },
  ids: { left: 32.2, width: 16.3 },
};

export const CAL_ROW_HEIGHT_EM = 1.95;
export const CAL_ROW_START_EM = 2.2;

export const VERSO = {
  header: {
    logo: pos(0.5, 0.5, 8, 3.5),
    proposal: pos(1.2, 40.7, 8.5, 1.2),
    title: pos(1.1, 11.24, 27, 1.2),
    code: pos(3.1, 18.7, 12, 0.8),
  },
  sec1: {
    title: pos(5.62, 0.97, 22, 0.8),
    box: pos(6.5, 0.97, 48, 11),
  },
  sec2: {
    title: pos(17.9, 0.97, 22, 0.8),
    q21: pos(20.45, 2.49, 33, 0.9),
    q22: pos(22.12, 2.49, 33, 0.9),
    q23: pos(23.79, 2.49, 38, 0.9),
  },
  sec3: {
    title: pos(26.42, 0.97, 30, 0.8),
    table: pos(27.85, 0.97, 48, 39),
  },
  nota: pos(66.5, 0.97, 48, 1.2),
  obs: pos(67.89, 0.98, 48, 1.2),
  footer: {
    left: pos(69.2, 0.5, 14, 0.6),
    center: pos(69.2, 38, 12, 0.6),
    right: pos(69.2, 42, 7, 0.6),
  },
};

/** Colunas tabela substituição (verso) */
export const SUB_TABLE_COLS = [
  { key: "label", width: 3.2 },
  { key: "nom", width: 6.8 },
  { key: "l1", width: 5.8 },
  { key: "l2", width: 5.8 },
  { key: "l3", width: 5.8 },
  { key: "massa", width: 4.5 },
  { key: "temp", width: 4.2 },
  { key: "umid", width: 4.5 },
  { key: "press", width: 4.2 },
];

export const SUB_ROW_HEIGHT_EM = 2.15;
