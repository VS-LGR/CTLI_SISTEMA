import React, { Suspense, lazy } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import PageErrorBoundary from "@/components/PageErrorBoundary";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import { canAccessColeta, canAccessPurchaseOrders, canAccessQuotationRequests, canAccessPersonnel, isTechnicianOnlyNav } from "@/lib/roles";
import { PERSONNEL_BASE_PATH, PERSONNEL_CARGOS_PATH } from "@/lib/personnelRoutes";
import { PERSONNEL_DASHBOARD_PATH } from "@/lib/personnelRegistrosRoutes";
import { COLETA_LIST_PATH, COLETA_NEW_PATH, coletaEditorPath, isColetaPath } from "@/lib/coletaRoutes";
import { PEDIDOS_LIST_PATH } from "@/lib/pedidosCompraRoutes";
import { QUOTATION_LIST_PATH } from "@/lib/quotationRequestsRoutes";
import "@/App.css";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const RequirementView = lazy(() => import("@/pages/RequirementView"));
const DocumentEditor = lazyWithRetry(() => import("@/pages/DocumentEditor"));
const AdminClients = lazy(() => import("@/pages/AdminClients"));
const BackupView = lazy(() => import("@/pages/BackupView"));
const CadastrosPage = lazy(() => import("@/pages/CadastrosPage"));
const ColetaPage = lazy(() => import("@/pages/ColetaPage"));
const ColetaEditorPage = lazy(() => import("@/pages/ColetaEditorPage"));
const PedidosCompraPage = lazy(() => import("@/pages/PedidosCompraPage"));
const PedidoCompraEditorPage = lazy(() => import("@/pages/PedidoCompraEditorPage"));
const QuotationRequestsPage = lazy(() => import("@/pages/QuotationRequestsPage"));
const QuotationRequestEditorPage = lazy(() => import("@/pages/QuotationRequestEditorPage"));
const PersonnelPage = lazy(() => import("@/pages/PersonnelPage"));
const PositionEditorPage = lazy(() => import("@/pages/PositionEditorPage"));
const CompetencyAdequacyEditorPage = lazy(() => import("@/pages/CompetencyAdequacyEditorPage"));
const PersonnelMonitoringEditorPage = lazy(() => import("@/pages/PersonnelMonitoringEditorPage"));
const ExperienceEvaluationEditorPage = lazy(() => import("@/pages/ExperienceEvaluationEditorPage"));
const PersonnelSelectionEditorPage = lazy(() => import("@/pages/PersonnelSelectionEditorPage"));
const AttendanceListEditorPage = lazy(() => import("@/pages/AttendanceListEditorPage"));

const pageSuspenseFallback = (
  <div className="p-8 text-center text-slate-500 text-sm">A carregar…</div>
);

const ColetaLegacyRedirect = () => {
  const { id } = useParams();
  if (id === "nova") return <Navigate to={COLETA_NEW_PATH} replace />;
  return <Navigate to={coletaEditorPath(id)} replace />;
};

const Protected = ({ children, adminOnly = false, coletaOnly = false, purchaseOrdersOnly = false, quotationRequestsOnly = false, personnelOnly = false }) => {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Carregando…</div>;
  }
  if (user === false) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  if (coletaOnly && !canAccessColeta(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (purchaseOrdersOnly && !canAccessPurchaseOrders(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (quotationRequestsOnly && !canAccessQuotationRequests(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (personnelOnly && !canAccessPersonnel(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (isTechnicianOnlyNav(user.role) && !isColetaPath(loc.pathname)) {
    return <Navigate to={COLETA_LIST_PATH} replace />;
  }
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (user && isTechnicianOnlyNav(user.role)) {
    return <Navigate to={COLETA_LIST_PATH} replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <div className="App">
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected><Layout /></Protected>
            }
          >
            <Route path="/" element={<HomeRedirect />} />
            <Route
              path="/dashboard"
              element={(
                <Suspense fallback={pageSuspenseFallback}>
                  <Dashboard />
                </Suspense>
              )}
            />
            <Route
              path="/requirement/7/pr-7-2/coleta"
              element={(
                <Protected coletaOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <ColetaPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/requirement/7/pr-7-2/coleta/nova"
              element={(
                <Protected coletaOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <ColetaEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/requirement/7/pr-7-2/coleta/:id"
              element={(
                <Protected coletaOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <ColetaEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route path="/coleta" element={<Navigate to={COLETA_LIST_PATH} replace />} />
            <Route path="/coleta/:id" element={<ColetaLegacyRedirect />} />
            <Route
              path={PEDIDOS_LIST_PATH}
              element={(
                <Protected purchaseOrdersOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <PedidosCompraPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path={`${PEDIDOS_LIST_PATH}/:id`}
              element={(
                <Protected purchaseOrdersOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <PedidoCompraEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path={QUOTATION_LIST_PATH}
              element={(
                <Protected quotationRequestsOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <QuotationRequestsPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path={`${QUOTATION_LIST_PATH}/:id`}
              element={(
                <Protected quotationRequestsOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <QuotationRequestEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/requirement/:id/:folderKey"
              element={(
                <Suspense fallback={pageSuspenseFallback}>
                  <RequirementView />
                </Suspense>
              )}
            />
            <Route
              path="/requirement/:id"
              element={(
                <Suspense fallback={pageSuspenseFallback}>
                  <RequirementView />
                </Suspense>
              )}
            />
            <Route
              path="/document/:id"
              element={(
                <PageErrorBoundary title="Não foi possível abrir o documento">
                  <Suspense fallback={pageSuspenseFallback}>
                    <DocumentEditor />
                  </Suspense>
                </PageErrorBoundary>
              )}
            />
            <Route
              path="/backup"
              element={(
                <Suspense fallback={pageSuspenseFallback}>
                  <BackupView />
                </Suspense>
              )}
            />
            <Route path="/cadastros" element={<Navigate to="/cadastros/fornecedores" replace />} />
            <Route
              path="/cadastros/:section"
              element={(
                <Suspense fallback={pageSuspenseFallback}>
                  <CadastrosPage />
                </Suspense>
              )}
            />
            <Route path={PERSONNEL_BASE_PATH} element={<Navigate to={PERSONNEL_DASHBOARD_PATH} replace />} />
            <Route
              path={`${PERSONNEL_BASE_PATH}/:section`}
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <PersonnelPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path={`${PERSONNEL_CARGOS_PATH}/:id`}
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <PositionEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/pessoal/adequacao/:id"
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <CompetencyAdequacyEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/pessoal/monitoramento/:id"
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <PersonnelMonitoringEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/pessoal/avaliacao-experiencia/:id"
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <ExperienceEvaluationEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/pessoal/selecao/:id"
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <PersonnelSelectionEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/pessoal/presenca/:id"
              element={(
                <Protected personnelOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <AttendanceListEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/admin/clients"
              element={(
                <Protected adminOnly>
                  <Suspense fallback={pageSuspenseFallback}>
                    <AdminClients />
                  </Suspense>
                </Protected>
              )}
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </div>
);

export default App;
