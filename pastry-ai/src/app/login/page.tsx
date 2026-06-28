export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Admin login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage the pastry assistant.
          </p>
        </div>
        {error ? (
          <p className="rounded-md border border-border bg-muted p-3 text-sm">
            Invalid login or password.
          </p>
        ) : null}
        <form action="/api/admin/login" className="space-y-4" method="post">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Login</span>
            <input
              autoComplete="username"
              className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-foreground"
              name="username"
              required
              type="text"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Password</span>
            <input
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-foreground"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            type="submit"
          >
            Sign in
          </button>
        </form>
        <p className="text-sm text-muted-foreground">
          Credentials are configured through environment variables.
        </p>
      </section>
    </main>
  );
}
