import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { emailIsListed, parseEmailList } from "@/domain/access";

function adminEmails() {
  return parseEmailList(getServerEnv().ACCESS_ADMIN_EMAILS);
}

export async function getAuthUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireSignedIn(nextPath = "/scan") {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function isStaffUser(userId: string, email?: string | null): Promise<boolean> {
  if (emailIsListed(email, adminEmails())) {
    return true;
  }
  const admin = createAdminSupabase();
  const { data: isAdmin } = await admin.rpc("user_is_admin", { target: userId });
  if (isAdmin) {
    return true;
  }
  const { data: membership } = await admin
    .from("market_memberships")
    .select("id")
    .eq("user_id", userId)
    .in("role", ["moderator", "organizer"])
    .limit(1)
    .maybeSingle();
  return Boolean(membership);
}

export async function requireStaff(nextPath = "/moderator") {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (emailIsListed(user.email, adminEmails())) {
    const admin = createAdminSupabase();
    await admin.rpc("grant_app_admin", { target: user.id });
    return user;
  }
  const supabase = await createServerSupabase();
  const { data: staff } = await supabase.rpc("is_staff");
  if (!staff) {
    const fallback = await isStaffUser(user.id, user.email);
    if (!fallback) {
      redirect("/");
    }
  }
  return user;
}
