import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PaymentReturnPage from "./page";

describe("PaymentReturnPage", () => {
  it("renders the post-payment return instructions", () => {
    const html = renderToStaticMarkup(<PaymentReturnPage />);

    expect(html).toContain("Оплата прошла");
    expect(html).toContain("Telegram");
  });
});
