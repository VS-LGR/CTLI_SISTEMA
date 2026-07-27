import {
  resolveHelpModule,
  getHelpCatalogModules,
  getHelpCatalogModulesForUser,
  resolveCadastrosTourPath,
  adaptHelpModuleForUser,
  getHelpModuleByKey,
  HELP_PATH,
} from "./helpModules";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import { hasSeenTour, markTourSeen, resetTour } from "./tourStorage";

describe("helpModules", () => {
  it("resolveHelpModule identifica propostas e coleta", () => {
    expect(resolveHelpModule("/propostas-comerciais")?.moduleKey).toBe("propostas");
    expect(resolveHelpModule("/requirement/7/pr-7-2/coleta")?.moduleKey).toBe("coleta");
    expect(resolveHelpModule(HELP_PATH)?.moduleKey).toBe("ajuda");
  });

  it("resolveHelpModule não confunde cadastros com propostas (pr-7-1)", () => {
    expect(resolveHelpModule("/requirement/7/pr-7-1/cadastro/clientes")?.moduleKey).toBe("cadastros");
    expect(resolveHelpModule("/requirement/7/pr-7-1/cadastro/balancas")?.moduleKey).toBe("cadastros");
    expect(resolveHelpModule("/requirement/6/pr-6-6/cadastro/fornecedores")?.moduleKey).toBe("cadastros");
    expect(resolveHelpModule("/requirement/7/pr-7-1")?.moduleKey).toBe("propostas");
  });

  it("resolveCadastrosTourPath usa secção acessível ao papel", () => {
    // Gerente qualidade: reqs 4/6/8 — não pode ir a clientes (req 7)
    expect(resolveCadastrosTourPath({ role: "gerente_qualidade" })).toBe(
      cadastroSectionPath("fornecedores"),
    );
    // Gerente técnico: req 7 — clientes
    expect(resolveCadastrosTourPath({ role: "gerente_tecnico" })).toBe(
      cadastroSectionPath("clientes"),
    );
    // Adm compras: só pr-6-6
    expect(resolveCadastrosTourPath({ role: "administrativo_compras" })).toBe(
      cadastroSectionPath("fornecedores"),
    );
  });

  it("adaptHelpModuleForUser define tourPath acessível em cadastros", () => {
    const mod = adaptHelpModuleForUser(getHelpModuleByKey("cadastros"), {
      role: "gerente_qualidade",
    });
    expect(mod?.tourPath).toBe(cadastroSectionPath("fornecedores"));
    expect(mod?.steps?.[0]?.title).toMatch(/Provedores/i);
  });

  it("catálogo não inclui a entrada ajuda", () => {
    expect(getHelpCatalogModules().some((m) => m.moduleKey === "ajuda")).toBe(false);
    expect(getHelpCatalogModules().length).toBeGreaterThan(3);
  });

  it("cada passo do catálogo tem highlight", () => {
    for (const mod of getHelpCatalogModules()) {
      for (const step of mod.steps || []) {
        expect(step.highlight).toBeTruthy();
      }
      for (const step of mod.signatorySteps || []) {
        expect(step.highlight).toBeTruthy();
      }
      for (const step of mod.directorSteps || []) {
        expect(step.highlight).toBeTruthy();
      }
    }
  });

  it("filtra catálogo por papel", () => {
    const tecnico = getHelpCatalogModulesForUser({ role: "tecnico_campo", user: { tenant_id: "t1" } });
    expect(tecnico.every((m) => m.moduleKey === "coleta")).toBe(true);

    const diretor = getHelpCatalogModulesForUser({ role: "diretor", user: { tenant_id: "t1" } });
    expect(diretor.map((m) => m.moduleKey)).toEqual(["dashboard"]);

    const signatario = getHelpCatalogModulesForUser({ role: "signatario", user: { tenant_id: "t1" } });
    expect(signatario.every((m) => m.moduleKey.startsWith("certificados"))).toBe(true);
  });

  it("filtra catálogo pela ACL granular da conta", () => {
    const userAcl = {
      tenant_id: "t1",
      access_acl: {
        version: 1,
        modules: ["coleta", "propostas"],
        folders: { "7": ["pr-7-1", "pr-7-2"] },
      },
    };
    const keys = getHelpCatalogModulesForUser({
      role: "gerente_qualidade",
      user: userAcl,
    }).map((m) => m.moduleKey);

    expect(keys).toContain("dashboard");
    expect(keys).toContain("coleta");
    expect(keys).toContain("propostas");
    expect(keys).not.toContain("lista-mestra");
    expect(keys).not.toContain("pedidos-compra");
    expect(keys).not.toContain("certificados");
  });

  it("ACL só lista mestra não inclui coleta nem propostas no tutorial", () => {
    const keys = getHelpCatalogModulesForUser({
      role: "administrativo_vendas",
      user: {
        tenant_id: "t1",
        access_acl: {
          version: 1,
          modules: ["lista_mestra"],
          folders: { "8": ["pr-8-3"] },
        },
      },
    }).map((m) => m.moduleKey);

    expect(keys).toEqual(expect.arrayContaining(["dashboard", "lista-mestra"]));
    expect(keys).not.toContain("propostas");
    expect(keys).not.toContain("coleta");
    expect(keys).not.toContain("cadastros");
  });

  it("ACL com função extra em papel restrito inclui o módulo no tutorial", () => {
    const keys = getHelpCatalogModulesForUser({
      role: "tecnico_campo",
      user: {
        tenant_id: "t1",
        access_acl: {
          version: 1,
          modules: ["coleta", "propostas"],
          folders: { "7": ["pr-7-1", "pr-7-2"] },
        },
      },
    }).map((m) => m.moduleKey);

    expect(keys).toContain("coleta");
    expect(keys).toContain("propostas");
    expect(keys).toContain("dashboard");
    expect(keys).not.toContain("lista-mestra");
  });

  it("ACL remove acessos do papel no catálogo de tutorial", () => {
    const keys = getHelpCatalogModulesForUser({
      role: "gerente_tecnico",
      user: {
        tenant_id: "t1",
        access_acl: {
          version: 1,
          modules: ["coleta"],
          folders: { "7": ["pr-7-2"] },
        },
      },
    }).map((m) => m.moduleKey);

    expect(keys).toContain("coleta");
    expect(keys).toContain("dashboard");
    expect(keys).not.toContain("propostas");
    expect(keys).not.toContain("certificados");
    expect(keys).not.toContain("cadastros");
  });

  it("legado sem ACL mantém tutoriais do papel", () => {
    const keys = getHelpCatalogModulesForUser({
      role: "administrativo_compras",
      user: { tenant_id: "t1", access_acl: {} },
    }).map((m) => m.moduleKey);

    expect(keys).toContain("pedidos-compra");
    expect(keys).toContain("solicitacoes-orcamento");
    expect(keys).not.toContain("propostas");
  });

  it("dashboard adapta texto dos atalhos à ACL", () => {
    const dash = adaptHelpModuleForUser(getHelpModuleByKey("dashboard"), {
      role: "gerente_tecnico",
      user: {
        tenant_id: "t1",
        access_acl: {
          version: 1,
          modules: ["coleta"],
          folders: { "7": ["pr-7-2"] },
        },
      },
    });
    const atalhos = dash?.steps?.find((s) => s.highlight === "tour-dashboard-atalhos");
    expect(atalhos?.body).toMatch(/Coleta/);
    expect(atalhos?.body).not.toMatch(/Propostas/);
    expect(dash?.steps?.some((s) => s.highlight === "tour-dashboard-cert-peso")).toBe(false);
  });

  it("cadastros com ACL só na pasta correta", () => {
    expect(
      resolveCadastrosTourPath({
        role: "gerente_qualidade",
        user: {
          access_acl: {
            version: 1,
            modules: ["cadastros"],
            folders: { "6": ["pr-6-6"] },
          },
        },
      }),
    ).toBe(cadastroSectionPath("fornecedores"));

    expect(
      resolveCadastrosTourPath({
        role: "gerente_qualidade",
        user: {
          access_acl: {
            version: 1,
            modules: ["cadastros"],
            folders: { "8": ["pr-8-3"] },
          },
        },
      }),
    ).toBeNull();
  });
});

describe("tourStorage", () => {
  const userId = "user-test-1";
  const moduleKey = "propostas";

  beforeEach(() => {
    resetTour(userId, moduleKey);
  });

  it("marca e lê tour visto", () => {
    expect(hasSeenTour(userId, moduleKey)).toBe(false);
    markTourSeen(userId, moduleKey);
    expect(hasSeenTour(userId, moduleKey)).toBe(true);
    resetTour(userId, moduleKey);
    expect(hasSeenTour(userId, moduleKey)).toBe(false);
  });
});
