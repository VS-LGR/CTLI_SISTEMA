import { supabase } from "@/lib/supabaseClient";
import { buildScaleRegistrationFromBalance } from "./scaleRegistrationUtils";

export { buildScaleRegistrationFromBalance };

export function validateScaleRegistrationInput({ endCustomerId, balanca }) {
  if (!endCustomerId) return "Selecione um cliente para vincular a balança";
  if (!String(balanca?.serie ?? "").trim()) return "Informe o número de série da balança";
  return null;
}

/** Persiste balança preenchida manualmente no cadastro do cliente. */
export async function createScaleRegistrationFromBalance({
  tenantId,
  endCustomerId,
  balanca,
  legalMetrology = false,
}) {
  const validationError = validateScaleRegistrationInput({ endCustomerId, balanca });
  if (validationError) throw new Error(validationError);
  if (!tenantId) throw new Error("Selecione um ambiente");

  const payload = buildScaleRegistrationFromBalance({
    tenantId,
    endCustomerId,
    balanca,
    legalMetrology,
  });

  const { data, error } = await supabase
    .from("scale_registrations")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
