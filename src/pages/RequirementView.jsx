import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useOutletContext, Link, Navigate, useSearchParams } from "react-router-dom";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";
import { RESPONSIBLE_ROLES } from "@/lib/roles";
import {
  REQ_NAMES,
  requiresFolderNav,
  getFirstFolderKey,
  isValidFolderKey,
  getFolderLabel,
  getFoldersForRequirement,
} from "@/lib/requirementNavConfig";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";
import {
  getFolderDocumentMode,
  getVisibleSections,
  isSignaturesFolder,
  isFileOnlyFolder,
  allowsRichEditor,
  isPurchaseOrdersFolder,
  isCommercialProposalsFolder,
  isMasterDocumentListFolder,
} from "@/lib/documentFolderConfig";
import PurchaseOrdersListPanel from "@/components/purchaseOrders/PurchaseOrdersListPanel";
import QuotationRequestsListPanel from "@/components/quotationRequests/QuotationRequestsListPanel";
import CommercialProposalsListPanel from "@/components/commercialProposals/CommercialProposalsListPanel";
import {
  listDocuments,
  createDocument,
  formatDocumentError,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  exportDocumentBlob,
  downloadOriginalFile,
  toggleDocumentPin,
} from "@/lib/documentsApi";
import { triggerBlobDownload } from "@/lib/blobDownload";
import { tryConvertDocxToHtml } from "@/lib/docxImport";
import { isDocxFile, uploadSuccessMessage } from "@/lib/docxFileUtils";
import { documentUsesDocxEditor, scheduleDocxEditorPreload } from "@/lib/preloadDocxEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Plus, DownloadSimple, FileText, FilePdf, FileDoc, ArrowsClockwise, Trash, PencilSimple, Upload, Archive, Eye, MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { COLETA_REQ_ID, COLETA_FOLDER_KEY } from "@/lib/coletaRoutes";
import {
  PERSONNEL_REQ_ID,
  PERSONNEL_FOLDER_KEY,
  PERSONNEL_DEFAULT_REGISTRO_SECTION,
  isPersonnelRegistroFolderSection,
  personnelFolderSectionToTopic,
} from "@/lib/personnelRegistrosRoutes";
import {
  canAccessColeta,
  canAccessPersonnel,
  canAccessMasterDocuments,
  canAccessCalibrationCertificates,
  isCtliAdmin,
} from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import ConfirmDeleteDialog from "@/components/documents/ConfirmDeleteDialog";
import PermanentDeleteDialog from "@/components/ui/PermanentDeleteDialog";
import { shouldSyncTenantDocumentToMasterList } from "@/lib/masterDocuments/syncTenantDocumentToMasterList";
import AssinaturasSection from "@/components/documents/AssinaturasSection";
import { findMasterDocumentByCode } from "@/lib/masterDocuments/masterDocumentsApi";
import { inferProcedureCodeFromFolder } from "@/lib/masterDocuments/masterDocumentRoutes";

const ColetaPage = lazy(() => import("@/pages/ColetaPage"));
const CertificateListPage = lazy(() => import("@/pages/CertificateListPage"));
const WeightCertificateListPage = lazy(() => import("@/pages/WeightCertificateListPage"));
const DeviceTechnicalSheetPage = lazy(() => import("@/pages/DeviceTechnicalSheetPage"));
const EquipmentVerificationListPage = lazy(() => import("@/pages/EquipmentVerificationListPage"));
const PersonnelRegistrosPage = lazy(() => import("@/pages/PersonnelRegistrosPage"));
const MasterDocumentHub = lazy(() => import("@/components/masterDocuments/MasterDocumentHub"));

function filterBySearch(docs, searchQuery) {
  if (!searchQuery.trim()) return docs;
  const q = searchQuery.toLowerCase();
  return docs.filter((d) =>
    [d.title, d.code, d.version, d.responsible, d.file_name].some((x) => (x || "").toLowerCase().includes(q)),
  );
}

const CreateDocDialog = ({ tenantId, requirement, folderKey, section, sectionLabel, onCreated }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const canImportWord = allowsRichEditor(requirement, folderKey);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emission, setEmission] = useState("");
  const [revision, setRevision] = useState("1.0");
  const [responsible, setResponsible] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [responsibles, setResponsibles] = useState([]);

  useEffect(() => {
    if (!open || !tenantId) return;
    loadTenantResponsibles(tenantId).then(setResponsibles).catch(() => setResponsibles([]));
  }, [open, tenantId]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setEmission("");
      setRevision("1.0");
      setResponsible("");
      setReviewDate("");
      setFile(null);
    }
  }, [open]);

  const save = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    if (!tenantId) return toast.error("Selecione um ambiente no topo.");
    setBusy(true);
    try {
      const body = {
        tenant_id: tenantId,
        requirement: String(requirement),
        section,
        title: title.trim(),
        code: emission,
        version: revision,
        responsible,
        review_date: reviewDate || null,
        content_html: "",
        status: "vigente",
      };
      if (requiresFolderNav(requirement) && folderKey) body.folder_key = folderKey;
      const procCode = inferProcedureCodeFromFolder(folderKey);
      if (procCode && tenantId) {
        try {
          const masterDoc = await findMasterDocumentByCode(tenantId, procCode);
          if (masterDoc?.id) body.master_document_id = masterDoc.id;
        } catch { /* optional link */ }
      }
      let data = await createDocument(body, user?.id);
      if (file) {
        try {
          if (canImportWord && isDocxFile(file)) {
            scheduleDocxEditorPreload();
            data = await uploadDocumentFile(data.id, file, user?.id, null);
            setOpen(false);
            toast.success(
              "Ficheiro guardado. A formatação Word é preservada ao editar se usar Salvar; evite reimportar via HTML.",
              { duration: 6000 },
            );
            onCreated?.(data);
            nav(`/document/${data.id}`);
            return;
          }
          let html = null;
          let conv = { imported: false, warning: null };
          if (canImportWord) {
            conv = await tryConvertDocxToHtml(file);
            html = conv.html;
          }
          data = await uploadDocumentFile(data.id, file, user?.id, html);
          setOpen(false);
          toast.success(`Documento criado. ${uploadSuccessMessage(file, conv)}`);
          onCreated?.(data);
          return;
        } catch (uploadErr) {
          console.error("[CreateDoc] upload", uploadErr);
          toast.error(`Documento criado, mas falha no arquivo: ${formatDocumentError(uploadErr)}`);
          setOpen(false);
          onCreated?.(data);
          return;
        }
      }
      toast.success("Documento criado");
      setOpen(false);
      onCreated?.(data);
      if (canImportWord) {
        scheduleDocxEditorPreload();
        nav(`/document/${data.id}`);
      }
    } catch (err) {
      console.error("[CreateDoc]", err);
      toast.error(formatDocumentError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-doc-btn">
          <Plus size={16} className="mr-1.5" /> Novo {sectionLabel || section}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Novo {sectionLabel || section}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-500">Título *</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Revisão</Label>
              <Input className="mt-1" value={revision} onChange={(e) => setRevision(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Emissão</Label>
              <Input className="mt-1" type="date" value={emission} onChange={(e) => setEmission(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Responsável</Label>
              <select value={responsible} onChange={(e) => setResponsible(e.target.value)} className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white">
                <option value="">Selecione…</option>
                {responsibles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Próxima revisão</Label>
              <Input className="mt-1" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-500">Arquivo (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".doc,.docx,.pdf,.txt,.rtf,.odt"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} className="mr-1.5" /> Selecionar arquivo
              </Button>
              {file && (
                <span className="text-sm text-slate-600 truncate max-w-[220px]" title={file.name}>{file.name}</span>
              )}
              {file && (
                <Button type="button" variant="ghost" size="sm" className="text-slate-500" onClick={() => setFile(null)}>
                  Remover
                </Button>
              )}
            </div>
            {canImportWord ? (
              <p className="text-xs text-slate-500 mt-1.5">
                Editor Word nativo: envie .docx para abrir no editor (cabeçalho e rodapé preservados).
                .doc antigo, PDF e outros ficam só como anexo.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">
                PDF, Word e outros formatos são guardados como ficheiro anexo.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white">Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function DocDeleteDialogs({ doc, deleteOpen, setDeleteOpen, remove, busy }) {
  const label = doc.title || doc.code || "documento";
  const synced = shouldSyncTenantDocumentToMasterList(doc);

  if (synced) {
    return (
      <PermanentDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remover documento permanentemente?"
        entityLabel={label}
        busy={busy}
        onConfirm={remove}
        description={(
          <p>
            O documento <strong>{label}</strong> será excluído dos requisitos SGQ e removido da Lista Mestra
            (se não houver outros ficheiros vinculados). O registo da exclusão será guardado no histórico.
            Esta ação <strong>não pode ser desfeita</strong>.
          </p>
        )}
      />
    );
  }

  return (
    <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={remove} busy={busy} />
  );
}

const DocRow = ({ doc, variant, onUpdate, onDelete, fileOnly = false }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const fileInputRef = React.useRef();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isVigente = variant === "vigente";
  const usesDocxEditor = documentUsesDocxEditor(doc);
  const prefetchEditor = usesDocxEditor ? scheduleDocxEditorPreload : undefined;

  const downloadExport = async (format) => {
    try {
      if (format === "pdf" && usesDocxEditor && doc.has_file) {
        toast.info(
          "Para PDF com cabeçalho Word, abra o documento e use o botão PDF no editor (impressão).",
          { duration: 6000 },
        );
      }
      const blob = await exportDocumentBlob(doc.id, format);
      triggerBlobDownload(blob, `${doc.title}.${format === "docx" ? "docx" : "pdf"}`);
    } catch {
      toast.error("Falha ao exportar");
    }
  };

  const downloadOriginal = async () => {
    try {
      const blob = await downloadOriginalFile(doc);
      triggerBlobDownload(blob, doc.file_name || "arquivo");
    } catch {
      toast.error("Falha ao baixar");
    }
  };

  const uploadFile = async (file) => {
    setBusy(true);
    try {
      const canImport = allowsRichEditor(doc.requirement, doc.folder_key);
      if (canImport && isDocxFile(file)) {
        scheduleDocxEditorPreload();
        const data = await uploadDocumentFile(doc.id, file, user?.id, null);
        toast.success(
          "Ficheiro guardado. A formatação Word é preservada ao editar se usar Salvar; evite reimportar via HTML.",
          { duration: 6000 },
        );
        onUpdate?.(data);
        nav(`/document/${doc.id}`);
        return;
      }
      let contentHtml = null;
      let conv = { imported: false, warning: null };
      if (canImport) {
        conv = await tryConvertDocxToHtml(file);
        contentHtml = conv.html;
      }
      const data = await uploadDocumentFile(doc.id, file, user?.id, contentHtml);
      toast.success(uploadSuccessMessage(file, conv));
      onUpdate?.(data);
    } catch (err) {
      console.error("[DocRow] upload", err);
      toast.error(formatDocumentError(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = doc.status === "vigente" ? "obsoleto" : "vigente";
    try {
      const data = await updateDocument(doc.id, { status: newStatus }, user?.id);
      toast.success(newStatus === "obsoleto" ? "Movido para Obsoletos" : "Reativado");
      onUpdate?.(data);
    } catch {
      toast.error("Falha ao atualizar");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteDocument(doc.id);
      toast.success(
        shouldSyncTenantDocumentToMasterList(doc)
          ? "Excluído dos requisitos e da Lista Mestra"
          : "Excluído",
      );
      setDeleteOpen(false);
      onDelete?.(doc.id);
    } catch {
      toast.error("Falha ao excluir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition" data-testid={`doc-row-${doc.id}`}>
      <td className="px-4 py-3">
        {fileOnly ? (
          <span className="font-medium text-sm text-slate-900">{doc.title}</span>
        ) : (
          <Link
            to={`/document/${doc.id}`}
            className="font-medium text-sm text-slate-900 hover:text-blue-600"
            onMouseEnter={prefetchEditor}
            onFocus={prefetchEditor}
          >
            {doc.title}
          </Link>
        )}
        <div className="text-xs text-slate-500 mt-0.5">
          {doc.code && <span className="font-mono">Emissão: {doc.code}</span>}
          <span className={doc.code ? "ml-2" : ""}>Rev. {doc.version}</span>
          {doc.has_file && <Badge variant="outline" className="ml-2 text-[10px] py-0">arquivo</Badge>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{doc.responsible || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{doc.review_date || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end flex-wrap">
          <input ref={fileInputRef} type="file" hidden accept=".doc,.docx,.pdf" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          {isVigente && (
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy} title="Upload">
              <Upload size={16} />
            </Button>
          )}
          {isVigente && fileOnly && doc.has_file && (
            <Button variant="ghost" size="sm" onClick={downloadOriginal} disabled={busy} title="Download"><DownloadSimple size={16} /></Button>
          )}
          {isVigente && !fileOnly && (
            <Button variant="ghost" size="sm" onClick={() => downloadExport("pdf")} title="Exportar PDF"><FilePdf size={16} /></Button>
          )}
          {!fileOnly && (
            <Link to={`/document/${doc.id}`} title="Editar" onMouseEnter={prefetchEditor} onFocus={prefetchEditor}>
              <Button variant="ghost" size="sm"><PencilSimple size={16} /></Button>
            </Link>
          )}
          {isVigente && (
            <Button variant="ghost" size="sm" onClick={toggleStatus} title="Mover para obsoletos"><Archive size={16} /></Button>
          )}
          {!isVigente && (
            <Button variant="ghost" size="sm" onClick={downloadOriginal} title="Download"><DownloadSimple size={16} /></Button>
          )}
          {isVigente && !fileOnly && (
            <Button variant="ghost" size="sm" onClick={() => downloadExport("docx")} title="Exportar Word"><FileDoc size={16} /></Button>
          )}
          {!isVigente && (
            <Button variant="ghost" size="sm" onClick={toggleStatus} title="Reativar"><ArrowsClockwise size={16} /></Button>
          )}
          <Link to={`/document/${doc.id}?mode=view`} title="Visualizar">
            <Button variant="ghost" size="sm"><Eye size={16} /></Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteOpen(true)} title="Excluir"><Trash size={16} /></Button>
        </div>
      </td>
      <DocDeleteDialogs
        doc={doc}
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        remove={remove}
        busy={busy}
      />
    </tr>
  );
};

const DocTable = ({ docs, variant, onUpdate, onDelete, fileOnly = false }) => {
  const list = Array.isArray(docs) ? docs : [];
  return (
    <Card className="border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Próx. revisão</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {list.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">Nenhum documento aqui ainda.</td></tr>
            )}
            {list.map((d) => (
              <DocRow key={d.id} doc={d} variant={variant} onUpdate={onUpdate} onDelete={onDelete} fileOnly={fileOnly} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const RequirementView = () => {
  const { id, folderKey } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const folderMode = useMemo(() => getFolderDocumentMode(id, folderKey), [id, folderKey]);
  const hideSectionTabs = folderMode.hideSectionTabs === true;
  const visibleSections = useMemo(() => {
    const sections = getVisibleSections(id, folderKey);
    if (String(id) === "8" && folderKey === "pr-8-3" && !isCtliAdmin(user?.role)) {
      return sections.filter((s) => s.id !== "lista_mestra_templates");
    }
    return sections;
  }, [id, folderKey, user?.role]);
  const defaultSection = folderMode.defaultSection;
  const tabFromUrl = searchParams.get("tab");
  const section = useMemo(() => {
    // Legado PR-6.2: aba única "registro" → primeira aba por tipo
    if (
      String(id) === PERSONNEL_REQ_ID
      && folderKey === PERSONNEL_FOLDER_KEY
      && tabFromUrl === "registro"
    ) {
      return PERSONNEL_DEFAULT_REGISTRO_SECTION;
    }
    if (tabFromUrl && visibleSections.some((s) => s.id === tabFromUrl)) return tabFromUrl;
    return defaultSection;
  }, [tabFromUrl, visibleSections, defaultSection, id, folderKey]);

  useEffect(() => {
    if (
      String(id) === PERSONNEL_REQ_ID
      && folderKey === PERSONNEL_FOLDER_KEY
      && tabFromUrl === "registro"
    ) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", PERSONNEL_DEFAULT_REGISTRO_SECTION);
        return p;
      }, { replace: true });
    }
  }, [id, folderKey, tabFromUrl, setSearchParams]);

  const [status, setStatus] = useState("vigente");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const first = getFirstFolderKey(id, currentTenant, user?.role);

  const load = useCallback(async () => {
    if (!currentTenantId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = {
        tenant_id: currentTenantId,
        requirement: id,
        section,
        status,
      };
      if (requiresFolderNav(id) && folderKey) params.folder_key = folderKey;
      const data = await listDocuments(params);
      setDocs(data);
    } catch (err) {
      console.error("[RequirementView] listDocuments", err);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, id, folderKey, section, status]);

  useEffect(() => { load(); }, [load]);

  const onTabChange = useCallback((next) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", next);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const filteredDocs = useMemo(() => filterBySearch(docs, searchQuery), [docs, searchQuery]);

  if (requiresFolderNav(id) && !folderKey && first) {
    return <Navigate to={`/requirement/${id}/${first}`} replace />;
  }
  if (requiresFolderNav(id) && folderKey && !isValidFolderKey(id, folderKey, currentTenant, user?.role) && first) {
    return <Navigate to={`/requirement/${id}/${first}`} replace />;
  }
  if (!requiresFolderNav(id) && folderKey) {
    return <Navigate to={`/requirement/${id}`} replace />;
  }
  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente no topo.</div>;
  }

  const folderLabel = folderKey ? getFolderLabel(id, folderKey, currentTenant, user?.role) : null;
  const folderMeta = folderKey
    ? getFoldersForRequirement(id, currentTenant, user?.role).find((f) => f.folderKey === folderKey)
    : null;
  const reqTitle = REQ_NAMES[String(id)];
  const isColetaRegistro =
    String(id) === COLETA_REQ_ID
    && folderKey === COLETA_FOLDER_KEY
    && (section === "coleta_dados" || section === "registro")
    && canAccessColeta(user?.role);
  const isCertBalancasTab =
    String(id) === COLETA_REQ_ID
    && folderKey === COLETA_FOLDER_KEY
    && section === "emissao_cert_balancas"
    && canAccessCalibrationCertificates(user?.role);
  const isCertPesoTab =
    String(id) === COLETA_REQ_ID
    && folderKey === COLETA_FOLDER_KEY
    && section === "emissao_cert_peso_padrao"
    && canAccessCalibrationCertificates(user?.role);
  const isFichaTecnicaTab = String(id) === "6" && folderKey === "pr-6-4" && section === "ficha_tecnica";
  const isVerificacaoEquipamentoTab =
    String(id) === "6" && folderKey === "pr-6-4-12" && section === "verificacao_equipamento";
  const isPersonnelRegistro =
    String(id) === PERSONNEL_REQ_ID
    && folderKey === PERSONNEL_FOLDER_KEY
    && isPersonnelRegistroFolderSection(section)
    && canAccessPersonnel(user?.role);
  const personnelLockedTopic = isPersonnelRegistro ? personnelFolderSectionToTopic(section) : null;
  const signatures = isSignaturesFolder(id, folderKey);
  const fileOnly = isFileOnlyFolder(id, folderKey);
  const purchaseOrdersTab = isPurchaseOrdersFolder(id, folderKey) && section === "pedidos_compra";
  const quotationRequestsTab = isPurchaseOrdersFolder(id, folderKey) && section === "solicitacoes_orcamento";
  const commercialProposalsTab = isCommercialProposalsFolder(id, folderKey) && section === "propostas_comerciais";
  const masterDocumentTab = isMasterDocumentListFolder(id, folderKey) && section.startsWith("lista_mestra_");
  const moduleTab = purchaseOrdersTab
    || quotationRequestsTab
    || commercialProposalsTab
    || masterDocumentTab
    || isCertBalancasTab
    || isCertPesoTab
    || isFichaTecnicaTab
    || isVerificacaoEquipamentoTab;
  const variant = status === "vigente" ? "vigente" : "obsoleto";
  const currentSectionMeta = visibleSections.find((s) => s.id === section);

  const updateDoc = (d) => {
    setDocs((prev) => {
      const next = prev.map((x) => (x.id === d.id ? d : x));
      return next.filter((x) => x.status === status && x.section === section);
    });
  };
  const removeDoc = (idd) => setDocs((prev) => prev.filter((x) => x.id !== idd));
  const onCreated = (d) => {
    const fk = requiresFolderNav(id) ? folderKey : null;
    const folderOk = !fk || d.folder_key === fk;
    if (d.status === status && d.section === section && folderOk) {
      setDocs((p) => [d, ...p]);
    }
  };

  return (
    <div className="space-y-6 min-w-0" data-testid={`req-view-${id}`}>
      <div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
          <Link to="/dashboard" className="hover:text-blue-600">Início</Link>
          <span>/</span>
          <span>Requisitos</span>
          <span>/</span>
          <span className="text-slate-700 font-medium">{id}. {reqTitle}</span>
          {folderLabel && (<><span>/</span><span className="text-slate-700 font-medium truncate max-w-md">{folderLabel}</span></>)}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
          <span className="font-mono text-slate-400 mr-2">{id}.</span>{reqTitle}
        </h1>
        {folderLabel && <p className="text-sm text-slate-700 mt-1 font-medium">{folderLabel}</p>}
        <p className="text-sm text-slate-600 mt-1">Ambiente: <span className="font-medium">{currentTenant?.name}</span></p>
      </div>

      {folderMeta && folderKey && (
        <RequirementFolderQuickAccess requirementId={id} folderKey={folderKey} />
      )}

      {!isColetaRegistro && !isPersonnelRegistro && !moduleTab && (
        <div className="relative max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, revisão, responsável, emissão…"
            className="pl-9"
          />
        </div>
      )}

      <Tabs value={section} onValueChange={onTabChange}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {!hideSectionTabs && (
          <TabsList className="bg-white border border-slate-200">
            {visibleSections.map((s) => (
              <TabsTrigger key={s.id} value={s.id} data-testid={`tab-${s.id}`}>{s.label}</TabsTrigger>
            ))}
          </TabsList>
          )}

          {!hideSectionTabs && !isColetaRegistro && !isPersonnelRegistro && !signatures && !moduleTab && (
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                <Button type="button" variant={status === "vigente" ? "default" : "ghost"} size="sm"
                  className={status === "vigente" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                  onClick={() => setStatus("vigente")}>Vigentes</Button>
                <Button type="button" variant={status === "obsoleto" ? "default" : "ghost"} size="sm"
                  className={status === "obsoleto" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                  onClick={() => setStatus("obsoleto")}>Obsoletos</Button>
              </div>
              {status === "vigente" && !signatures && (
                <CreateDocDialog
                  tenantId={currentTenantId}
                  requirement={id}
                  folderKey={folderKey}
                  section={section}
                  sectionLabel={
                    section === "documento" ? "documento" : (currentSectionMeta?.label || section)
                  }
                  onCreated={onCreated}
                />
              )}
            </div>
          )}
        </div>

        {hideSectionTabs && !isColetaRegistro && !isPersonnelRegistro && !signatures && !moduleTab && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
              <Button type="button" variant={status === "vigente" ? "default" : "ghost"} size="sm"
                className={status === "vigente" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setStatus("vigente")}>Vigentes</Button>
              <Button type="button" variant={status === "obsoleto" ? "default" : "ghost"} size="sm"
                className={status === "obsoleto" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setStatus("obsoleto")}>Obsoletos</Button>
            </div>
            {status === "vigente" && (
              <CreateDocDialog
                tenantId={currentTenantId}
                requirement={id}
                folderKey={folderKey}
                section={section}
                sectionLabel={folderLabel || "Manual da Qualidade"}
                onCreated={onCreated}
              />
            )}
          </div>
        )}

        <TabsContent value={section} className="mt-4">
          {masterDocumentTab && canAccessMasterDocuments(user?.role) ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar Lista Mestra…</div>}>
              <MasterDocumentHub tenantId={currentTenantId} tenant={currentTenant} section={section} />
            </Suspense>
          ) : purchaseOrdersTab ? (
            <PurchaseOrdersListPanel tenantId={currentTenantId} tenant={currentTenant} />
          ) : quotationRequestsTab ? (
            <QuotationRequestsListPanel tenantId={currentTenantId} tenant={currentTenant} />
          ) : commercialProposalsTab ? (
            <CommercialProposalsListPanel tenantId={currentTenantId} tenant={currentTenant} />
          ) : isColetaRegistro ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar coleta…</div>}>
              <ColetaPage embedded />
            </Suspense>
          ) : isCertBalancasTab ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar certificados…</div>}>
              <CertificateListPage embedded />
            </Suspense>
          ) : isCertPesoTab ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar certificados…</div>}>
              <WeightCertificateListPage embedded />
            </Suspense>
          ) : isFichaTecnicaTab ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar ficha técnica…</div>}>
              <DeviceTechnicalSheetPage embedded />
            </Suspense>
          ) : isVerificacaoEquipamentoTab ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar verificações…</div>}>
              <EquipmentVerificationListPage embedded />
            </Suspense>
          ) : isPersonnelRegistro ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar registros de pessoal…</div>}>
              <PersonnelRegistrosPage embedded lockedTopic={personnelLockedTopic} />
            </Suspense>
          ) : loading ? (
            <div className="text-slate-600">Carregando…</div>
          ) : signatures ? (
            <AssinaturasSection
              docs={filteredDocs}
              tenantId={currentTenantId}
              requirement={id}
              folderKey={folderKey}
              onRefresh={load}
              searchQuery={searchQuery}
            />
          ) : (
            <DocTable
              docs={filteredDocs}
              variant={variant}
              onUpdate={updateDoc}
              onDelete={removeDoc}
              fileOnly={fileOnly}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequirementView;
