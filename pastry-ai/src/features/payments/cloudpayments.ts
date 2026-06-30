import { createHmac, timingSafeEqual } from "node:crypto";

export const cloudPaymentsProduct = {
  amount: 899,
  currency: "RUB",
  description: "1 модель и 70 фото",
  name: "AI фотосессия",
};

export function buildCloudPaymentsInvoiceId(userId: string, now = new Date()) {
  return `pastry:${userId}:${now.getTime()}`;
}

export function parseCloudPaymentsInvoiceId(invoiceId: string) {
  const [prefix, userId, timestamp] = invoiceId.split(":");

  if (prefix !== "pastry" || !userId || !timestamp) {
    return null;
  }

  return { userId, timestamp };
}

export function verifyCloudPaymentsSignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
