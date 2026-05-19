import fs from "fs";
const file = new URL("../src/pages/CadastrosPage.jsx", import.meta.url);
let t = fs.readFileSync(file, "utf8");

const start2 = t.indexOf('      <div className="flex flex-wrap items-start justify-between gap-3">');
const end = t.indexOf('      <motion className="mt-2">');
const end2 = t.indexOf('      <motion className="mt-2">');
const endIdx = t.indexOf('      <div className="mt-2">', start2);
if (start2 === -1 || endIdx === -1) {
  console.error("markers not found", start2, endIdx);
  process.exit(1);
}

const d = "div";
const repFinal = `      <${d}>
        <${d} className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão</${d}>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">{sectionTitle}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente: <span className="font-medium text-slate-800">{tenantName || currentTenantId}</span>
        </p>
      </${d}>
`;

t = t.slice(0, start2) + repFinal + t.slice(endIdx);
fs.writeFileSync(file, t);
console.log("done");
