import { filterCadastroByQuery } from "@/lib/cadastroListUtils";
import { massToGrams } from "@/lib/massValueUtils";
import { parseCalibrationNumber } from "@/lib/certificateCalculations/parseNumber";
import {
  isLoadBatchItem,
} from "@/lib/standardWeightItemUtils";

export const WEIGHT_PICKER_SORT_OPTIONS = [
  { value: "nominal_asc", label: "Peso nominal (menor → maior)" },
  { value: "nominal_desc", label: "Peso nominal (maior → menor)" },
  { value: "identification_asc", label: "Identificação (A–Z)" },
];

export const WEIGHT_PICKER_KIND_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "weights", label: "Pesos padrão" },
  { value: "load_batches", label: "Lotes de carga" },
];

export { isLoadBatchItem };

export function filterWeightItemsByKind(items, kind = "all") {
  const list = items || [];
  if (kind === "weights") return list.filter((i) => !isLoadBatchItem(i));
  if (kind === "load_batches") return list.filter((i) => isLoadBatchItem(i));
  return list;
}

export function weightItemSearchHaystack(item) {
  return [
    item?.identification,
    item?.nominal_value,
    item?.unit,
    item?.conventional_value,
    item?.certificate_number,
    item?.expanded_uncertainty,
    isLoadBatchItem(item) ? "lote de carga" : "",
  ];
}

export function nominalSortGrams(item) {
  const grams = massToGrams(item?.nominal_value, item?.unit || "g");
  if (grams != null && Number.isFinite(grams)) return grams;
  const parsed = parseCalibrationNumber(item?.nominal_value);
  if (parsed.valid) return parsed.value;
  return Number.POSITIVE_INFINITY;
}

export function sortWeightItems(items, sortKey = "nominal_asc") {
  const list = [...(items || [])];
  list.sort((a, b) => {
    if (sortKey === "identification_asc") {
      return String(a.identification || "").localeCompare(String(b.identification || ""), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    }
    const ga = nominalSortGrams(a);
    const gb = nominalSortGrams(b);
    if (sortKey === "nominal_desc") return gb - ga;
    return ga - gb;
  });
  return list;
}

export function filterAndSortWeightItems(
  items,
  { query = "", sortKey = "nominal_asc", kind = "all" } = {},
) {
  const byKind = filterWeightItemsByKind(items, kind);
  const filtered = filterCadastroByQuery(byKind, query, weightItemSearchHaystack);
  return sortWeightItems(filtered, sortKey);
}
