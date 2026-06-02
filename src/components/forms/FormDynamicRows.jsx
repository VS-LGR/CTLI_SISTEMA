import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import FormRowsTableShell, { FormRowsTableHead, FormRowsTableBody } from "@/components/forms/FormRowsTableShell";

export default function FormDynamicRows({
  items = [],
  readOnly = false,
  onAdd,
  addLabel = "Adicionar linha",
  tableMinWidth = "640px",
  renderTableHeader,
  renderMobileRow,
  renderTableRow,
  className = "",
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className={`space-y-4 min-w-0 ${className}`}>
      {!isDesktop && (
        <div className="space-y-3 min-w-0">
          {items.map((item, idx) => renderMobileRow(item, idx))}
        </div>
      )}

      {isDesktop && (
        <FormRowsTableShell tableMinWidth={tableMinWidth}>
          <FormRowsTableHead>
            <tr>{renderTableHeader?.()}</tr>
          </FormRowsTableHead>
          <FormRowsTableBody>
            {items.map((item, idx) => renderTableRow(item, idx))}
          </FormRowsTableBody>
        </FormRowsTableShell>
      )}

      {!readOnly && onAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="w-full sm:w-auto"
        >
          <Plus size={16} className="mr-1.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
