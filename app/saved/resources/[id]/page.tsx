import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isUuid } from "@/lib/authSecurity";
import { db } from "@/lib/db";
import { savedResources } from "@/db/schema";
import MarkdownRenderer from "@/components/lesson/MarkdownRenderer";

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/saved");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [resource] = await db.select().from(savedResources)
    .where(and(eq(savedResources.id, id), eq(savedResources.userId, user.id))).limit(1);
  if (!resource) notFound();
  return <div className="mx-auto max-w-4xl px-4 py-10">
    <Link href="/saved" className="text-sm font-semibold text-green-700 dark:text-green-300">Back to saved resources</Link>
    <h1 className="mt-5 text-2xl font-bold">{resource.title}</h1>
    <p className="mt-2 text-sm text-gray-500">{resource.resourceType.replace(/_/g, " ")} - Saved {resource.createdAt.toLocaleDateString("en-GB")}</p>
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"><MarkdownRenderer content={resource.content} /></div>
  </div>;
}
