import "dotenv/config";
import { desc } from "drizzle-orm";
import { db } from "../lib/db";
import { schemeUploads, schemeSubjects } from "../db/schema";

async function main() {
  const uploads = await db.select().from(schemeUploads).orderBy(desc(schemeUploads.uploadedAt)).limit(5);
  for (const u of uploads) {
    console.log("----");
    console.log(JSON.stringify({ ...u, fileContentBase64: `<${u.fileContentBase64.length} chars>` }, null, 2));
    const subs = await db.select().from(schemeSubjects).where(require("drizzle-orm").eq(schemeSubjects.schemeUploadId, u.id));
    console.log("subjects:", JSON.stringify(subs, null, 2));
  }
  process.exit(0);
}

main();
