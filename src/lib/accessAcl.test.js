import {
  isAclActive,
  aclAllowsModule,
  aclAllowsRequirement,
  aclAllowsFolder,
  aclAllowsCadastroSection,
  normalizeAccessAcl,
  emptyAccessAcl,
  presetAccessAclForRole,
  accessFlagsFromAcl,
  getAccessAclCatalog,
  aclAllowedRequirementPathPrefixes,
  ACL_VERSION,
  ACL_OPERATIONAL_MODULES,
} from "./accessAcl";

describe("accessAcl", () => {
  it("legado {} não está ativo", () => {
    expect(isAclActive({})).toBe(false);
    expect(isAclActive(null)).toBe(false);
  });

  it("normalize ativa version 1 e filtra pastas inválidas", () => {
    const acl = normalizeAccessAcl({
      modules: ["coleta", "hack", "propostas"],
      folders: { "7": ["pr-7-1", "pr-fake"], "9": ["x"] },
    });
    expect(acl.version).toBe(ACL_VERSION);
    expect(acl.modules).toEqual(["coleta", "propostas"]);
    expect(acl.folders["7"]).toEqual(["pr-7-1"]);
    expect(acl.folders["9"]).toBeUndefined();
    expect(isAclActive(acl)).toBe(true);
  });

  it("permite só sub-procedimentos escolhidos", () => {
    const acl = normalizeAccessAcl({
      modules: ["cadastros"],
      folders: { "6": ["pr-6-2"], "7": ["pr-7-1"] },
    });
    expect(aclAllowsRequirement(acl, "6")).toBe(true);
    expect(aclAllowsRequirement(acl, "7")).toBe(true);
    expect(aclAllowsRequirement(acl, "8")).toBe(false);
    expect(aclAllowsFolder(acl, "6", "pr-6-2")).toBe(true);
    expect(aclAllowsFolder(acl, "6", "pr-6-6")).toBe(false);
    expect(aclAllowsFolder(acl, "7", "pr-7-1")).toBe(true);
    expect(aclAllowsFolder(acl, "7", "pr-7-2")).toBe(false);
  });

  it("aclAllowsCadastroSection exige módulo e pasta pai", () => {
    const acl = normalizeAccessAcl({
      modules: ["cadastros"],
      folders: { "7": ["pr-7-1"] },
    });
    expect(aclAllowsCadastroSection(acl, "clientes")).toBe(true);
    expect(aclAllowsCadastroSection(acl, "fornecedores")).toBe(false);
  });

  it("accessFlagsFromAcl espelha módulos", () => {
    expect(accessFlagsFromAcl(normalizeAccessAcl({ modules: ["coleta", "certificados"], folders: {} }))).toEqual({
      access_coleta: true,
      access_certificados: true,
    });
  });

  it("preset gerente_qualidade inclui req 4/6/8", () => {
    const acl = presetAccessAclForRole("gerente_qualidade");
    expect(aclAllowsRequirement(acl, "6")).toBe(true);
    expect(aclAllowsRequirement(acl, "7")).toBe(false);
    expect(aclAllowsFolder(acl, "6", "pr-6-2")).toBe(true);
  });

  it("catálogo e emptyAcl", () => {
    const cat = getAccessAclCatalog();
    expect(cat.modules.length).toBe(ACL_OPERATIONAL_MODULES.length);
    expect(cat.requirements.length).toBeGreaterThanOrEqual(5);
    expect(emptyAccessAcl().version).toBe(1);
    expect(aclAllowedRequirementPathPrefixes(
      normalizeAccessAcl({ folders: { "7": ["pr-7-1"] }, modules: [] }),
    )).toContain("/requirement/7/pr-7-1");
  });

  it("aclAllowsModule para reqN", () => {
    const acl = normalizeAccessAcl({ folders: { "7": ["pr-7-1"] }, modules: [] });
    expect(aclAllowsModule(acl, "req7")).toBe(true);
    expect(aclAllowsModule(acl, "req6")).toBe(false);
  });
});
