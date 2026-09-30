import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLoggedIn, safeEqual, sessionValue, SESSION_COOKIE } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const expected = process.env.DASHBOARD_PASSWORD ?? "";
  if (!expected || !safeEqual(password, expected)) redirect("/login?error=1");
  (await cookies()).set(SESSION_COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isLoggedIn()) redirect("/");
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={login} className="w-full max-w-sm rounded-xl border border-line bg-surface-1 p-6">
        <h1 className="text-lg font-semibold">Claude usage tracker</h1>
        <p className="mt-1 text-sm text-ink-2">Enter the dashboard password.</p>
        <input
          type="password"
          name="password"
          autoFocus
          required
          aria-label="Password"
          className="mt-4 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
        />
        {error && <p className="mt-2 text-sm text-danger">Wrong password.</p>}
        <button className="mt-4 w-full rounded-lg bg-accent px-3 py-2 font-medium text-white hover:opacity-90">
          Sign in
        </button>
      </form>
    </main>
  );
}
