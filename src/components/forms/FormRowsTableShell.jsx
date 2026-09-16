import React from "react";

export default function FormRowsTableShell({
  children,
  tableMinWidth = "640px",
  className = "",
}) {
  return (
    <div
      className={`overflow-x-auto border border-border rounded-xl bg-card min-w-0 max-h-[min(70vh,720px)] overflow-y-auto ${className}`}
    >
      <table className="w-full text-sm border-collapse" style={{ minWidth: tableMinWidth }}>
        {children}
      </table>
    </div>
  );
}

export function FormRowsTableHead({ children }) {
  return (
    <thead className="bg-background text-muted-foreground border-b border-border sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226_232_240)]">
      {children}
    </thead>
  );
}

export function FormRowsTableBody({ children }) {
  return <tbody>{children}</tbody>;
}
