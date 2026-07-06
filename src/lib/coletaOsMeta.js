/** Metadados de ordem de serviço (O.S.) para coleta RE-7.2A */

import { supabase } from "@/lib/supabaseClient";

export function padOsNumber(n, width = 3) {
  if (n == null || n === "") return "";
  return String(n).padStart(width, "0");
}

export function formatCollectionRef(collectionNumber, collectionYear) {
  if (collectionNumber == null || collectionNumber === "") return "";
  const num = padOsNumber(collectionNumber);
  return collectionYear ? `${num}/${collectionYear}` : num;
}

export function formatColetaOsTitle({ collectionNumber, collectionYear } = {}) {
  const ref = formatCollectionRef(collectionNumber, collectionYear);
  if (!ref) return "";
  const os = padOsNumber(collectionNumber);
  return `Coleta de dados ${ref} - O.S. ${os}`;
}

export function formatColetaProposalLine(commercialProposalRef) {
  const ref = (commercialProposalRef || "").trim();
  if (!ref) return "";
  return `Referente à proposta comercial ${ref}`;
}

export function formatColetaWorkOrderHeader(row) {
  const lines = [];
  const proposalLine = formatColetaProposalLine(row?.commercial_proposal_ref);
  if (proposalLine) lines.push(proposalLine);
  const osLine = formatColetaOsTitle({
    collectionNumber: row?.collection_number,
    collectionYear: row?.collection_year,
  });
  if (osLine) lines.push(osLine);
  return lines;
}

export function formatColetaWorkOrderHeaderText(row) {
  return formatColetaWorkOrderHeader(row).join("\n");
}

export function coletaOsSearchTokens(row) {
  const tokens = [];
  if (row?.collection_number != null) {
    tokens.push(String(row.collection_number));
    tokens.push(padOsNumber(row.collection_number));
    tokens.push(formatCollectionRef(row.collection_number, row.collection_year));
    tokens.push(formatColetaOsTitle(row));
  }
  return tokens;
}

/** Atribui número sequencial de O.S. para nova coleta. */
export async function assignNextCollectionNumber(tenantId, year = new Date().getFullYear()) {
  const { data, error } = await supabase.rpc("next_collection_number", {
    p_tenant_id: tenantId,
    p_year: year,
  });
  if (error) throw error;
  return { collection_number: data, collection_year: year };
}
