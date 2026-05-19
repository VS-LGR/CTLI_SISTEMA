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
      <AbsBlock style={layout.proposal} className="coleta-txt-proposal">
        {header.proposalLine}
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

export function FieldLine({ label, value, multiline = false }) {
  const valClass = multiline ? "coleta-underline-block" : "coleta-underline";
  return (
    <div className="coleta-field-line coleta-txt-body">
      <span>{label}</span>{" "}
      <span className={valClass}>{value || "\u00a0"}</span>
    </div>
  );
}
