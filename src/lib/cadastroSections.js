import { canManageTechnicians, isCtliAdmin } from "@/lib/roles";
import { canAccessCadastroSection } from "@/lib/tenantAccess";

/** Secções do menu Cadastros (submenu lateral) */

export const CADASTRO_SECTIONS = [
  { id: "fornecedores", label: "Fornecedores — 6.6" },
  { id: "clientes", label: "Clientes — 7.1" },
  { id: "colaboradores", label: "Colaboradores — 6.2" },
  { id: "cert-peso", label: "Certificados — 6.4" },
  { id: "pesos", label: "Peso Padrão — 6.4" },
  { id: "balancas", label: "Balanças — 7.1" },
  { id: "thermo", label: "Termobarohigrômetro — 6.4" },
  { id: "computadores", label: "Computadores — 6.4" },
  { id: "veiculos", label: "Veículos — 6.4" },
  { id: "tecnicos", label: "Técnicos de campo — 6.2", techniciansOnly: true },
  { id: "usuarios", label: "Usuários do ambiente", ctliAdminOnly: true },
];

export function cadastroSectionPath(id) {
  return `/cadastros/${id}`;
}

export function getCadastroSectionLabel(id) {
  return CADASTRO_SECTIONS.find((s) => s.id === id)?.label || "Cadastros";
}

export function getVisibleCadastroSections(role, tenant = null, user = null) {
  return CADASTRO_SECTIONS.filter((s) => {
    if (s.techniciansOnly && !canManageTechnicians(role)) return false;
    if (s.ctliAdminOnly && !isCtliAdmin(role)) return false;
    if (tenant && !canAccessCadastroSection({ tenant, role, sectionId: s.id, user })) return false;
    return true;
  });
}
