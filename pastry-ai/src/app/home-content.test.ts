import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

import RootLayout, { metadata } from "./layout";

describe("root layout metadata", () => {
  it("names the product", () => {
    expect(metadata.title).toBe("AI Pastry Assistant");
  });

  it("suppresses hydration warnings on the html element", () => {
    const layout = RootLayout({
      children: createElement("div", undefined, "content"),
    });

    expect(layout.props.suppressHydrationWarning).toBe(true);

    const html = renderToStaticMarkup(
      createElement(RootLayout, undefined, createElement("div", undefined, "content")),
    );

    expect(html).toContain("<html");
  });
});
