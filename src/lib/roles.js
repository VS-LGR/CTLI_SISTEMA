// Cargos / Níveis do sistema
export const ROLES = [
  { value: "admin", label: "Administrador", short: "Admin" },
  { value: "diretor", label: "Diretor", short: "Diretor" },
  { value: "gerente_qualidade", label: "Gerente da Qualidade", short: "Gerente Qualidade" },
  { value: "gerente_tecnico", label: "Gerente Técnico", short: "Gerente Técnico" },
  { value: "administrativo_vendas", label: "Administrativo / Vendas", short: "Adm/Vendas" },
];

// Cargos atribuíveis a Responsáveis (não inclui Administrador)
export const RESPONSIBLE_ROLES = ROLES.filter((r) => r.value !== "admin");

export const roleLabel = (value) => ROLES.find((r) => r.value === value)?.label || value || "—";
export const roleShort = (value) => ROLES.find((r) => r.value === value)?.short || value || "—";
