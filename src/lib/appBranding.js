export const APP_NAME = "MetroX";
export const APP_TAGLINE = "Powered by CTLI";
export const APP_SHORT_DESCRIPTION = "Sistema de gestão da qualidade";
export const APP_DOCUMENT_TITLE = "MetroX | CTLI";
export const APP_META_DESCRIPTION = "MetroX — sistema de gestão da qualidade powered by CTLI.";
export const APP_THEME_COLOR = "#1e3a8a";

export const APP_LOGO_SQUARE = "/QuadradaCTLI.webp";
export const APP_LOGO_MARK = "/CircularaCTLI.webp";
export const APP_LOGO_WIDE = "/FerroviariaCTLI.webp";

export function formatDocumentTitle(page) {
  if (!page?.trim()) return APP_DOCUMENT_TITLE;
  return `${page.trim()} · ${APP_NAME}`;
}
