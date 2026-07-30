/** Titular dos direitos — atualize razão social/CNPJ aqui quando disponíveis. */
export const RIGHTS_HOLDER = "CTLI";

/** Ano de referência do aviso de copyright (atualize conforme necessário). */
export const COPYRIGHT_YEAR = 2026;

export const PRODUCT_NAME = "QualiProc";

export const LEGAL_ROUTES = Object.freeze({
  eula: "/termos",
  license: "/licenca",
});

/** Frase padrão de copyright: © 2026 CTLI. Todos os direitos reservados. */
export function getCopyrightNotice(year = COPYRIGHT_YEAR) {
  return `© ${year} ${RIGHTS_HOLDER}. Todos os direitos reservados.`;
}

export const APP_COPYRIGHT = getCopyrightNotice();
export const APP_RIGHTS_HOLDER = RIGHTS_HOLDER;
