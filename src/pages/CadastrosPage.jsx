import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ColetaTechniciansPanel from "@/components/coleta/ColetaTechniciansPanel";
import PesoItemSection from "@/components/cadastros/PesoItemSection";
import ColetaTenantConfig from "@/components/cadastros/ColetaTenantConfig";
import { cadastroSectionPath, getCadastroSectionLabel, getVisibleCadastroSections } from "@/lib/cadastroSections";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash, FilePdf, FileArrowUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  JOB_ROLES,
  EDUCATION_LEVELS,
  jobLabel,
  generateEmployeeRegistrationCode,
  CADASTRO_STORAGE_BUCKET,
  ENV_EQUIPMENT_TYPES,
  envEquipmentTypeLabel,
} from "@/lib/cadastroConstants";
import { downloadWeightCertificatesValidPdf, downloadEnvironmentCertificatesValidPdf } from "@/lib/cadastroPdf";

function fmtIsoDate(d) {
  if (!d) return "";
  if (typeof d === "string" && d.length >= 10) return d.slice(0, 10);
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function uploadCertificateFile(tenantId, kind, certId, file) {
  if (!file) return null;
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${tenantId}/${kind}/${certId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(CADASTRO_STORAGE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

async function removeStoragePath(path) {
  if (!path) return;
  await supabase.storage.from(CADASTRO_STORAGE_BUCKET).remove([path]);
}

const CadastrosPage = () => {
  const { user } = useAuth();
  const { section } = useParams();
  const { currentTenantId, currentTenant, isAdmin, reloadTenants } = useOutletContext();
  const tenantName = currentTenant?.name || "";
  const [suppliers, setSuppliers] = useState([]);
  const [endCustomers, setEndCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [weightItems, setWeightItems] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);

  const [yearWeight, setYearWeight] = useState("all");
  const [yearEnv, setYearEnv] = useState("all");

  const loadAll = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    const tid = currentTenantId;
    const [s, e, em, w, wi, v] = await Promise.all([
      supabase.from("supplier_registrations").select("*").eq("tenant_id", tid).order("name"),
      supabase.from("end_customer_registrations").select("*").eq("tenant_id", tid).order("name"),
      supabase.from("employee_registrations").select("*").eq("tenant_id", tid).order("full_name"),
      supabase.from("weight_standard_certificates").select("*").eq("tenant_id", tid).order("calibration_date", { ascending: false }),
      supabase.from("standard_weight_items").select("*").eq("tenant_id", tid).eq("active", true).order("identification"),
      supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tid).order("calibration_date", { ascending: false }),
    ]);
    if (s.error) toast.error(s.error.message);
    else setSuppliers(s.data || []);
    if (e.error) toast.error(e.error.message);
    else setEndCustomers(e.data || []);
    if (em.error) toast.error(em.error.message);
    else setEmployees(em.data || []);
    if (w.error) toast.error(w.error.message);
    else setWeightCerts(w.data || []);
    if (wi.error) toast.error(wi.error.message);
    else setWeightItems(wi.data || []);
    if (v.error) toast.error(v.error.message);
    else setEnvCerts(v.data || []);
  }, [currentTenantId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const yearsWeight = useMemo(() => {
    const y = new Set();
    weightCerts.forEach((r) => {
      const c = r.calibration_date;
      if (c && String(c).length >= 4) y.add(String(c).slice(0, 4));
    });
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [weightCerts]);

  const yearsEnv = useMemo(() => {
    const y = new Set();
    envCerts.forEach((r) => {
      const c = r.calibration_date;
      if (c && String(c).length >= 4) y.add(String(c).slice(0, 4));
    });
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [envCerts]);

  const filteredWeight = useMemo(() => {
    if (yearWeight === "all") return weightCerts;
    return weightCerts.filter((r) => String(r.calibration_date || "").startsWith(yearWeight));
  }, [weightCerts, yearWeight]);

  const filteredEnv = useMemo(() => {
    if (yearEnv === "all") return envCerts;
    return envCerts.filter((r) => String(r.calibration_date || "").startsWith(yearEnv));
  }, [envCerts, yearEnv]);

  if (!isSupabaseAuthMode) {
    return (
      <div className="max-w-xl text-slate-600">
        <h1 className="font-display text-2xl font-bold text-slate-900">Cadastros</h1>
        <p className="mt-2 text-sm">Configure Supabase (`REACT_APP_SUPABASE_URL` e chave pública) para usar esta área.</p>
      </div>
    );
  }

  if (!currentTenantId) {
    return (
      <div className="max-w-xl text-slate-600">
        <h1 className="font-display text-2xl font-bold text-slate-900">Cadastros</h1>
        <p className="mt-2 text-sm">Selecione um ambiente no topo da página para ver e editar os cadastros desse cliente.</p>
      </div>
    );
  }

  const visibleSections = getVisibleCadastroSections(user?.role);
  const activeSection = section || "fornecedores";
  if (!section) return <Navigate to={cadastroSectionPath("fornecedores")} replace />;
  if (!visibleSections.some((s) => s.id === activeSection)) {
    return <Navigate to={cadastroSectionPath(visibleSections[0]?.id || "fornecedores")} replace />;
  }
  const sectionTitle = getCadastroSectionLabel(activeSection);

  return (
    <div className="space-y-6" data-testid="cadastros-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">{sectionTitle}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente: <span className="font-medium text-slate-800">{tenantName || currentTenantId}</span>
        </p>
      </div>
      <div className="mt-2">
        {activeSection === "fornecedores" && <SupplierSection rows={suppliers} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "clientes" && <EndCustomerSection rows={endCustomers} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "colaboradores" && <EmployeeSection rows={employees} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "cert-peso" && (
          <WeightCertSection rows={filteredWeight} allRows={weightCerts} tenantId={currentTenantId} tenantName={tenantName}
            year={yearWeight} years={yearsWeight} onYearChange={setYearWeight} onRefresh={loadAll} />
        )}
        {activeSection === "pesos" && <PesoItemSection rows={weightItems} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "thermo" && (
          <EnvCertSection rows={filteredEnv} allRows={envCerts} tenantId={currentTenantId} tenantName={tenantName}
            year={yearEnv} years={yearsEnv} onYearChange={setYearEnv} onRefresh={loadAll} />
        )}
        {activeSection === "config-coleta" && (
          <ColetaTenantConfig tenantId={currentTenantId} tenant={currentTenant} onSaved={() => reloadTenants?.()} />
        )}
        {activeSection === "tecnicos" && <ColetaTechniciansPanel tenantId={currentTenantId} isAdmin={isAdmin} />}
      </div>
    </div>
  );
};

function SupplierSection({ rows, tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [rep, setRep] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [regDate, setRegDate] = useState(todayIso());

  const reset = () => {
    setEditing(null);
    setName("");
    setFullAddress("");
    setCnpj("");
    setRep("");
    setPhone("");
    setEmail("");
    setRegDate(todayIso());
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };
  const openEdit = (r) => {
    setEditing(r);
    setName(r.name);
    setFullAddress(r.full_address);
    setCnpj(r.cnpj);
    setRep(r.representative_name);
    setPhone(r.phone);
    setEmail(r.email);
    setRegDate(fmtIsoDate(r.registration_date));
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      full_address: fullAddress.trim(),
      cnpj: cnpj.trim(),
      representative_name: rep.trim(),
      phone: phone.trim(),
      email: email.trim(),
      registration_date: regDate || todayIso(),
    };
    try {
      if (editing) {
        const { error } = await supabase.from("supplier_registrations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase.from("supplier_registrations").insert(payload);
        if (error) throw error;
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Falha");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Excluir fornecedor?")) return;
    const { error } = await supabase.from("supplier_registrations").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={openNew} size="sm" className="bg-blue-600 text-white"><Plus size={16} className="mr-1" /> Novo fornecedor</Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Nome</th>
                <th className="p-2">CNPJ</th>
                <th className="p-2">Representante</th>
                <th className="p-2">Contato</th>
                <th className="p-2">Data cad.</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-slate-500 text-center">Nenhum fornecedor.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2">{r.cnpj}</td>
                  <td className="p-2">{r.representative_name}</td>
                  <td className="p-2">{r.phone} {r.email ? <span className="text-slate-500">· {r.email}</span> : null}</td>
                  <td className="p-2">{fmtIsoDate(r.registration_date)}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Endereço completo</Label><Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} /></div>
              <div><Label>CNPJ</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
              <div><Label>Nome do representante</Label><Input value={rep} onChange={(e) => setRep(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Data do cadastro</Label><Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EndCustomerSection({ rows, tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [rep, setRep] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [regDate, setRegDate] = useState(todayIso());

  const reset = () => {
    setEditing(null);
    setName(""); setFullAddress(""); setCnpj(""); setRep(""); setPhone(""); setEmail(""); setRegDate(todayIso());
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      full_address: fullAddress.trim(),
      cnpj: cnpj.trim(),
      representative_name: rep.trim(),
      phone: phone.trim(),
      email: email.trim(),
      registration_date: regDate || todayIso(),
    };
    try {
      if (editing) {
        const { error } = await supabase.from("end_customer_registrations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase.from("end_customer_registrations").insert(payload);
        if (error) throw error;
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Falha");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Excluir cliente do cliente?")) return;
    const { error } = await supabase.from("end_customer_registrations").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { reset(); setOpen(true); }} size="sm" className="bg-blue-600 text-white"><Plus size={16} className="mr-1" /> Novo cadastro</Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Nome</th>
                <th className="p-2">CNPJ</th>
                <th className="p-2">Representante</th>
                <th className="p-2">Contato</th>
                <th className="p-2">Data cad.</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-slate-500 text-center">Nenhum cadastro.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2">{r.cnpj}</td>
                  <td className="p-2">{r.representative_name}</td>
                  <td className="p-2">{r.phone} {r.email ? <span className="text-slate-500">· {r.email}</span> : null}</td>
                  <td className="p-2">{fmtIsoDate(r.registration_date)}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(r);
                      setName(r.name); setFullAddress(r.full_address); setCnpj(r.cnpj); setRep(r.representative_name);
                      setPhone(r.phone); setEmail(r.email); setRegDate(fmtIsoDate(r.registration_date));
                      setOpen(true);
                    }}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar cliente do cliente" : "Novo cliente do cliente"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Endereço completo</Label><Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} /></div>
              <div><Label>CNPJ</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
              <div><Label>Nome do representante</Label><Input value={rep} onChange={(e) => setRep(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Data do cadastro</Label><Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EmployeeSection({ rows, tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [rgIss, setRgIss] = useState("");
  const [adm, setAdm] = useState(todayIso());
  const [job, setJob] = useState("operador");
  const [edu, setEdu] = useState("medio_completo");
  const [supId, setSupId] = useState("");

  const reset = () => {
    setEditing(null);
    setCode(generateEmployeeRegistrationCode());
    setFullName(""); setCpf(""); setRg(""); setRgIss("");
    setAdm(todayIso()); setJob("operador"); setEdu("medio_completo"); setSupId("");
  };

  useEffect(() => {
    if (open && !editing) setCode(generateEmployeeRegistrationCode());
  }, [open, editing]);

  const save = async () => {
    if (!fullName.trim()) return toast.error("Informe o nome");
    if (!code.trim()) return toast.error("Matrícula em falta");
    const payload = {
      tenant_id: tenantId,
      registration_code: code.trim(),
      full_name: fullName.trim(),
      cpf: cpf.trim(),
      rg: rg.trim(),
      rg_issuer: rgIss.trim(),
      admission_date: adm || todayIso(),
      job_role: job,
      education_level: edu,
      supervisor_id: supId || null,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("employee_registrations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase.from("employee_registrations").insert(payload);
        if (error) throw error;
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Falha — matrícula duplicada?");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Excluir colaborador?")) return;
    const { error } = await supabase.from("employee_registrations").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  const supOpts = rows.filter((r) => !editing || r.id !== editing.id);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { reset(); setOpen(true); }} size="sm" className="bg-blue-600 text-white"><Plus size={16} className="mr-1" /> Novo colaborador</Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Matrícula</th>
                <th className="p-2">Nome</th>
                <th className="p-2">Cargo</th>
                <th className="p-2">Admissão</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-slate-500 text-center">Nenhum colaborador.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono text-xs">{r.registration_code}</td>
                  <td className="p-2 font-medium">{r.full_name}</td>
                  <td className="p-2">{jobLabel(r.job_role)}</td>
                  <td className="p-2">{fmtIsoDate(r.admission_date)}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(r);
                      setCode(r.registration_code);
                      setFullName(r.full_name); setCpf(r.cpf); setRg(r.rg); setRgIss(r.rg_issuer);
                      setAdm(fmtIsoDate(r.admission_date)); setJob(r.job_role); setEdu(r.education_level);
                      setSupId(r.supervisor_id || "");
                      setOpen(true);
                    }}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Matrícula</Label><Input value={code} onChange={(e) => setCode(e.target.value)} readOnly={!editing} className={!editing ? "bg-slate-50" : ""} /></div>
              <div><Label>Nome *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>CPF</Label><Input value={cpf} onChange={(e) => setCpf(e.target.value)} /></div>
              <div><Label>RG</Label><Input value={rg} onChange={(e) => setRg(e.target.value)} /></div>
              <div><Label>Órgão emissor do RG</Label><Input value={rgIss} onChange={(e) => setRgIss(e.target.value)} /></div>
              <div><Label>Data de admissão</Label><Input type="date" value={adm} onChange={(e) => setAdm(e.target.value)} /></div>
              <div>
                <Label>Cargo</Label>
                <select value={job} onChange={(e) => setJob(e.target.value)} className="w-full border rounded-md h-10 px-3 text-sm">
                  {JOB_ROLES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Escolaridade</Label>
                <select value={edu} onChange={(e) => setEdu(e.target.value)} className="w-full border rounded-md h-10 px-3 text-sm">
                  {EDUCATION_LEVELS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Supervisor direto</Label>
                <select value={supId} onChange={(e) => setSupId(e.target.value)} className="w-full border rounded-md h-10 px-3 text-sm">
                  <option value="">— Nenhum —</option>
                  {supOpts.map((x) => (
                    <option key={x.id} value={x.id}>{x.full_name} ({x.registration_code})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

async function signedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(CADASTRO_STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl || null;
}

function WeightCertSection({ rows, allRows, tenantId, tenantName, year, years, onYearChange, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [setName, setSetName] = useState("");
  const [klass, setKlass] = useState("");
  const [qty, setQty] = useState(1);
  const [manuf, setManuf] = useState("");
  const [model, setModel] = useState("");
  const [mat, setMat] = useState("");
  const [certNum, setCertNum] = useState("");
  const [calDate, setCalDate] = useState(todayIso());
  const [calBy, setCalBy] = useState("");
  const [file, setFile] = useState(null);

  const reset = () => {
    setEditing(null);
    setSetName(""); setKlass(""); setQty(1); setManuf(""); setModel(""); setMat("");
    setCertNum(""); setCalDate(todayIso()); setCalBy(""); setFile(null);
  };

  const save = async () => {
    if (!calDate) return toast.error("Informe a data de calibração");
    const base = {
      tenant_id: tenantId,
      set_name: setName.trim(),
      class: klass.trim(),
      quantity: Math.max(1, Number(qty) || 1),
      manufacturer: manuf.trim(),
      model_type: model.trim(),
      material: mat.trim(),
      certificate_number: certNum.trim(),
      calibration_date: calDate,
      calibrated_by: calBy.trim(),
    };
    try {
      if (editing) {
        let path = editing.attachment_storage_path;
        if (file) {
          if (editing.attachment_storage_path) await removeStoragePath(editing.attachment_storage_path);
          path = await uploadCertificateFile(tenantId, "weight", editing.id, file);
        }
        const { error } = await supabase.from("weight_standard_certificates").update({
          ...base,
          attachment_storage_path: file ? path : editing.attachment_storage_path,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { data, error } = await supabase.from("weight_standard_certificates").insert({
          ...base,
          attachment_storage_path: null,
        }).select("id").single();
        if (error) throw error;
        let path = null;
        if (file) {
          path = await uploadCertificateFile(tenantId, "weight", data.id, file);
          await supabase.from("weight_standard_certificates").update({ attachment_storage_path: path }).eq("id", data.id);
        }
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Falha");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Excluir certificado?")) return;
    if (r.attachment_storage_path) await removeStoragePath(r.attachment_storage_path);
    const { error } = await supabase.from("weight_standard_certificates").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  const pdf = () => downloadWeightCertificatesValidPdf(allRows, tenantName);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 whitespace-nowrap">Ano (calibração)</Label>
            <select value={year} onChange={(e) => onYearChange(e.target.value)} className="border rounded-md h-9 px-2 text-sm">
              <option value="all">Todos</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={pdf}><FilePdf size={16} className="mr-1" /> PDF válidos</Button>
            <Button size="sm" className="bg-blue-600 text-white" onClick={() => { reset(); setOpen(true); }}><Plus size={16} className="mr-1" /> Novo</Button>
          </div>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Conjunto</th>
                <th className="p-2">Nº cert.</th>
                <th className="p-2">Calibração</th>
                <th className="p-2">Checagem</th>
                <th className="p-2">Vencimento</th>
                <th className="p-2">Anexo</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-slate-500 text-center">Nenhum registro.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{r.set_name}</td>
                  <td className="p-2">{r.certificate_number}</td>
                  <td className="p-2">{fmtIsoDate(r.calibration_date)}</td>
                  <td className="p-2">{r.intermediate_check_label}</td>
                  <td className="p-2">{fmtIsoDate(r.expiry_date)}</td>
                  <td className="p-2">
                    {r.attachment_storage_path ? (
                      <OpenAttachment path={r.attachment_storage_path} />
                    ) : "—"}
                  </td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(r);
                      setSetName(r.set_name); setKlass(r.class); setQty(r.quantity); setManuf(r.manufacturer);
                      setModel(r.model_type); setMat(r.material); setCertNum(r.certificate_number);
                      setCalDate(fmtIsoDate(r.calibration_date)); setCalBy(r.calibrated_by); setFile(null);
                      setOpen(true);
                    }}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar certificado" : "Novo certificado de peso padrão"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome do conjunto</Label><Input value={setName} onChange={(e) => setSetName(e.target.value)} /></div>
              <div><Label>Classe</Label><Input value={klass} onChange={(e) => setKlass(e.target.value)} /></div>
              <div><Label>Quantidade</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
              <div><Label>Fabricante</Label><Input value={manuf} onChange={(e) => setManuf(e.target.value)} /></div>
              <div><Label>Modelo / tipo</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
              <div><Label>Material</Label><Input value={mat} onChange={(e) => setMat(e.target.value)} /></div>
              <div><Label>Nº certificado de calibração</Label><Input value={certNum} onChange={(e) => setCertNum(e.target.value)} /></div>
              <div><Label>Data da calibração</Label><Input type="date" value={calDate} onChange={(e) => setCalDate(e.target.value)} /></div>
              <div className="text-xs text-slate-500">Checagem intermediária e vencimento são calculados automaticamente (+1 ano e +2 anos).</div>
              <div><Label>Calibrado por</Label><Input value={calBy} onChange={(e) => setCalBy(e.target.value)} /></div>
              <div>
                <Label>Anexo (PDF/imagem)</Label>
                <Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EnvCertSection({ rows, allRows, tenantId, tenantName, year, years, onYearChange, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [eqName, setEqName] = useState("");
  const [equipmentType, setEquipmentType] = useState("thermo_baro_higrometro");
  const [manuf, setManuf] = useState("");
  const [model, setModel] = useState("");
  const [certNum, setCertNum] = useState("");
  const [calDate, setCalDate] = useState(todayIso());
  const [calBy, setCalBy] = useState("");
  const [file, setFile] = useState(null);

  const reset = () => {
    setEditing(null);
    setEqName("");
    setEquipmentType("thermo_baro_higrometro");
    setManuf("");
    setModel("");
    setCertNum("");
    setCalDate(todayIso());
    setCalBy("");
    setFile(null);
  };

  const save = async () => {
    if (!tenantId) {
      toast.error("Selecione um ambiente válido no topo da página.");
      return;
    }
    if (!calDate) return toast.error("Informe a data de calibração");
    const base = {
      tenant_id: tenantId,
      equipment_type: equipmentType,
      equipment_name: eqName.trim(),
      manufacturer: manuf.trim(),
      model: model.trim(),
      certificate_number: certNum.trim(),
      calibration_date: calDate,
      calibrated_by: calBy.trim(),
    };
    try {
      if (editing) {
        let path = editing.attachment_storage_path;
        if (file) {
          if (editing.attachment_storage_path) await removeStoragePath(editing.attachment_storage_path);
          path = await uploadCertificateFile(tenantId, "env", editing.id, file);
        }
        const { error } = await supabase.from("environment_sensor_certificates").update({
          ...base,
          attachment_storage_path: file ? path : editing.attachment_storage_path,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { data, error } = await supabase.from("environment_sensor_certificates").insert({
          ...base,
          attachment_storage_path: null,
        }).select("id").single();
        if (error) throw error;
        if (file) {
          const path = await uploadCertificateFile(tenantId, "env", data.id, file);
          await supabase.from("environment_sensor_certificates").update({ attachment_storage_path: path }).eq("id", data.id);
        }
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("environment_sensor_certificates_tenant_id_fkey")) {
        toast.error("Ambiente inválido. Selecione outro cliente no topo da página e tente novamente.");
      } else {
        toast.error(msg || "Falha");
      }
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Excluir certificado?")) return;
    if (r.attachment_storage_path) await removeStoragePath(r.attachment_storage_path);
    const { error } = await supabase.from("environment_sensor_certificates").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  const pdf = () => downloadEnvironmentCertificatesValidPdf(allRows, tenantName);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 whitespace-nowrap">Ano (calibração)</Label>
            <select value={year} onChange={(e) => onYearChange(e.target.value)} className="border rounded-md h-9 px-2 text-sm">
              <option value="all">Todos</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={pdf}><FilePdf size={16} className="mr-1" /> PDF válidos</Button>
            <Button size="sm" className="bg-blue-600 text-white" onClick={() => { reset(); setOpen(true); }}><Plus size={16} className="mr-1" /> Novo</Button>
          </div>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Tipo</th>
                <th className="p-2">Equipamento</th>
                <th className="p-2">Nº cert.</th>
                <th className="p-2">Calibração</th>
                <th className="p-2">Checagem</th>
                <th className="p-2">Vencimento</th>
                <th className="p-2">Anexo</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-slate-500 text-center">Nenhum registro.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 text-xs">{envEquipmentTypeLabel(r.equipment_type)}</td>
                  <td className="p-2 font-medium">{r.equipment_name}</td>
                  <td className="p-2">{r.certificate_number}</td>
                  <td className="p-2">{fmtIsoDate(r.calibration_date)}</td>
                  <td className="p-2">{r.intermediate_check_label}</td>
                  <td className="p-2">{fmtIsoDate(r.expiry_date)}</td>
                  <td className="p-2">
                    {r.attachment_storage_path ? (
                      <OpenAttachment path={r.attachment_storage_path} />
                    ) : "—"}
                  </td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(r);
                      setEqName(r.equipment_name);
                      setEquipmentType(r.equipment_type || "thermo_baro_higrometro");
                      setManuf(r.manufacturer); setModel(r.model);
                      setCertNum(r.certificate_number); setCalDate(fmtIsoDate(r.calibration_date));
                      setCalBy(r.calibrated_by); setFile(null);
                      setOpen(true);
                    }}><PencilSimple size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar equipamento" : "Novo equipamento ambiental"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tipo de equipamento</Label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="mt-1 w-full border rounded-md h-9 px-2 text-sm"
                >
                  {ENV_EQUIPMENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div><Label>Nome do equipamento</Label><Input value={eqName} onChange={(e) => setEqName(e.target.value)} /></div>
              <div><Label>Fabricante</Label><Input value={manuf} onChange={(e) => setManuf(e.target.value)} /></div>
              <div><Label>Modelo</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
              <div><Label>Nº certificado de calibração</Label><Input value={certNum} onChange={(e) => setCertNum(e.target.value)} /></div>
              <div><Label>Data da calibração</Label><Input type="date" value={calDate} onChange={(e) => setCalDate(e.target.value)} /></div>
              <div className="text-xs text-slate-500">Checagem e vencimento calculados automaticamente.</div>
              <div><Label>Calibrado por</Label><Input value={calBy} onChange={(e) => setCalBy(e.target.value)} /></div>
              <div>
                <Label>Anexo (PDF/imagem)</Label>
                <Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function OpenAttachment({ path }) {
  const [href, setHref] = useState(null);
  useEffect(() => {
    let cancel = false;
    signedUrl(path).then((u) => {
      if (!cancel) setHref(u);
    });
    return () => { cancel = true; };
  }, [path]);
  if (!href) return <span className="text-xs text-slate-400">…</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline inline-flex items-center gap-0.5">
      <FileArrowUp size={14} /> Abrir
    </a>
  );
}

export default CadastrosPage;
