import { describe, expect, it } from "vitest";
import { normalizeCodeBase } from "./remapCodeUtils";
import { mapFolderLabelsFromDocuments } from "./procedureLabelUtils";

describe("normalizeCodeBase", () => {
  it("extracts numeric base from codes", () => {
    expect(normalizeCodeBase("6.2")).toBe("6.2");
    expect(normalizeCodeBase("PR-6.2")).toBe("6.2");
    expect(normalizeCodeBase("RE-6.2A")).toBe("6.2");
  });
});

describe("mapFolderLabelsFromDocuments", () => {
  it("uses remapped code via system_folder_key", () => {
    const docs = [
      {
        type: "procedimento",
        status: "ativo",
        code: "PR-5.1",
        title: "Pessoal",
        system_folder_key: "pr-6-2",
      },
    ];
    const map = mapFolderLabelsFromDocuments(docs, [
      { folderKey: "pr-6-2", label: "PR-6.2 Pessoal" },
    ]);
    expect(map["pr-6-2"]).toBe("PR-5.1 Pessoal");
  });
});
