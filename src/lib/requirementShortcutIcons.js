import {
  ArrowRight,
  BookOpen,
  Certificate,
  CheckSquare,
  ClipboardText,
  Cube,
  FileText,
  GearSix,
  ListChecks,
  Scales,
  Thermometer,
  Truck,
  Users,
  Wrench,
} from "@phosphor-icons/react";

const SHORTCUT_ICONS = {
  fichas: Wrench,
  verificacoes: CheckSquare,
  coleta: ClipboardText,
  certificados: Certificate,
  propostas: FileText,
  "pessoal-listas": ListChecks,
  "lista-mestra": BookOpen,
  "config-re-72a": GearSix,
  "config-re-71a": GearSix,
  "cad-colaboradores": Users,
  "cad-tecnicos": Users,
  "cad-cert-peso": Certificate,
  "cad-pesos": Cube,
  "cad-thermo": Thermometer,
  "cad-balancas": Scales,
  "cad-clientes": Users,
  "cad-fornecedores": Truck,
};

export function getRequirementShortcutIcon(key) {
  return SHORTCUT_ICONS[key] || ArrowRight;
}
