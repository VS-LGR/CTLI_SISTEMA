import { canManageTechnicians, canManageTenantUsers, isCtliAdmin } from "@/lib/roles";
import { canAccessCadastroSection } from "@/lib/tenantAccess";

/** Secções do menu Cadastros (submenu lateral) */

export const CADASTRO_SECTIONS = [
  { id: "fornecedores", label: "Fornecedores" },
  { id: "clientes", label: "Clientes" },
  { id: "colaboradores", label: "Colaboradores" },
  { id: "cert-peso", label: "Certificado de peso padrão" },
  { id: "pesos", label: "Pesos padrão (identificação)" },
  { id: "balancas", label: "Balanças" },
  { id: "thermo", label: "Termo-baro-higrômetro" },
  { id: "config-coleta", label: "Config. RE-7.2A", roles: ["admin", "client", "diretor", "gerente_qualidade", "gerente_tecnico", "signatario", "tecnico_campo"] },
  { id: "config-proposta", label: "Config. RE-7.1A", roles: ["admin", "client", "diretor", "gerente_qualidade", "gerente_tecnico", "signatario"] },
  { id: "tecnicos", label: "Técnicos de campo", techniciansOnly: true },
  { id: "usuarios", label: "Usuários do ambiente", tenantAdminOnly: true },
];

export function cadastroSectionPath(id) {
  return `/cadastros/${id}`;
}

export function getCadastroSectionLabel(id) {
  return CADASTRO_SECTIONS.find((s) => s.id === id)?.label || "Cadastros";
}

export function getVisibleCadastroSections(role, tenant = null) {
  return CADASTRO_SECTIONS.filter((s) => {
    if (s.techniciansOnly && !canManageTechnicians(role)) return false;
    if (s.tenantAdminOnly && !canManageTenantUsers(role)) return false;
    if (s.roles?.length && !s.roles.includes(role) && !isCtliAdmin(role)) return false;
    if (tenant && !canAccessCadastroSection({ tenant, role, sectionId: s.id })) return false;
    return true;
  });
}
