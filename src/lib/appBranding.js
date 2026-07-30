import {
  APP_COPYRIGHT as LEGAL_COPYRIGHT,
  APP_RIGHTS_HOLDER,
  LEGAL_ROUTES,
} from "@/lib/legal/copyright";

export const APP_NAME = "QualiProc";
export const APP_TAGLINE = "powered by CTLI";
export const APP_LOGO_TAGLINE = "Qualidade · Precisão · Confiança";
export const APP_SHORT_DESCRIPTION = "Sistema de gestão da qualidade";
export const APP_DOCUMENT_TITLE = "QualiProc | powered by CTLI";
export const APP_META_DESCRIPTION = "QualiProc — sistema de gestão da qualidade powered by CTLI.";
export const APP_THEME_COLOR = "#1e3a8a";

/** © YYYY CTLI. Todos os direitos reservados. */
export const APP_COPYRIGHT = LEGAL_COPYRIGHT;
export { APP_RIGHTS_HOLDER, LEGAL_ROUTES };

/** Logo principal QualiProc (public/LogoQuliProc.png). */
export const APP_LOGO = "/LogoQuliProc.png";

export const APP_LOGO_SQUARE = APP_LOGO;
export const APP_LOGO_MARK = APP_LOGO;
export const APP_LOGO_WIDE = APP_LOGO;
export const APP_FAVICON = APP_LOGO;

export function formatDocumentTitle(page) {
  if (!page?.trim()) return APP_DOCUMENT_TITLE;
  return `${page.trim()} · ${APP_NAME}`;
}
