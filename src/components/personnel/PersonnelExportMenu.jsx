import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretDown, FilePdf, FileDoc } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function PersonnelExportMenu({
  onExportPdf,
  onExportDocx,
  disabled = false,
  size = "sm",
  variant = "ghost",
  label = null,
  className = "",
}) {
  const [busy, setBusy] = useState(false);

  const run = async (fn, format) => {
    if (!fn || busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(format === "pdf" ? "PDF gerado" : "Word gerado");
    } catch (e) {
      toast.error(e.message || "Falha na exportação");
    } finally {
      setBusy(false);
    }
  };

  if (!onExportDocx) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled || busy}
        className={className}
        title="Exportar PDF"
        aria-label="Exportar PDF"
        onClick={() => run(onExportPdf, "pdf")}
      >
        <FilePdf size={16} className={label ? "mr-1" : ""} />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || busy}
          className={className}
          aria-label="Exportar documento"
        >
          {label ? (
            <>
              {label}
              <CaretDown size={12} className="ml-1" />
            </>
          ) : (
            <>
              <FilePdf size={16} />
              <CaretDown size={12} className="ml-0.5" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!onExportPdf || busy}
          onClick={() => run(onExportPdf, "pdf")}
        >
          <FilePdf size={16} className="mr-2" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!onExportDocx || busy}
          onClick={() => run(onExportDocx, "docx")}
        >
          <FileDoc size={16} className="mr-2" />
          Exportar Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
