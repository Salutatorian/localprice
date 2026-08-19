import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/data/catalog";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/scan";
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    redirect(next);
  }

  return (
    <div className="py-8">
      {params.error ? (
        <p className="mb-4 text-center text-sm text-destructive">
          The email link did not create a session. Request a new code and paste it here, or open the
          link in this same browser.
        </p>
      ) : null}
      <LoginForm nextPath={next} />
    </div>
  );
}
