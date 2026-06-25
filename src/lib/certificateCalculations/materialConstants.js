/** Tabela PR-7.2 (densidade) + PR-7.8 (PPM empuxo). */

export const MATERIAL_PRESETS = [
  { id: "aco", label: "Aço", density: 7900, ppm: 1 },
  { id: "ferro", label: "Ferro fundido ou similar", density: 7850, ppm: 2 },
  { id: "latao", label: "Latão / Bronze", density: 8400, ppm: 3 },
  { id: "niquel", label: "Níquel", density: 8600, ppm: 4 },
  { id: "aluminio", label: "Alumínio", density: 2700, ppm: 30 },
  { id: "agua", label: "Água", density: 1000, ppm: 110 },
  { id: "solvente", label: "Solventes orgânicos", density: 800, ppm: 140 },
  { id: "platina", label: "Platina", density: 21500, ppm: 1 },
];

export function presetById(id) {
  return MATERIAL_PRESETS.find((p) => p.id === id) || null;
}

export function ppmFromPresetId(id) {
  return presetById(id)?.ppm ?? null;
}

export function densityFromPresetId(id) {
  return presetById(id)?.density ?? null;
}

export const DEFAULT_MATERIAL_DENSITY = 7900;
