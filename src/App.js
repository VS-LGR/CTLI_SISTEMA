import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import RequirementView from "@/pages/RequirementView";
import DocumentEditor from "@/pages/DocumentEditor";
import AdminClients from "@/pages/AdminClients";
import BackupView from "@/pages/BackupView";
import CadastrosPage from "@/pages/CadastrosPage";
import { canAccessColeta, isTechnicianOnlyNav } from "@/lib/roles";
import { COLETA_LIST_PATH, COLETA_NEW_PATH, coletaEditorPath, isColetaPath } from "@/lib/coletaRoutes";
import "@/App.css";

const ColetaPage = lazy(() => import("@/pages/ColetaPage"));
const ColetaEditorPage = lazy(() => import("@/pages/ColetaEditorPage"));

const coletaSuspenseFallback = (
  <div className="p-8 text-center text-slate-500 text-sm">A carregar…</div>
);

const ColetaLegacyRedirect = () => {
  const { id } = useParams();
  if (id === "nova") return <Navigate to={COLETA_NEW_PATH} replace />;
  return <Navigate to={coletaEditorPath(id)} replace />;
};

const Protected = ({ children, adminOnly = false, coletaOnly = false }) => {
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/requirement/7/pr-7-2/coleta"
              element={(
                <Protected coletaOnly>
                  <Suspense fallback={coletaSuspenseFallback}>
                    <ColetaPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/requirement/7/pr-7-2/coleta/nova"
              element={(
                <Protected coletaOnly>
                  <Suspense fallback={coletaSuspenseFallback}>
                    <ColetaEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route
              path="/requirement/7/pr-7-2/coleta/:id"
              element={(
                <Protected coletaOnly>
                  <Suspense fallback={coletaSuspenseFallback}>
                    <ColetaEditorPage />
                  </Suspense>
                </Protected>
              )}
            />
            <Route path="/coleta" element={<Navigate to={COLETA_LIST_PATH} replace />} />
            <Route path="/coleta/:id" element={<ColetaLegacyRedirect />} />
            <Route path="/requirement/:id/:folderKey" element={<RequirementView />} />
            <Route path="/requirement/:id" element={<RequirementView />} />
            <Route path="/document/:id" element={<DocumentEditor />} />
            <Route path="/backup" element={<BackupView />} />
            <Route path="/cadastros" element={<Navigate to="/cadastros/fornecedores" replace />} />
            <Route path="/cadastros/:section" element={<CadastrosPage />} />
            <Route path="/admin/clients" element={<Protected adminOnly><AdminClients /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </div>
);

export default App;
