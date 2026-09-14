import "dotenv/config";
import { eq } from "drizzle-orm";
import { writeFileSync } from "fs";
import { db } from "../lib/db";
import { schemeUploads } from "../db/schema";

async function main() {
  const [row] = await db
    .select()
    .from(schemeUploads)
    .where(eq(schemeUploads.id, "77442ca7-0d0e-448f-b4e1-6980ec9a749c"))
    .limit(1);
  if (!row) throw new Error("not found");
  writeFileSync("D:\\curriculumcraft-ai\\_tmp_bestbrain_peace.pdf", Buffer.from(row.fileContentBase64, "base64"));
  console.log("Extracted", row.fileName);
  process.exit(0);
}

main();
