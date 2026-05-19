/** Metadados do formulário RE-7.2A por ambiente (tenant) */

export const DEFAULT_COLETA_FORM_CODE = "RE-7.2A";
export const DEFAULT_COLETA_FORM_TITLE = "Coleta de Dados";
export const DEFAULT_COLETA_FORM_REVISION = "Rev. 03 de 14.05.26";
export const DEFAULT_COLETA_FORM_REF = "PR-7.2";

export function coletaDocMetaFromTenant(tenant) {
  return {
    code: tenant?.coleta_form_code || DEFAULT_COLETA_FORM_CODE,
    title: tenant?.coleta_form_title || DEFAULT_COLETA_FORM_TITLE,
    revision: tenant?.coleta_form_revision || DEFAULT_COLETA_FORM_REVISION,
    ref: DEFAULT_COLETA_FORM_REF,
  };
}

export function formatColetaDocFullTitle(tenant) {
  const m = coletaDocMetaFromTenant(tenant);
  return `${m.code} ${m.title} ${m.revision}`.trim();
}

export function formatColetaDocHeaderLine(tenant) {
  const m = coletaDocMetaFromTenant(tenant);
  return `Cód. ${m.code}  Ref. ${m.ref}  ${m.revision}`;
}

export function formatColetaDocSubtitle(tenant) {
  return coletaDocMetaFromTenant(tenant).title;
}
