import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            AI Pastry Assistant
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
            Production foundation for pastry-focused AI workflows.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Telegram bot, admin dashboard, prompt registry, usage tracking,
            and AI agents share one modular service layer.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            href="/admin"
          >
            Open admin
          </Link>
          <Link
            className="rounded-md border px-4 py-2 text-sm font-medium"
            href="/login"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
