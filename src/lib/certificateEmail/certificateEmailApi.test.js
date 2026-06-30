import {
  resolveClientEmail,
  isValidEmail,
  blobToBase64,
} from "./certificateEmailApi";

describe("certificateEmailApi", () => {
  const endCustomers = [
    { id: "cust-1", email: "cliente@empresa.com.br" },
    { id: "cust-2", email: "" },
  ];

  test("resolveClientEmail uses live cadastro when valid", () => {
    const cert = { end_customer_id: "cust-1" };
    expect(resolveClientEmail(cert, endCustomers)).toEqual({
      email: "cliente@empresa.com.br",
      source: "cadastro",
    });
  });

  test("resolveClientEmail falls back to technical snapshot", () => {
    const cert = {
      end_customer_id: "cust-2",
      technical_snapshot: { clientSnapshot: { email: "snap@cliente.com" } },
    };
    expect(resolveClientEmail(cert, endCustomers)).toEqual({
      email: "snap@cliente.com",
      source: "snapshot",
    });
  });

  test("resolveClientEmail returns empty when no email found", () => {
    const cert = { end_customer_id: "cust-2", technical_snapshot: {} };
    expect(resolveClientEmail(cert, endCustomers)).toEqual({
      email: "",
      source: "none",
    });
  });

  test("isValidEmail validates basic addresses", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  test("blobToBase64 encodes blob without data URL prefix", async () => {
    const blob = new Blob(["pdf-content"], { type: "application/pdf" });
    const base64 = await blobToBase64(blob);
    expect(base64).not.toContain("data:");
    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);
  });
});
