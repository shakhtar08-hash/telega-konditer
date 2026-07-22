import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminTelegramHtmlEditor } from "./telegram-html-editor";

describe("AdminTelegramHtmlEditor", () => {
  it("renders Telegram HTML controls and textarea name", () => {
    const html = renderToStaticMarkup(
      <AdminTelegramHtmlEditor className="min-h-32" name="text" placeholder="Message" />,
    );

    expect(html).toContain("Telegram HTML");
    expect(html).toContain('data-format="bold"');
    expect(html).toContain('data-format="italic"');
    expect(html).toContain('data-format="strikethrough"');
    expect(html).toContain('data-format="code"');
    expect(html).toContain('data-format="pre"');
    expect(html).toContain('data-format="blockquote"');
    expect(html).toContain('data-format="link"');
    expect(html).toContain('name="text"');
  });
});
