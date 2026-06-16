/** @param {Array<{ area?: string, copy_number?: number|null }>} distributions */
export function formatDistributionSummary(distributions) {
  if (!distributions?.length) return "—";
  const areas = [...new Set(distributions.map((d) => d.area).filter(Boolean))];
  if (areas.length) return areas.join(", ");
  return distributions.map((d) => (d.copy_number != null ? `Cópia ${d.copy_number}` : "—")).join(", ");
}

/** @param {Array<{ master_document_id: string, area?: string, copy_number?: number|null }>} allDistributions */
export function buildDistributionMap(allDistributions) {
  const map = {};
  for (const d of allDistributions || []) {
    if (!d.master_document_id) continue;
    if (!map[d.master_document_id]) map[d.master_document_id] = [];
    map[d.master_document_id].push(d);
  }
  return map;
}

export function getDistributionSummaryForDoc(distributionMap, docId) {
  return formatDistributionSummary(distributionMap[docId] || []);
}
