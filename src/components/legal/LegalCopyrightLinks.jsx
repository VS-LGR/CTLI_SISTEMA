import React from "react";
import { Link } from "react-router-dom";
import { APP_COPYRIGHT, LEGAL_ROUTES } from "@/lib/appBranding";

/**
 * Aviso de copyright CTLI + links para Termos e Licença.
 */
export default function LegalCopyrightLinks({
  className = "",
  noticeClassName = "text-xs text-slate-500",
  linksClassName = "text-xs text-slate-500",
  linkClassName = "text-blue-600 hover:underline",
  separator = " | ",
}) {
  return (
    <div className={`space-y-1 min-w-0 ${className}`.trim()}>
      <p className={`${noticeClassName} break-words`}>{APP_COPYRIGHT}</p>
      <p className={`${linksClassName} break-words`}>
        <Link to={LEGAL_ROUTES.eula} className={linkClassName}>
          Termos de Adesão
        </Link>
        <span className="text-slate-400" aria-hidden>
          {separator}
        </span>
        <Link to={LEGAL_ROUTES.license} className={linkClassName}>
          Licença
        </Link>
      </p>
    </div>
  );
}
