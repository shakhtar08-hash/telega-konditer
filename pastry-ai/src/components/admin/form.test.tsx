import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminImageField } from "./form";

describe("AdminImageField", () => {
  it("renders manual input, file input, and preview", () => {
    const html = renderToStaticMarkup(
      <AdminImageField
        defaultValue="/uploads/admin/triggers/cake.webp"
        fileName="imageFile"
        label="Изображение"
        placeholder="/uploads/admin/triggers/cake.webp"
        textName="imageUrl"
      />,
    );

    expect(html).toContain('name="imageUrl"');
    expect(html).toContain('name="imageFile"');
    expect(html).toContain('type="file"');
    expect(html).toContain('src="/uploads/admin/triggers/cake.webp"');
  });

  it("renders without preview when defaultValue is empty", () => {
    const html = renderToStaticMarkup(
      <AdminImageField
        fileName="previewFile"
        label="Preview"
        textName="preview"
      />,
    );

    expect(html).toContain('name="preview"');
    expect(html).toContain('name="previewFile"');
    expect(html).not.toContain("src=");
  });
});