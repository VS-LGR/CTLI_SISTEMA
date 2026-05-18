import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import ColetaPage from "@/pages/ColetaPage";
import ColetaEditorPage from "@/pages/ColetaEditorPage";
import { canAccessColeta, isTechnicianOnlyNav } from "@/lib/roles";
import "@/App.css";

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
  if (isTechnicianOnlyNav(user.role) && !loc.pathname.startsWith("/coleta")) {
    return <Navigate to="/coleta" replace />;
  }
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (user && isTechnicianOnlyNav(user.role)) {
    return <Navigate to="/coleta" replace />;
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
            <Route path="/requirement/:id/:folderKey" element={<RequirementView />} />
            <Route path="/requirement/:id" element={<RequirementView />} />
            <Route path="/document/:id" element={<DocumentEditor />} />
            <Route path="/backup" element={<BackupView />} />
            <Route path="/cadastros" element={<CadastrosPage />} />
            <Route path="/coleta" element={<Protected coletaOnly><ColetaPage /></Protected>} />
            <Route path="/coleta/:id" element={<Protected coletaOnly><ColetaEditorPage /></Protected>} />
            <Route path="/admin/clients" element={<Protected adminOnly><AdminClients /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </div>
);

export default App;
