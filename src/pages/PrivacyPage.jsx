import React, { useEffect } from "react";
import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import { PRIVACY_TITLE, PRIVACY_EFFECTIVE_DATE, PRIVACY_SECTIONS } from "@/lib/legal/privacyContent";
import { LEGAL_ROUTES } from "@/lib/legal/copyright";
import { formatDocumentTitle } from "@/lib/appBranding";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = formatDocumentTitle(PRIVACY_TITLE);
  }, []);

  return (
    <LegalDocumentLayout
      title={PRIVACY_TITLE}
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      sections={PRIVACY_SECTIONS}
      alternateLink={{
        label: "Consulte também os",
        to: LEGAL_ROUTES.eula,
        linkText: "Termos de Adesão",
      }}
    />
  );
}
