export function PdfHeader({ header, logoUrl }) {
  return (
    <header className="coleta-pdf-header">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="coleta-pdf-logo" />
      ) : (
        <div className="coleta-pdf-logo" aria-hidden="true" />
      )}
      <div className="coleta-pdf-proposal">{header.proposalLine}</div>
      <h1 className="coleta-pdf-title">{header.title}</h1>
      <div className="coleta-pdf-code">{header.codeLine}</div>
    </header>
  );
}

export function FieldRow({ label, value }) {
  return (
    <div className="coleta-field-row">
      <span className="coleta-label">{label}</span>
      <span className="coleta-value">{value || "\u00a0"}</span>
    </div>
  );
}
