// Cargos / Níveis do sistema (valores alinhados ao CHECK em `profiles` no Supabase)
export const ROLES = [
  { value: "admin", label: "Administrador CTLI", short: "CTLI" },
  { value: "client", label: "Conta cliente (portal)", short: "Cliente" },
  { value: "tecnico_campo", label: "Técnico de campo", short: "Técnico" },
  { value: "diretor", label: "Diretor", short: "Diretor" },
  { value: "gerente_qualidade", label: "Gerente da Qualidade", short: "Gerente Qualidade" },
  { value: "gerente_tecnico", label: "Gerente Técnico", short: "Gerente Técnico" },
  { value: "administrativo_vendas", label: "Administrativo / Vendas", short: "Adm/Vendas" },
];

// Responsáveis: sem administrador CTLI nem contas portal-only
export const RESPONSIBLE_ROLES = ROLES.filter(
  (r) => !["admin", "client", "tecnico_campo"].includes(r.value),
);

export const isCtliAdmin = (role) => role === "admin";

export const canAccessColeta = (role) =>
  ["admin", "client", "tecnico_campo"].includes(role);

/** Pedidos de compra: admin, cliente, gerentes e administrativo/vendas. */
export const canAccessPurchaseOrders = (role) =>
  [
    "admin",
    "client",
    "diretor",
    "gerente_qualidade",
    "gerente_tecnico",
    "administrativo_vendas",
  ].includes(role);

/** Solicitações de orçamento — mesmos papéis que pedidos de compra. */
export const canAccessQuotationRequests = canAccessPurchaseOrders;

/** Módulo 6.2 Pessoal — mesmos papéis que pedidos de compra. */
export const canAccessPersonnel = canAccessPurchaseOrders;

/** Edição de listas padrão do módulo Pessoal. */
export const canEditPersonnelStandardOptions = (role) =>
  ["admin", "client", "gerente_qualidade", "diretor"].includes(role);

export const canManageTechnicians = (role) =>
  role === "admin" || role === "client";

/** Lembretes na dashboard: criar, ler e excluir (admin CTLI + conta cliente). */
export const canManageDashboardReminders = (role) =>
  role === "admin" || role === "client";

export const isTechnicianOnlyNav = (role) => role === "tecnico_campo";

export const roleLabel = (value) => ROLES.find((r) => r.value === value)?.label || value || "—";
export const roleShort = (value) => ROLES.find((r) => r.value === value)?.short || value || "—";
