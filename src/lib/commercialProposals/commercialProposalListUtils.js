export function filterProposals(rows, { query = "", year = "" } = {}) {
  let list = rows || [];
  const q = String(query || "").trim().toLowerCase();
  if (year && year !== "all") {
    list = list.filter((r) => String(r.proposal_year) === String(year));
  }
  if (!q) return list;
  return list.filter((r) => {
    const snap = r.client_snapshot || {};
    const hay = [
      r.proposal_number,
      r.proposal_year,
      snap.company,
      snap.attention_to,
      r.subject,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function proposalYears(rows) {
  const years = new Set((rows || []).map((r) => r.proposal_year).filter(Boolean));
  return [...years].sort((a, b) => b - a);
}
