import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";

export default function HomePage() {
  redirect(`/m/${getPublicEnv().defaultMarket}`);
}
