export default function PaymentReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <section className="w-full max-w-md space-y-4 rounded-lg border border-border bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Оплата прошла
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Платеж обрабатывается автоматически. Вернитесь в Telegram: бот сам
          активирует тариф сразу после подтверждения от YooKassa.
        </p>
      </section>
    </main>
  );
}
