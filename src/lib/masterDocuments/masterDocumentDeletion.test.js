import {
  isSystemPresentMasterDocument,
} from "./masterDocumentDeletion";

describe("masterDocumentDeletion", () => {
  test("isSystemPresentMasterDocument mostra documentos com ficheiro SGQ", () => {
    expect(isSystemPresentMasterDocument({ code: "PR-6.2", status: "ativo" }, 1)).toBe(true);
  });

  test("isSystemPresentMasterDocument oculta catálogo sem ficheiro", () => {
    expect(isSystemPresentMasterDocument({ code: "PR-6.2", status: "ativo" }, 0)).toBe(false);
    expect(isSystemPresentMasterDocument({ code: "RE-7.2A", status: "ativo" }, 0)).toBe(false);
  });

  test("isSystemPresentMasterDocument mantém rascunhos e templates", () => {
    expect(isSystemPresentMasterDocument({ code: "PR-6.2", status: "rascunho" }, 0)).toBe(true);
    expect(isSystemPresentMasterDocument({ code: "PR-6.2", status: "ativo", template_key: "x" }, 0)).toBe(true);
  });
});
