import React, { useEffect } from "react";
import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import { EULA_TITLE, EULA_EFFECTIVE_DATE, EULA_SECTIONS } from "@/lib/legal/eulaContent";
import { LEGAL_ROUTES } from "@/lib/legal/copyright";
import { formatDocumentTitle } from "@/lib/appBranding";

export default function EulaPage() {
  useEffect(() => {
    document.title = formatDocumentTitle(EULA_TITLE);
  }, []);

  return (
    <LegalDocumentLayout
      title={EULA_TITLE}
      effectiveDate={EULA_EFFECTIVE_DATE}
      sections={EULA_SECTIONS}
      alternateLink={{
        label: "Consulte também a",
        to: LEGAL_ROUTES.license,
        linkText: "Licença de Uso — Todos os direitos reservados à CTLI",
      }}
    />
  );
}
