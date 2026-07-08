import React from "react";
import { Button } from "@/components/ui/button";
import { PencilSimple, FilePdf, Calculator, Archive, Trash, PaperPlaneTilt } from "@phosphor-icons/react";
import CertificateCalculationsHelp from "@/components/calibrationCertificates/CertificateCalculationsHelp";
import {
  isCertificateEditable,
  canMarkCertificateObsolete,
  canDeleteCertificate,
} from "@/lib/calibrationCertificates/certificateSchema";

const iconBtn =
  "h-8 w-8 p-0 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900";

function isSendableRow(row) {
  return ["aprovado", "emitido", "enviado"].includes(row.status);
}

/**
 * Grupo de ações por linha — tipografia/hierarquia visual consistente.
 */
export default function CertificateRowActions({
  row,
  canSend = false,
  busy = false,
  onEdit,
  onRecalc,
  onPreview,
  onSendEmail,
  onObsolete,
  onDelete,
}) {
  const editable = isCertificateEditable(row.status);
  const showDestructive =
    canMarkCertificateObsolete(row.status) || canDeleteCertificate(row.status);

  return (
    <div className="inline-flex items-center gap-0.5 whitespace-nowrap" data-testid="certificate-row-actions">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtn}
        onClick={onEdit}
        title="Abrir / editar"
        aria-label="Abrir certificado"
      >
        <PencilSimple size={16} />
      </Button>
      {editable && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={iconBtn}
            onClick={onRecalc}
            title="Recalcular"
            aria-label="Recalcular certificado"
          >
            <Calculator size={16} />
          </Button>
          <CertificateCalculationsHelp iconOnly />
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtn}
        onClick={onPreview}
        title="Prévia PDF"
        aria-label="Prévia PDF"
      >
        <FilePdf size={16} />
      </Button>
      {canSend && isSendableRow(row) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`${iconBtn} text-blue-700 hover:text-blue-900 hover:bg-blue-50`}
          onClick={onSendEmail}
          title="Enviar por e-mail"
          aria-label="Enviar por e-mail"
          disabled={busy}
        >
          <PaperPlaneTilt size={16} />
        </Button>
      )}
      {showDestructive && (
        <span className="mx-1 h-5 w-px bg-slate-200 shrink-0" aria-hidden />
      )}
      {canMarkCertificateObsolete(row.status) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`${iconBtn} text-amber-700 hover:text-amber-900 hover:bg-amber-50`}
          onClick={onObsolete}
          title="Marcar obsoleto"
          aria-label="Marcar obsoleto"
        >
          <Archive size={16} />
        </Button>
      )}
      {canDeleteCertificate(row.status) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`${iconBtn} text-red-600 hover:text-red-800 hover:bg-red-50`}
          onClick={onDelete}
          title="Remover permanentemente"
          aria-label="Remover permanentemente"
        >
          <Trash size={16} />
        </Button>
      )}
    </div>
  );
}
