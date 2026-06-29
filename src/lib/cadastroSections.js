import { canManageTechnicians } from "@/lib/roles";

/** Secções do menu Cadastros (submenu lateral) */

export const CADASTRO_SECTIONS = [
  { id: "fornecedores", label: "Fornecedores" },
  { id: "clientes", label: "Clientes" },
  { id: "colaboradores", label: "Colaboradores" },
  { id: "cert-peso", label: "Certificado de peso padrão" },
  { id: "pesos", label: "Pesos padrão (identificação)" },
  { id: "balancas", label: "Balanças" },
  { id: "thermo", label: "Termo-baro-higrômetro" },
  { id: "config-coleta", label: "Config. RE-7.2A", roles: ["admin", "client"] },
  { id: "config-proposta", label: "Config. RE-7.1A", roles: ["admin", "client"] },
  { id: "tecnicos", label: "Técnicos de campo", techniciansOnly: true },
];

export function cadastroSectionPath(id) {
  return `/cadastros/${id}`;
}

export function getCadastroSectionLabel(id) {
  return CADASTRO_SECTIONS.find((s) => s.id === id)?.label || "Cadastros";
}

export function getVisibleCadastroSections(role) {
  return CADASTRO_SECTIONS.filter((s) => {
    if (s.techniciansOnly && !canManageTechnicians(role)) return false;
    if (s.roles?.length && !s.roles.includes(role)) return false;
    return true;
  });
}
