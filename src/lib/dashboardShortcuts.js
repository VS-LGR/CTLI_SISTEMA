import {
  canAccessColeta,
  canAccessCommercialProposals,
  canAccessPersonnel,
  canAccessCalibrationCertificates,
} from "@/lib/roles";
import { getVisibleCadastroSections, cadastroSectionPath } from "@/lib/cadastroSections";
import { isFieldTechnicianRole } from "@/lib/roles";
import { canAccessModule } from "@/lib/tenantAccess";
import { usesClientSidebarNav } from "@/lib/roleNav";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { PR_71_PROPOSAL_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";
import {
  FileText,
  ClipboardText,
  Certificate,
  Scales,
  Users,
  Cube,
  Thermometer,
} from "@phosphor-icons/react";

/** Atalhos da hero da dashboard — 8 áreas operacionais. */
export const HERO_SHORTCUTS = [
  {
    id: "propostas",
    label: "Propostas Comercial",
    to: PR_71_PROPOSAL_PATH,
    bgClass: "bg-[#4A7FD4] hover:bg-[#3d6fbf]",
    icon: FileText,
    requiresCommercialProposals: true,
    module: "propostas",
  },
  {
    id: "coleta",
    label: "Coleta de Dados",
    to: COLETA_LIST_PATH,
    bgClass: "bg-[#1E3A5F] hover:bg-[#172e4d]",
    icon: ClipboardText,
    requiresColeta: true,
    module: "coleta",
  },
  {
    id: "cert-balanca",
    label: "Emissão de Certificado de Calibração de Balança",
    to: CERTIFICATE_LIST_PATH,
    bgClass: "bg-[#2563EB] hover:bg-[#1d4ed8]",
    icon: Certificate,
    requiresCalibrationCertificates: true,
    module: "certificados",
  },
  {
    id: "cert-peso",
    label: "Emissão de Certificado de Calibração Peso Padrão",
    to: cadastroSectionPath("cert-peso"),
    bgClass: "bg-[#3B82F6] hover:bg-[#2563eb]",
    icon: Certificate,
    cadastroSectionId: "cert-peso",
    module: "cadastros",
  },
  {
    id: "pessoal",
    label: "Pessoal",
    to: "/requirement/6/pr-6-2",
    bgClass: "bg-[#94A3B8] hover:bg-[#7c8fa3]",
    icon: Users,
    requiresPersonnel: true,
    module: "pessoal",
  },
  {
    id: "cad-pesos",
    label: "Cadastro Peso Padrão",
    to: cadastroSectionPath("pesos"),
    bgClass: "bg-[#64748B] hover:bg-[#556275]",
    icon: Cube,
    cadastroSectionId: "pesos",
    module: "pesos",
  },
  {
    id: "cad-balancas",
    label: "Cadastro Balanças",
    to: cadastroSectionPath("balancas"),
    bgClass: "bg-[#1D4ED8] hover:bg-[#1e40af]",
    icon: Scales,
    cadastroSectionId: "balancas",
    module: "balancas",
  },
  {
    id: "cad-thermo",
    label: "Cadastro Termo-Baro-Higrômetro",
    to: cadastroSectionPath("thermo"),
    bgClass: "bg-[#0D9488] hover:bg-[#0f766e]",
    icon: Thermometer,
    cadastroSectionId: "thermo",
    module: "thermo",
  },
];

/** @deprecated use HERO_SHORTCUTS */
export const DASHBOARD_SHORTCUTS = HERO_SHORTCUTS;

/** @deprecated use HERO_SHORTCUTS */
export const CLIENT_PORTAL_SHORTCUTS = HERO_SHORTCUTS;

/** Atalhos operacionais alinhados ao menu cliente. */
const CLIENT_ENV_SHORTCUT_IDS = new Set(["propostas", "coleta", "cert-balanca"]);

function mapShortcutItem(item, { role, tenant, user, visibleCadastroIds }) {
  if (item.module && !canAccessModule({ tenant, role, module: item.module, user })) {
    return {
      id: item.id,
      label: item.label,
      bgClass: item.bgClass,
      icon: item.icon,
      active: false,
      disabledReason: "Módulo não disponível neste ambiente",
    };
  }

  if (item.requiresColeta && !canAccessColeta(role)) {
    return { id: item.id, label: item.label, bgClass: item.bgClass, icon: item.icon, active: false, disabledReason: "Sem permissão para aceder à coleta" };
  }

  if (item.requiresCommercialProposals && !canAccessCommercialProposals(role)) {
    return { id: item.id, label: item.label, bgClass: item.bgClass, icon: item.icon, active: false, disabledReason: "Sem permissão para propostas comerciais" };
  }

  if (item.requiresPersonnel && !canAccessPersonnel(role)) {
    return { id: item.id, label: item.label, bgClass: item.bgClass, icon: item.icon, active: false, disabledReason: "Sem permissão para pessoal" };
  }

  if (item.requiresCalibrationCertificates && !canAccessCalibrationCertificates(role)) {
    return { id: item.id, label: item.label, bgClass: item.bgClass, icon: item.icon, active: false, disabledReason: "Sem permissão para certificados" };
  }

  if (item.cadastroSectionId && !visibleCadastroIds.has(item.cadastroSectionId)) {
    return { id: item.id, label: item.label, bgClass: item.bgClass, icon: item.icon, active: false, disabledReason: "Secção de cadastros não disponível para o seu perfil" };
  }

  return {
    id: item.id,
    label: item.label,
    to: item.to,
    bgClass: item.bgClass,
    icon: item.icon,
    active: true,
  };
}

/**
 * @returns {Array<{ id: string, label: string, to?: string, bgClass: string, icon: import('react').ComponentType, active: boolean, disabledReason?: string }>}
 */
export function getVisibleDashboardShortcuts(role, tenant = null, user = null) {
  if (isFieldTechnicianRole(role)) {
    return HERO_SHORTCUTS
      .filter((item) => item.module === "coleta")
      .map((item) => mapShortcutItem(item, { role, tenant, user, visibleCadastroIds: new Set() }))
      .filter((s) => s.active);
  }

  if (usesClientSidebarNav(role, tenant, user)) {
    return HERO_SHORTCUTS
      .filter((item) => CLIENT_ENV_SHORTCUT_IDS.has(item.id))
      .map((item) => mapShortcutItem(item, { role, tenant, user, visibleCadastroIds: new Set() }))
      .filter((s) => s.active);
  }

  const visibleCadastroIds = new Set(
    getVisibleCadastroSections(role, tenant, user).map((s) => s.id),
  );

  return HERO_SHORTCUTS
    .map((item) => mapShortcutItem(item, { role, tenant, user, visibleCadastroIds }))
    .filter((s) => s.active);
}

export function firstNameFromUser(user) {
  const name = user?.full_name || user?.name || "";
  if (name.trim()) return name.trim().split(/\s+/)[0];
  const email = user?.email || "";
  if (email.includes("@")) return email.split("@")[0];
  return "utilizador";
}
