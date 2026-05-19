import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "../src/pages/CadastrosPage.jsx");
let t = fs.readFileSync(p, "utf8");

const insertBeforeReturn = `  const visibleSections = CADASTRO_SECTIONS.filter((s) => {
    if (s.techniciansOnly && !canManageTechnicians(user?.role)) return false;
    if (s.roles?.length && !s.roles.includes(user?.role)) return false;
    return true;
  });
  const activeSection = section || "fornecedores";
  if (!section) return <Navigate to={cadastroSectionPath("fornecedores")} replace />;
  if (!visibleSections.some((s) => s.id === activeSection)) {
    return <Navigate to={cadastroSectionPath(visibleSections[0]?.id || "fornecedores")} replace />;
  }
  const sectionTitle = getCadastroSectionLabel(activeSection);

`;

if (!t.includes("const visibleSections = CADASTRO_SECTIONS")) {
  t = t.replace("  return (\n    <motion className=\"space-y-6\"", insertBeforeReturn + "  return (\n    <motion className=\"space-y-6\"");
  t = t.replace("  return (\n    <motion className=\"space-y-6\"", insertBeforeReturn + "  return (\n    <motion className=\"space-y-6\"");
  t = t.replace(/  return \(\n    <div className="space-y-6" data-testid="cadastros-page">\n      <div>[\s\S]*?<\/motion>\n\n    <\/motion>\n  \);/,
    `  return (
    <div className="space-y-6" data-testid="cadastros-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">{sectionTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">Ambiente: <span className="font-medium text-slate-800">{tenantName || currentTenantId}</span></p>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild><Button variant="outline" type="button"><List size={18} className="mr-2" /> Tipos de cadastro</Button></SheetTrigger>
          <SheetContent side="left" className="w-[min(18rem,85vw)]">
            <SheetHeader><SheetTitle className="font-display text-left">Cadastros</SheetTitle></SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {visibleSections.map((s) => (
                <NavLink key={s.id} to={cadastroSectionPath(s.id)} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => \`px-3 py-2.5 rounded-md text-sm \${isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}\`}>{s.label}</NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <div className="mt-2">
        {activeSection === "fornecedores" && <SupplierSection rows={suppliers} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "clientes" && <EndCustomerSection rows={endCustomers} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "colaboradores" && <EmployeeSection rows={employees} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "cert-peso" && <WeightCertSection rows={filteredWeight} allRows={weightCerts} tenantId={currentTenantId} tenantName={tenantName} year={yearWeight} years={yearsWeight} onYearChange={setYearWeight} onRefresh={loadAll} />}
        {activeSection === "pesos" && <PesoItemSection rows={weightItems} tenantId={currentTenantId} onRefresh={loadAll} />}
        {activeSection === "thermo" && <EnvCertSection rows={filteredEnv} allRows={envCerts} tenantId={currentTenantId} tenantName={tenantName} year={yearEnv} years={yearsEnv} onYearChange={setYearEnv} onRefresh={loadAll} />}
        {activeSection === "config-coleta" && <ColetaTenantConfig tenantId={currentTenantId} tenant={currentTenant} onSaved={() => reloadTenants?.()} />}
        {activeSection === "tecnicos" && <ColetaTechniciansPanel tenantId={currentTenantId} isAdmin={isAdmin} />}
      </motion>
    </motion>
  );`);
}

t = t.replace(/<motion/g, "<motion").replace(/<\/motion>/g, "</motion>");
t = t.replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>");
fs.writeFileSync(p, t);
console.log("fixed cadastros");
