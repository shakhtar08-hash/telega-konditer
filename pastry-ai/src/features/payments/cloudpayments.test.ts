import { describe, expect, it } from "vitest";
import {
  buildCloudPaymentsInvoiceId,
  parseCloudPaymentsInvoiceId,
  verifyCloudPaymentsSignature,
} from "./cloudpayments";

describe("cloudpayments", () => {
  it("builds and parses invoice ids with user id", () => {
    const invoiceId = buildCloudPaymentsInvoiceId("user_123");

    expect(invoiceId).toMatch(/^pastry:user_123:/);
    expect(parseCloudPaymentsInvoiceId(invoiceId)?.userId).toBe("user_123");
  });

  it("rejects unrelated invoice ids", () => {
    expect(parseCloudPaymentsInvoiceId("other:user_123:123")).toBeNull();
  });

  it("verifies CloudPayments HMAC signatures", () => {
    const body = "InvoiceId=pastry%3Auser_123%3A1&Amount=899";
    const signature = "HrPB6FTW0ZciHzXjk8uf+yiTWawj4C9zv8xnJmG/ogQ=";

    expect(verifyCloudPaymentsSignature(body, signature, "secret")).toBe(true);
    expect(verifyCloudPaymentsSignature(body, signature, "wrong")).toBe(false);
  });
});
