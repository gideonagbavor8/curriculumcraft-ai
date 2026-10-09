import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AccountProfile from "@/components/auth/AccountProfile";

export default async function AccountPage() {
  if (!await currentUser()) redirect("/sign-in?next=/account");
  return <AccountProfile />;
}
