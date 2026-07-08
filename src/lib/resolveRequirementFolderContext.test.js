import { PROPOSAL_LIST_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { PERSONNEL_LISTAS_PATH } from "@/lib/personnelRoutes";
import { resolveRequirementFolderContext } from "./resolveRequirementFolderContext";

describe("resolveRequirementFolderContext", () => {
  test("resolve rotas /requirement/:id/:folderKey/*", () => {
    expect(resolveRequirementFolderContext("/requirement/6/pr-6-4/cadastro/pesos")).toEqual({
      requirementId: "6",
      folderKey: "pr-6-4",
    });
    expect(resolveRequirementFolderContext("/requirement/7/pr-7-2/coleta")).toEqual({
      requirementId: "7",
      folderKey: "pr-7-2",
    });
    expect(resolveRequirementFolderContext("/requirement/6/pr-6-4-12/verificacoes")).toEqual({
      requirementId: "6",
      folderKey: "pr-6-4-12",
    });
  });

  test("resolve rotas legadas fora de /requirement", () => {
    expect(resolveRequirementFolderContext(PERSONNEL_LISTAS_PATH)).toEqual({
      requirementId: "6",
      folderKey: "pr-6-2",
    });
    expect(resolveRequirementFolderContext(PROPOSAL_LIST_PATH)).toEqual({
      requirementId: "7",
      folderKey: "pr-7-1",
    });
    expect(resolveRequirementFolderContext("/propostas-comerciais/abc")).toEqual({
      requirementId: "7",
      folderKey: "pr-7-1",
    });
  });

  test("retorna null para rotas sem contexto PR", () => {
    expect(resolveRequirementFolderContext("/dashboard")).toBeNull();
    expect(resolveRequirementFolderContext(null)).toBeNull();
  });
});
