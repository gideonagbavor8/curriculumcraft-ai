import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { currentUser } from "@/lib/auth";
import { safeReturnPath } from "@/lib/authSecurity";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeReturnPath((await searchParams).next ?? null);
  if (await currentUser()) redirect(next);
  return <AuthForm mode="sign-in" next={next} />;
}
