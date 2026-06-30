import { prisma } from "@/db/prisma";
import {
  buildCloudPaymentsInvoiceId,
  cloudPaymentsProduct,
} from "@/features/payments/cloudpayments";
import Script from "next/script";

export const dynamic = "force-dynamic";

type PayPageProps = {
  searchParams: Promise<{ telegramId?: string }>;
};

export default async function PayPage({ searchParams }: PayPageProps) {
  const { telegramId } = await searchParams;
  const publicId = process.env.CLOUDPAYMENTS_PUBLIC_ID;

  if (!telegramId) {
    return <PaymentShell title="Payment link is missing Telegram user." />;
  }

  if (!publicId) {
    return (
      <PaymentShell title="CloudPayments is not configured yet. Add CLOUDPAYMENTS_PUBLIC_ID in settings." />
    );
  }

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {},
    create: { telegramId, username: null, name: null },
  });
  const invoiceId = buildCloudPaymentsInvoiceId(user.id);

  await prisma.payment.upsert({
    where: { invoiceId },
    update: {},
    create: {
      amount: cloudPaymentsProduct.amount,
      currency: cloudPaymentsProduct.currency,
      invoiceId,
      provider: "cloudpayments",
      status: "pending",
      userId: user.id,
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <section className="w-full max-w-md space-y-5 rounded-lg border border-border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">AI фотосессия</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            1 модель и 70 фото. Доступ активируется автоматически после оплаты.
          </p>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">К оплате</p>
          <p className="mt-1 text-3xl font-semibold">
            {cloudPaymentsProduct.amount}₽
          </p>
        </div>
        <button
          className="w-full rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background"
          data-amount={cloudPaymentsProduct.amount}
          data-currency={cloudPaymentsProduct.currency}
          data-description={cloudPaymentsProduct.description}
          data-invoice-id={invoiceId}
          data-public-id={publicId}
          id="pay-button"
          type="button"
        >
          Оплатить
        </button>
        <p className="text-xs text-muted-foreground">
          После успешной оплаты вернитесь в Telegram. Бот откроет доступ
          автоматически.
        </p>
      </section>
      <Script
        src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
        strategy="afterInteractive"
      />
      <Script
        dangerouslySetInnerHTML={{
          __html: `
            const button = document.getElementById("pay-button");
            button?.addEventListener("click", () => {
              const widget = new cp.CloudPayments();
              widget.pay("charge", {
                publicId: button.dataset.publicId,
                description: button.dataset.description,
                amount: Number(button.dataset.amount),
                currency: button.dataset.currency,
                invoiceId: button.dataset.invoiceId,
                skin: "mini",
              });
            });
          `,
        }}
        id="cloudpayments-widget"
        strategy="afterInteractive"
      />
    </main>
  );
}

function PaymentShell({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
      </section>
    </main>
  );
}
