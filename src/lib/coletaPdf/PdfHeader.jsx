import React from "react";
import { AbsBlock } from "./AbsBlock";
import { FRENTE } from "./layoutSpec";

export function PdfHeader({ header, logoUrl, layout = FRENTE.header }) {
  return (
    <>
      <AbsBlock style={layout.logo} className="coleta-txt-body">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="coleta-pdf-logo" />
        ) : null}
      </AbsBlock>
      <AbsBlock style={layout.proposal} className="coleta-proposal-box coleta-txt-proposal">
        <span className="coleta-proposal-label">Referente à Proposta Comercial:</span>
        <span className="coleta-proposal-value">
          {header.commercialProposalRef || "\u00a0"}
        </span>
      </AbsBlock>
      <AbsBlock style={layout.title} className="coleta-txt-title">
        {header.title}
      </AbsBlock>
      <AbsBlock style={layout.code} className="coleta-txt-code">
        {header.codeLine}
      </AbsBlock>
    </>
  );
}

function fieldLabelDisplay(label) {
  const t = String(label ?? "").trim();
  if (!t) return "";
  return t.endsWith(":") ? t : `${t}:`;
}

export function FieldLine({ label, value, multiline = false }) {
  const valClass = multiline ? "coleta-underline-block" : "coleta-underline";
  return (
    <div className="coleta-field-line coleta-txt-body">
      <span>{fieldLabelDisplay(label)}</span>{" "}
      <span className={valClass}>{value || "\u00a0"}</span>
    </div>
  );
}
