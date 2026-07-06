import { shouldSyncTenantDocumentToMasterList } from "./syncTenantDocumentToMasterList";

describe("syncTenantDocumentToMasterList", () => {
  test("shouldSyncTenantDocumentToMasterList aceita procedimento/registro/documento", () => {
    expect(shouldSyncTenantDocumentToMasterList({
      tenant_id: "t1",
      section: "procedimento",
      folder_key: "pr-7-2",
    })).toBe(true);
    expect(shouldSyncTenantDocumentToMasterList({
      tenant_id: "t1",
      section: "registro",
    })).toBe(true);
    expect(shouldSyncTenantDocumentToMasterList({
      tenant_id: "t1",
      section: "propostas_comerciais",
    })).toBe(false);
  });
});
