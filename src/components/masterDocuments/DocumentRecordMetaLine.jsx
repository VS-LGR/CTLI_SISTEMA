import React from "react";
import { Link } from "react-router-dom";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { masterDocumentDetailPath } from "@/lib/masterDocuments/masterDocumentRoutes";

export default function DocumentRecordMetaLine({
  code,
  reference,
  revision,
  modelIssueDate,
  title,
  masterDocumentId,
  isObsolete = false,
  isStale = false,
}) {
  const emissao = modelIssueDate ? formatDateBr(modelIssueDate) : "—";

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-500">
        {title ? (
          <>
            <span className="font-medium text-slate-700">{title}</span>
            {" · "}
          </>
        ) : null}
        {code} · Ref. {reference} · Rev. {revision} · Emissão {emissao}
        {masterDocumentId ? (
          <>
            {" · "}
            <Link
              to={masterDocumentDetailPath(masterDocumentId)}
              className="text-blue-600 hover:underline"
            >
              Lista Mestra
            </Link>
          </>
        ) : null}
      </p>
      {isObsolete ? (
        <p className="text-xs text-amber-700">
          Documento obsoleto na Lista Mestra. A exportação PDF pode estar bloqueada.
        </p>
      ) : null}
      {isStale && !isObsolete ? (
        <p className="text-xs text-amber-700">
          Revisão do registo difere da vigente na Lista Mestra. O PDF usa a revisão vigente.
        </p>
      ) : null}
    </div>
  );
}
