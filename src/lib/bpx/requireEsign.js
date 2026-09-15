/** Credenciais de e-signature no ato (senha + significado). */
export function requireEsignCredentials(opts, defaultMeaning) {
  const password = opts?.esignPassword || opts?.password;
  if (!password) {
    throw new Error("Assinatura eletrónica obrigatória (senha no ato).");
  }
  const meaning = String(opts?.esignMeaning || opts?.meaning || defaultMeaning || "").trim();
  if (!meaning) {
    throw new Error("Declare o significado da assinatura eletrónica.");
  }
  return { password, meaning };
}
