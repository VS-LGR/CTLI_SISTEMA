import {
  isClientAllowedPath,
  isClientEnvironmentUser,
  getClientListaMestraNavItems,
  MANUAL_QUALIDADE_PATH,
} from "./clientNavConfig";
import { COLETA_HUB_PATH, COLETA_LIST_PATH } from "./coletaRoutes";
import { CERTIFICATE_LIST_PATH } from "./certificateRoutes";
import { PROPOSAL_LIST_PATH } from "./commercialProposals/commercialProposalRoutes";

const portalTenant = { deployment_model: "client_portal" };
const clientUser = { tenant_id: "tenant-1" };

describe("clientNavConfig", () => {
  test("isClientEnvironmentUser — apenas conta client", () => {
    expect(isClientEnvironmentUser("client", clientUser, portalTenant)).toBe(true);
    expect(isClientEnvironmentUser("diretor", clientUser, portalTenant)).toBe(false);
    expect(isClientEnvironmentUser("admin", clientUser, portalTenant)).toBe(false);
    expect(isClientEnvironmentUser("client", { tenant_id: null }, portalTenant)).toBe(true);
    expect(isClientEnvironmentUser("tecnico_campo", clientUser, portalTenant)).toBe(false);
    expect(isClientEnvironmentUser("signatario", clientUser, { deployment_model: "full" })).toBe(false);
    expect(isClientEnvironmentUser("signatario", clientUser, portalTenant)).toBe(false);
  });

  test("isClientAllowedPath permite rotas do menu", () => {
    expect(isClientAllowedPath("/dashboard")).toBe(true);
    expect(isClientAllowedPath(PROPOSAL_LIST_PATH)).toBe(true);
    expect(isClientAllowedPath(`${PROPOSAL_LIST_PATH}/nova`)).toBe(true);
    expect(isClientAllowedPath(COLETA_HUB_PATH)).toBe(true);
    expect(isClientAllowedPath(COLETA_LIST_PATH)).toBe(true);
    expect(isClientAllowedPath(`${COLETA_LIST_PATH}/abc`)).toBe(true);
    expect(isClientAllowedPath(CERTIFICATE_LIST_PATH)).toBe(true);
    expect(isClientAllowedPath(MANUAL_QUALIDADE_PATH)).toBe(true);
    expect(isClientAllowedPath("/requirement/8/pr-8-3")).toBe(true);
    expect(isClientAllowedPath("/lista-mestra/doc-1")).toBe(true);
  });

  test("isClientAllowedPath bloqueia cadastros, admin e requisitos fora do menu", () => {
    expect(isClientAllowedPath("/cadastros/pesos")).toBe(false);
    expect(isClientAllowedPath("/backup")).toBe(false);
    expect(isClientAllowedPath("/admin/clients")).toBe(false);
    expect(isClientAllowedPath("/requirement/4/pr-4-1")).toBe(false);
    expect(isClientAllowedPath("/requirement/6/pr-6-2")).toBe(false);
    expect(isClientAllowedPath("/requirement/5/politica-qualidade")).toBe(false);
    expect(isClientAllowedPath("/requirement/8/pr-8-3/config/re-72a")).toBe(false);
    expect(isClientAllowedPath("/pedidos-compra")).toBe(false);
    expect(isClientAllowedPath("/solicitacoes-orcamento")).toBe(false);
  });

  test("isClientAllowedPath com ACL libera pedidos e orçamento", () => {
    const aclUser = {
      access_acl: {
        version: 1,
        modules: ["pedidos_compra", "solicitacao_orcamento"],
        folders: { "6": ["pr-6-6"] },
      },
    };
    expect(isClientAllowedPath("/pedidos-compra", aclUser)).toBe(true);
    expect(isClientAllowedPath("/solicitacoes-orcamento", aclUser)).toBe(true);
    expect(isClientAllowedPath("/requirement/6/pr-6-6", aclUser)).toBe(true);
  });

  test("getClientListaMestraNavItems exclui config", () => {
    const items = getClientListaMestraNavItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.key === "lista_mestra_config")).toBe(false);
    expect(items.some((i) => i.key === "lista_mestra_internos")).toBe(true);
  });
});
