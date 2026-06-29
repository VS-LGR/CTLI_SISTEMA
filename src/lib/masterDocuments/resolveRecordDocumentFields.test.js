import { isRecordDocumentStale } from "@/lib/masterDocuments/resolveRecordDocumentFields";

describe("isRecordDocumentStale", () => {
  const record = {
    document_code: "RE-7.1A",
    document_reference: "PR-7.1",
    document_revision: "00",
  };

  it("returns false when master matches record", () => {
    expect(isRecordDocumentStale(record, {
      code: "RE-7.1A",
      reference: "PR-7.1",
      revision: "00",
    })).toBe(false);
  });

  it("returns true when master revision is newer", () => {
    expect(isRecordDocumentStale(record, {
      code: "RE-7.1A",
      reference: "PR-7.1",
      revision: "01",
    })).toBe(true);
  });
});
