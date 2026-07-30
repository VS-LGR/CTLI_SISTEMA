import React, { useEffect } from "react";
import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import {
  LICENSE_TITLE,
  LICENSE_EFFECTIVE_DATE,
  LICENSE_SECTIONS,
} from "@/lib/legal/licenseContent";
import { LEGAL_ROUTES } from "@/lib/legal/copyright";
import { formatDocumentTitle } from "@/lib/appBranding";

export default function LicensePage() {
  useEffect(() => {
    document.title = formatDocumentTitle(LICENSE_TITLE);
  }, []);

  return (
    <LegalDocumentLayout
      title={LICENSE_TITLE}
      effectiveDate={LICENSE_EFFECTIVE_DATE}
      sections={LICENSE_SECTIONS}
      alternateLink={{
        label: "Consulte também os",
        to: LEGAL_ROUTES.eula,
        linkText: "Termos de Adesão ao Serviço (EULA)",
      }}
    />
  );
}
