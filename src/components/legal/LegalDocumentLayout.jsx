import React from "react";
import { Link } from "react-router-dom";
import { APP_NAME, APP_COPYRIGHT, LEGAL_ROUTES } from "@/lib/appBranding";
import AppBrand from "@/components/branding/AppBrand";

/**
 * Layout tipográfico partilhado para documentos legais públicos.
 */
export default function LegalDocumentLayout({
  title,
  effectiveDate,
  sections = [],
  alternateLink,
}) {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/login" className="min-w-0 shrink-0" aria-label={`Ir para login ${APP_NAME}`}>
            <AppBrand className="[&_img]:h-10 [&_img]:sm:h-10 [&_p]:hidden" />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
            <Link to={LEGAL_ROUTES.eula} className="hover:text-blue-700 hover:underline">
              Termos de Adesão
            </Link>
            <span className="text-slate-300" aria-hidden>
              |
            </span>
            <Link to={LEGAL_ROUTES.license} className="hover:text-blue-700 hover:underline">
              Licença
            </Link>
            <span className="text-slate-300" aria-hidden>
              |
            </span>
            <Link to="/login" className="hover:text-blue-700 hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 min-w-0 w-full">
        <div className="space-y-2 min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 break-words">
            {title}
          </h1>
          {effectiveDate && (
            <p className="text-sm text-slate-500">Vigência: {effectiveDate}</p>
          )}
          <p className="text-xs text-slate-500">{APP_COPYRIGHT}</p>
        </div>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-2 min-w-0">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {section.title}
              </h2>
              {(section.paragraphs || []).map((p, i) => (
                <p key={`${section.id}-p-${i}`} className="break-words">
                  {p}
                </p>
              ))}
              {section.bullets?.length > 0 && (
                <ul className="list-disc pl-5 space-y-1.5">
                  {section.bullets.map((item, i) => (
                    <li key={`${section.id}-b-${i}`} className="break-words">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {alternateLink && (
          <p className="text-sm text-slate-600 border-t border-slate-200 pt-6">
            {alternateLink.label}{" "}
            <Link to={alternateLink.to} className="text-blue-600 hover:underline">
              {alternateLink.linkText}
            </Link>
          </p>
        )}

        <footer className="border-t border-slate-200 pt-6 pb-8 text-xs text-slate-500 space-y-1">
          <p>{APP_COPYRIGHT}</p>
          <p>
            {APP_NAME} — software e serviço da CTLI. Todos os direitos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}
