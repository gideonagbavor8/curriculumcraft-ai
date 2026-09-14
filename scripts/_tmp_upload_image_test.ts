import "dotenv/config";
import { readFileSync } from "fs";

async function main() {
  const buffer = readFileSync("D:\\curriculumcraft-ai\\_tmp_scheme_photo.png");
  const form = new FormData();
  form.set("file", new Blob([buffer], { type: "image/png" }), "scheme_photo_test.png");
  form.set("gradeCode", "B4");
  form.set("uploadKind", "single_subject");
  form.set("subjectSlug", "science");
  form.set("termLabel", "First Term");

  const res = await fetch("http://localhost:3000/api/scheme-uploads", { method: "POST", body: form });
  const json = await res.json();
  console.log(res.status, JSON.stringify(json, null, 2));
}

main();
