/** Secções do menu Cadastros (hambúrguer) */

export const CADASTRO_SECTIONS = [
  { id: "fornecedores", label: "Fornecedores" },
  { id: "clientes", label: "Clientes do cliente" },
  { id: "colaboradores", label: "Colaboradores" },
  { id: "cert-peso", label: "Certificado de peso padrão" },
  { id: "pesos", label: "Pesos padrão (identificação)" },
  { id: "thermo", label: "Equipamento ambiental" },
  { id: "config-coleta", label: "Config. RE-7.2A", roles: ["admin", "client"] },
  { id: "tecnicos", label: "Técnicos de campo", techniciansOnly: true },
];

export function cadastroSectionPath(id) {
  return `/cadastros/${id}`;
}

export function getCadastroSectionLabel(id) {
  return CADASTRO_SECTIONS.find((s) => s.id === id)?.label || "Cadastros";
}
