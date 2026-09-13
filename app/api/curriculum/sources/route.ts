import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  curriculumDocuments,
  curriculumFrameworks,
  curriculumReleases,
} from "@/db/schema";
import { DEFAULT_CURRICULUM_SLUG } from "@/lib/curriculum/catalog";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const curriculumSlug =
      searchParams.get("curriculum") ?? DEFAULT_CURRICULUM_SLUG;
    const revision = searchParams.get("revision");

    const [framework] = await db
      .select({
        id: curriculumFrameworks.id,
        name: curriculumFrameworks.name,
        authority: curriculumFrameworks.authority,
        version: curriculumFrameworks.version,
        createdAt: curriculumFrameworks.createdAt,
      })
      .from(curriculumFrameworks)
      .where(eq(curriculumFrameworks.slug, curriculumSlug))
      .limit(1);

    if (!framework) {
      return NextResponse.json(
        { success: false, error: "Curriculum not found" },
        { status: 404 }
      );
    }

    const [release] = await db
      .select({
        id: curriculumReleases.id,
        version: curriculumReleases.version,
        status: curriculumReleases.status,
        approvedAt: curriculumReleases.approvedAt,
        createdAt: curriculumReleases.createdAt,
        curriculumName: curriculumFrameworks.name,
        authority: curriculumFrameworks.authority,
      })
      .from(curriculumReleases)
      .innerJoin(
        curriculumFrameworks,
        eq(curriculumReleases.curriculumId, curriculumFrameworks.id)
      )
      .where(and(
        eq(curriculumFrameworks.slug, curriculumSlug),
        revision
          ? eq(curriculumReleases.version, revision)
          : eq(curriculumReleases.status, "approved")
      ))
      .orderBy(desc(curriculumReleases.approvedAt), desc(curriculumReleases.createdAt))
      .limit(1);

    if (!release && revision) {
      return NextResponse.json(
        { success: false, error: "Curriculum release not found" },
        { status: 404 }
      );
    }

    if (!release) {
      return NextResponse.json({
        success: true,
        data: {
          curriculum: {
            slug: curriculumSlug,
            name: framework.name,
            authority: framework.authority,
          },
          release: {
            version: framework.version,
            status: "legacy",
            approvedAt: null,
            createdAt: framework.createdAt,
          },
          documents: [],
        },
      });
    }

    const documents = await db
      .select({
        organization: curriculumDocuments.organization,
        title: curriculumDocuments.title,
        publicationDate: curriculumDocuments.publicationDate,
        version: curriculumDocuments.version,
        sourceUrl: curriculumDocuments.sourceUrl,
        coverage: curriculumDocuments.coverage,
        sha256: curriculumDocuments.sha256,
        extractionVersion: curriculumDocuments.extractionVersion,
      })
      .from(curriculumDocuments)
      .where(eq(curriculumDocuments.releaseId, release.id))
      .orderBy(asc(curriculumDocuments.title));

    return NextResponse.json({
      success: true,
      data: {
        curriculum: {
          slug: curriculumSlug,
          name: release.curriculumName,
          authority: release.authority,
        },
        release: {
          version: release.version,
          status: release.status,
          approvedAt: release.approvedAt,
          createdAt: release.createdAt,
        },
        documents,
      },
    });
  } catch (error) {
    console.error("Curriculum sources API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch curriculum sources" },
      { status: 500 }
    );
  }
}
