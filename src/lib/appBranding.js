import {
  APP_COPYRIGHT as LEGAL_COPYRIGHT,
  APP_RIGHTS_HOLDER,
  LEGAL_ROUTES,
} from "@/lib/legal/copyright";

export const APP_NAME = "QUATI";
export const APP_TAGLINE = "Sistemas";
export const APP_LOGO_TAGLINE = "Qualidade · Usabilidade · Aplicações · Tecnologia · Inovação";
export const APP_SHORT_DESCRIPTION = "Sistema de gestão da qualidade";
export const APP_DOCUMENT_TITLE = "QUATI | Sistemas";
export const APP_META_DESCRIPTION =
  "QUATI — Qualidade, Usabilidade, Aplicações, Tecnologia e Inovação.";
export const APP_THEME_COLOR = "#050505";
export const APP_BRAND_ORANGE = "#F97316";
export const APP_BRAND_GOLD = "#FBBF24";

/** © YYYY CTLI. Todos os direitos reservados. */
export const APP_COPYRIGHT = LEGAL_COPYRIGHT;
export { APP_RIGHTS_HOLDER, LEGAL_ROUTES };

/** Único ficheiro de marca: símbolo (public/Logo_QUATI.png). */
export const APP_LOGO = "/Logo_QUATI.png";

export const APP_LOGO_WIDE = APP_LOGO;

export const APP_LOGO_SQUARE = APP_LOGO;
export const APP_LOGO_MARK = APP_LOGO;
export const APP_FAVICON = APP_LOGO;

export function formatDocumentTitle(page) {
  if (!page?.trim()) return APP_DOCUMENT_TITLE;
  return `${page.trim()} · ${APP_NAME}`;
}
