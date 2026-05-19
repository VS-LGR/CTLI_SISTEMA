import fs from "fs";
const file = new URL("../src/pages/CadastrosPage.jsx", import.meta.url);
let t = fs.readFileSync(file, "utf8");

t = t.replaceAll("</motion>", "</div>");

const wrapOld = `    <div className="space-y-6" data-testid="cadastros-page">
      <div>
        <motion className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</motion>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">{sectionTitle}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente: <span className="font-medium text-slate-800">{tenantName || currentTenantId}</span>
        </p>
      </div>
        <Sheet`;

const wrapNew = `    <div className="space-y-6" data-testid="cadastros-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">{sectionTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Ambiente: <span className="font-medium text-slate-800">{tenantName || currentTenantId}</span>
          </p>
        </div>
        <Sheet`;

// wrapOld had typo - use actual content
const wrapOldReal = wrapOld.replace(
  '<motion className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</motion>',
  '<div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</div>'
);

if (!t.includes(wrapOldReal)) {
  console.error("wrap block not found");
  process.exit(1);
}
t = t.replace(wrapOldReal, wrapNew);
fs.writeFileSync(file, t);
console.log("fixed");
