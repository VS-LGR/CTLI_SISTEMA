import React from "react";
import {
  PencilSimple, FilePdf, Calculator, Archive, Trash, PaperPlaneTilt,
} from "@phosphor-icons/react";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import CertificateCalculationsHelp from "@/components/calibrationCertificates/CertificateCalculationsHelp";
import {
  isCertificateEditable,
  canMarkCertificateObsolete,
  canDeleteCertificate,
} from "@/lib/calibrationCertificates/certificateSchema";

function isSendableRow(row) {
  return ["aprovado", "emitido", "enviado"].includes(row.status);
}

/**
 * Ações por linha de certificado — menu padronizado.
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
  const items = [
    {
      key: "edit",
      label: "Abrir / editar",
      icon: PencilSimple,
      onSelect: onEdit,
    },
    editable && {
      key: "recalc",
      label: "Recalcular",
      icon: Calculator,
      onSelect: onRecalc,
    },
    {
      key: "pdf",
      label: "Prévia PDF",
      icon: FilePdf,
      onSelect: onPreview,
    },
    canSend && isSendableRow(row) && {
      key: "email",
      label: "Enviar por e-mail",
      icon: PaperPlaneTilt,
      disabled: busy,
      onSelect: onSendEmail,
    },
    canMarkCertificateObsolete(row.status) && {
      key: "obsolete",
      label: "Marcar obsoleto",
      icon: Archive,
      separatorBefore: true,
      onSelect: onObsolete,
    },
    canDeleteCertificate(row.status) && {
      key: "delete",
      label: "Remover permanentemente",
      icon: Trash,
      destructive: true,
      separatorBefore: !canMarkCertificateObsolete(row.status),
      onSelect: onDelete,
    },
  ].filter(Boolean);

  return (
    <div
      className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 justify-end"
      data-testid="certificate-row-actions"
    >
      <ListRowActionsMenu items={items} disabled={busy} />
      {editable && <CertificateCalculationsHelp iconOnly />}
    </div>
  );
}
