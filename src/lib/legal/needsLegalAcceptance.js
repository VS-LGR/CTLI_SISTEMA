import { LEGAL_ACCEPTANCE_VERSION } from "./acceptance";
import { PRIVACY_VERSION } from "./privacyContent";

/**
 * True se o utilizador autenticado ainda não aceitou EULA+licença e privacidade na versão vigente.
 */
export function needsLegalAcceptance(user) {
  if (!user || user === false) return false;
  const legalOk = Boolean(user.legal_accepted_at)
    && String(user.legal_accepted_version || "") === LEGAL_ACCEPTANCE_VERSION;
  const privacyOk = Boolean(user.privacy_accepted_at)
    && String(user.privacy_accepted_version || "") === PRIVACY_VERSION;
  return !(legalOk && privacyOk);
}
