import fs from "fs";
const file = new URL("../src/pages/CadastrosPage.jsx", import.meta.url);
let t = fs.readFileSync(file, "utf8");

t = t.replace("Novo thermo-baro-higrômetro", "Novo equipamento ambiental");

const marker = '<motion className="space-y-3">\n              <motion><Label>Nome do equipamento</Label>';
const markerReal = '<div className="space-y-3">\n              <motion><Label>Nome do equipamento</Label>';
const marker2 = '<div className="space-y-3">\n              <div><Label>Nome do equipamento</Label>';

const block = `<div className="space-y-3">
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
              <div><Label>Nome do equipamento</Label>`;

if (!t.includes(marker2)) {
  console.error("marker not found");
  process.exit(1);
}
t = t.replace(marker2, block);
fs.writeFileSync(file, t);
console.log("patched env dialog");
