import { NextRequest, NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { schemeUploads, schemeSubjects } from "@/db/schema";
import { importSchemeOfLearning, type UploadKind } from "@/lib/schemeImport/importScheme";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB - covers multi-page docs and high-res phone photos
const UPLOAD_KINDS: UploadKind[] = ["full_school", "single_subject", "single_week"];

// POST - upload + parse a Scheme of Learning (.docx, .pdf, or a photo)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const subjectSlug = formData.get("subjectSlug");
    const gradeCode = formData.get("gradeCode");
    const termLabel = formData.get("termLabel");
    const uploadKindRaw = formData.get("uploadKind");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }
    if (typeof gradeCode !== "string" || !gradeCode) {
      return NextResponse.json({ success: false, error: "Missing gradeCode" }, { status: 400 });
    }
    const uploadKind: UploadKind = UPLOAD_KINDS.includes(uploadKindRaw as UploadKind)
      ? (uploadKindRaw as UploadKind)
      : "single_subject";
    if (uploadKind !== "full_school" && (typeof subjectSlug !== "string" || !subjectSlug)) {
      return NextResponse.json(
        { success: false, error: "Missing subjectSlug (required unless uploadKind is full_school)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ success: false, error: "File is too large (max 20MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await importSchemeOfLearning({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      gradeCode,
      uploadKind,
      subjectSlug: typeof subjectSlug === "string" && subjectSlug ? subjectSlug : undefined,
      termLabel: typeof termLabel === "string" && termLabel ? termLabel : undefined,
    });

    return NextResponse.json({ success: true, data: summary }, { status: 201 });
  } catch (error) {
    console.error("Scheme upload error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process scheme upload" },
      { status: 500 }
    );
  }
}

// GET - list uploaded schemes with their subjects (metadata only, not the file bytes) - this is the Scheme Library's main list.
export async function GET() {
  try {
    const rows = await db
      .select({
        id: schemeUploads.id,
        fileName: schemeUploads.fileName,
        mimeType: schemeUploads.mimeType,
        gradeCode: schemeUploads.gradeCode,
        termLabel: schemeUploads.termLabel,
        uploadKind: schemeUploads.uploadKind,
        parseStatus: schemeUploads.parseStatus,
        parseWarnings: schemeUploads.parseWarnings,
        uploadedAt: schemeUploads.uploadedAt,
      })
      .from(schemeUploads)
      .orderBy(desc(schemeUploads.uploadedAt));

    const uploadIds = rows.map((r) => r.id);
    const subjectsBySchemeId = new Map<string, { id: string; subjectSlug: string | null; subjectLabel: string }[]>();
    if (uploadIds.length > 0) {
      const subjectRows = await db
        .select({
          id: schemeSubjects.id,
          schemeUploadId: schemeSubjects.schemeUploadId,
          subjectSlug: schemeSubjects.subjectSlug,
          subjectLabel: schemeSubjects.subjectLabel,
        })
        .from(schemeSubjects)
        .where(inArray(schemeSubjects.schemeUploadId, uploadIds));
      for (const s of subjectRows) {
        const list = subjectsBySchemeId.get(s.schemeUploadId) ?? [];
        list.push({ id: s.id, subjectSlug: s.subjectSlug, subjectLabel: s.subjectLabel });
        subjectsBySchemeId.set(s.schemeUploadId, list);
      }
    }

    const data = rows.map((row) => ({ ...row, subjects: subjectsBySchemeId.get(row.id) ?? [] }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Scheme uploads list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch scheme uploads" }, { status: 500 });
  }
}

