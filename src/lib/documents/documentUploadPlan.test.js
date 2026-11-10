import { routeForMasterDocument } from "@/lib/documentFolderConfig";
import {
  compareRevisions,
  decideUploadAction,
  orderBatchUploads,
  parseRevisionNumber,
  parseUploadFileName,
  planMasterSync,
  revisionFromVersion,
} from "@/lib/documents/documentUploadPlan";

describe("documentUploadPlan", () => {
  test("normaliza 02, 2 e 2.0 para o mesmo número", () => {
    expect(parseRevisionNumber("02")).toBe(2);
    expect(parseRevisionNumber("2")).toBe(2);
    expect(parseRevisionNumber("2.0")).toBe(2);
    expect(parseRevisionNumber("Rev. 03")).toBe(3);
    expect(parseRevisionNumber("texto")).toBeNull();
    expect(revisionFromVersion("1.0")).toBe("01");
    expect(compareRevisions("02", "2.0")).toBe("same");
  });

  test("revisão mais recente substitui, anterior arquiva e igual bloqueia", () => {
    expect(decideUploadAction({
      matched: true,
      incomingRevision: "04",
      currentRevision: "03",
      hasVigenteFile: true,
    })).toBe("become_vigente");
    expect(decideUploadAction({
      matched: true,
      incomingRevision: "01",
      currentRevision: "03",
      hasVigenteFile: true,
    })).toBe("archive_only");
    expect(decideUploadAction({
      matched: true,
      incomingRevision: "03",
      currentRevision: "03",
      hasVigenteFile: true,
    })).toBe("blocked_same");
    expect(decideUploadAction({
      matched: true,
      incomingRevision: "03",
      currentRevision: "03",
      hasVigenteFile: false,
    })).toBe("become_vigente");
    expect(decideUploadAction({
      matched: true,
      incomingRevision: "A",
      currentRevision: "03",
      hasVigenteFile: true,
    })).toBe("needs_confirm");
    expect(decideUploadAction({ matched: false, incomingRevision: "02" })).toBe("pending_code");
  });

  test("lê código e revisão do nome do ficheiro", () => {
    expect(parseUploadFileName("PR-6.3_Rev02.pdf")).toEqual({ code: "PR-6.3", revision: "02" });
    expect(parseUploadFileName("RE-6.2A Rev. 03.pdf")).toEqual({ code: "RE-6.2A", revision: "03" });
    expect(parseUploadFileName("PR-6.3.pdf").code).toBe("PR-6.3");
  });

  test("no lote só a revisão mais alta fica vigente", () => {
    const ordered = orderBatchUploads([
      { id: "a", masterId: "m", revision: "05", action: "become_vigente" },
      { id: "b", masterId: "m", revision: "04", action: "become_vigente" },
      { id: "c", masterId: "m", revision: "05", action: "become_vigente" },
    ]);
    const byId = Object.fromEntries(ordered.map((row) => [row.id, row.action]));
    expect(byId.a).toBe("become_vigente");
    expect(byId.b).toBe("archive_only");
    expect(byId.c).toBe("blocked_same");
    expect(ordered.findIndex((row) => row.id === "b")).toBeLessThan(ordered.findIndex((row) => row.id === "a"));
  });

  test("sync não avança a revisão vigente quando a recebida é anterior", () => {
    const older = planMasterSync({
      tenantDoc: { status: "obsoleto", version: "01", has_file: true, storage_path: "a/b.pdf" },
      currentRevision: "03",
    });
    expect(older.bump).toBe(false);
    expect(older.revision).toBe("archive");

    const newer = planMasterSync({
      tenantDoc: { status: "vigente", version: "04", has_file: true, storage_path: "a/c.pdf" },
      previousDoc: { status: "obsoleto", version: "04", storage_path: "a/c.pdf" },
      currentRevision: "03",
    });
    expect(newer.bump).toBe(true);
    expect(newer.revision).toBe("approve");

    const promoted = planMasterSync({
      tenantDoc: { status: "vigente", version: "03", has_file: true, storage_path: "a/c.pdf" },
      previousDoc: { status: "obsoleto", version: "03", storage_path: "a/c.pdf" },
      currentRevision: "03",
    });
    expect(promoted.bump).toBe(false);
    expect(promoted.revision).toBe("attach_file");

    const unchanged = planMasterSync({
      tenantDoc: { status: "vigente", version: "03", has_file: true, storage_path: "a/c.pdf" },
      previousDoc: { status: "vigente", version: "03", storage_path: "a/c.pdf" },
      currentRevision: "03",
    });
    expect(unchanged.bump).toBe(false);
    expect(unchanged.revision).toBe("skip");
  });
});

describe("routeForMasterDocument", () => {
  test("encaminha PR-6.3 e PR-6.4.10 para a pasta do procedimento", () => {
    expect(routeForMasterDocument({ code: "PR-6.3" })).toEqual({
      requirement: "6",
      folderKey: "pr-6-3",
      section: "procedimento",
    });
    expect(routeForMasterDocument({ code: "PR-6.4.10" })).toEqual({
      requirement: "6",
      folderKey: "pr-6-4-10",
      section: "procedimento",
    });
  });

  test("system_folder_key prevalece e manual, política e documentação legal mantêm o destino", () => {
    expect(routeForMasterDocument({
      code: "PR-6.3",
      system_folder_key: "pr-8-3",
    }).folderKey).toBe("pr-8-3");
    expect(routeForMasterDocument({ code: "MQ-000" }).folderKey).toBe("manual-qualidade");
    expect(routeForMasterDocument({ code: "PQ", category: "Política da qualidade" }).folderKey).toBe("politica-qualidade");
    expect(routeForMasterDocument({ code: "DOC-1", type: "documento_interno" }).folderKey).toBe("documentacao-legal");
  });
});
