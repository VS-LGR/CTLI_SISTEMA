import {
  cadastroSectionPath,
  getCadastroParentFromPath,
  getCadastroSectionsForFolder,
  getCadastroSectionHint,
  isCadastroSectionPath,
} from "./cadastroSections";

describe("cadastroSections", () => {
  test("cadastroSectionPath gera rota sob o PR correspondente", () => {
    expect(cadastroSectionPath("pesos")).toBe("/requirement/6/pr-6-4/cadastro/pesos");
    expect(cadastroSectionPath("colaboradores")).toBe("/requirement/6/pr-6-2/cadastro/colaboradores");
    expect(cadastroSectionPath("clientes")).toBe("/requirement/7/pr-7-1/cadastro/clientes");
    expect(cadastroSectionPath("fornecedores")).toBe("/requirement/6/pr-6-6/cadastro/fornecedores");
  });

  test("getCadastroParentFromPath extrai req, pasta e secção", () => {
    expect(getCadastroParentFromPath("/requirement/6/pr-6-4/cadastro/thermo")).toEqual({
      reqId: "6",
      folderKey: "pr-6-4",
      sectionId: "thermo",
    });
    expect(getCadastroParentFromPath("/requirement/7/pr-7-1")).toBeNull();
    expect(getCadastroParentFromPath("/cadastros/pesos")).toBeNull();
  });

  test("isCadastroSectionPath identifica rotas de cadastro", () => {
    expect(isCadastroSectionPath("/requirement/6/pr-6-4/cadastro/pesos")).toBe(true);
    expect(isCadastroSectionPath("/requirement/6/pr-6-4")).toBe(false);
  });

  test("getCadastroSectionsForFolder filtra por pasta", () => {
    const sections = getCadastroSectionsForFolder("6", "pr-6-4", "admin").map((s) => s.id);
    expect(sections).toEqual(["cert-peso", "pesos", "thermo"]);
  });

  test("getCadastroSectionHint formata referência ao PR", () => {
    expect(getCadastroSectionHint("clientes")).toBe("PR-7.1 → Clientes");
    expect(getCadastroSectionHint("pesos")).toBe("PR-6.4 → Peso Padrão");
  });
});
