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
import "@/App.css";

const Protected = ({ children, adminOnly = false }) => {
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
  return children;
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requirement/:id/:folderKey" element={<RequirementView />} />
            <Route path="/requirement/:id" element={<RequirementView />} />
            <Route path="/document/:id" element={<DocumentEditor />} />
            <Route path="/backup" element={<BackupView />} />
            <Route path="/cadastros" element={<CadastrosPage />} />
            <Route path="/admin/clients" element={<Protected adminOnly><AdminClients /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </div>
);

export default App;
