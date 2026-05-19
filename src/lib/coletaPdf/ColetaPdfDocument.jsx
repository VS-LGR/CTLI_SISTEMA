import { ColetaPdfFrente } from "./ColetaPdfFrente";
import { ColetaPdfVerso } from "./ColetaPdfVerso";
import "./coletaPdf.css";

export function ColetaPdfDocument({ model, logoUrl }) {
  return (
    <div className="coleta-pdf-root">
      <ColetaPdfFrente model={model} logoUrl={logoUrl} />
      <ColetaPdfVerso model={model} logoUrl={logoUrl} />
    </div>
  );
}
