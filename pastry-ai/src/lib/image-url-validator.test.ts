import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, assertAllowedImageUrl } from "./image-url-validator";

describe("image-url-validator", () => {
  describe("allowed URLs", () => {
    it("allows Telegram file URLs", () => {
      expect(
        isAllowedImageUrl("https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/photos/file_0.jpg"),
      ).toBe(true);
    });

    it("allows data URLs", () => {
      expect(isAllowedImageUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")).toBe(true);
    });

    it("allows KIE result URLs", () => {
      expect(isAllowedImageUrl("https://cdn.kie.ai/output/abc123.jpg")).toBe(true);
      expect(isAllowedImageUrl("https://storage.kie.ai/generated/img.png")).toBe(true);
    });

    it("allows current KIE tempfile result URLs", () => {
      expect(
        isAllowedImageUrl(
          "https://tempfile.aiquickdraw.com/workers/images/image_1783794519348_pullm7.jpg",
        ),
      ).toBe(true);
    });
  });

  describe("blocked URLs", () => {
    it("rejects localhost", () => {
      expect(isAllowedImageUrl("http://localhost:3000/image.png")).toBe(false);
    });

    it("rejects 127.0.0.1", () => {
      expect(isAllowedImageUrl("https://127.0.0.1:5432/data")).toBe(false);
    });

    it("rejects private IPs (10.x.x.x)", () => {
      expect(isAllowedImageUrl("https://10.0.0.1/admin")).toBe(false);
    });

    it("rejects private IPs (192.168.x.x)", () => {
      expect(isAllowedImageUrl("https://192.168.1.1/config")).toBe(false);
    });

    it("rejects private IPs (172.16.x.x)", () => {
      expect(isAllowedImageUrl("https://172.16.0.1/secrets")).toBe(false);
    });

    it("rejects cloud metadata endpoint", () => {
      expect(isAllowedImageUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    });

    it("rejects metadata.google.internal", () => {
      expect(isAllowedImageUrl("https://metadata.google.internal/computeMetadata/v1/")).toBe(false);
    });

    it("rejects 100.100.100.200 (Yandex/Alibaba metadata)", () => {
      expect(isAllowedImageUrl("https://100.100.100.200/latest/meta-data/")).toBe(false);
    });

    it("rejects internal domain", () => {
      expect(isAllowedImageUrl("https://internal.service.local/config")).toBe(false);
    });

    it("rejects http (non-https)", () => {
      expect(isAllowedImageUrl("http://example.com/image.png")).toBe(false);
    });

    it("rejects arbitrary external URLs", () => {
      expect(isAllowedImageUrl("https://evil.com/malware.png")).toBe(false);
    });

    it("rejects malformed URLs", () => {
      expect(isAllowedImageUrl("not-a-url")).toBe(false);
      expect(isAllowedImageUrl("")).toBe(false);
    });

    it("rejects 0.0.0.0", () => {
      expect(isAllowedImageUrl("https://0.0.0.0/config")).toBe(false);
    });
  });

  describe("assertAllowedImageUrl", () => {
    it("throws for blocked URLs", () => {
      expect(() => assertAllowedImageUrl("https://localhost:3000/img.png", "test")).toThrow("SSRF guard");
    });

    it("does not throw for allowed URLs", () => {
      expect(() =>
        assertAllowedImageUrl("https://api.telegram.org/file/bot123:abc/file.jpg", "test"),
      ).not.toThrow();
    });
  });
});
