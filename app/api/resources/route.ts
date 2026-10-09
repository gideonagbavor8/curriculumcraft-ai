import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedResources } from "@/db/schema";
import { authorize } from "@/lib/auth";
import { isUuid } from "@/lib/authSecurity";

export async function GET(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const id = request.nextUrl.searchParams.get("id");
    if (id && !isUuid(id)) return NextResponse.json({ success: false, error: "Invalid resource ID" }, { status: 400 });
    const data = await db.select().from(savedResources)
      .where(and(eq(savedResources.userId, user.id), id ? eq(savedResources.id, id) : undefined))
      .orderBy(desc(savedResources.createdAt));
    if (id && !data.length) return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error("Saved resource lookup failed:", error);
    return NextResponse.json({ success: false, error: "Unable to load saved resources." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const raw = await request.text();
    if (raw.length > 1_000_000) return NextResponse.json({ success: false, error: "Resource is too large." }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)
      || typeof body.title !== "string" || !body.title.trim() || body.title.length > 200
      || typeof body.resourceType !== "string" || !/^[a-z][a-z0-9_-]{0,49}$/.test(body.resourceType)
      || typeof body.content !== "string" || !body.content.trim() || body.content.length > 500_000) {
      return NextResponse.json({ success: false, error: "Enter a title, resource type, and content within the allowed limits." }, { status: 400 });
    }
    const [data] = await db.insert(savedResources).values({
      userId: user.id, title: body.title.trim(), resourceType: body.resourceType, content: body.content,
    }).returning();
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("Resource save failed:", error);
    return NextResponse.json({ success: false, error: "Unable to save this resource." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !isUuid(id)) return NextResponse.json({ success: false, error: "Invalid resource ID" }, { status: 400 });
    const [data] = await db.delete(savedResources)
      .where(and(eq(savedResources.id, id), eq(savedResources.userId, user.id))).returning({ id: savedResources.id });
    if (!data) return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resource deletion failed:", error);
    return NextResponse.json({ success: false, error: "Unable to delete this resource." }, { status: 500 });
  }
}
