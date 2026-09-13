const BASE = "http://localhost:3000";

const cases = [
  { grade: "B7", subject: "mathematics" },
  { grade: "B8", subject: "science" },
  { grade: "B9", subject: "computing" },
  { grade: "B1", subject: "mathematics" },
  { grade: "B3", subject: "mathematics" },
  { grade: "B5", subject: "mathematics" },
];

function firstIndicator(data) {
  for (const strand of data.strands ?? []) {
    for (const sub of strand.subStrands ?? []) {
      for (const ind of sub.indicators ?? []) {
        return { strand, sub, ind };
      }
    }
  }
  return null;
}

async function run() {
  const results = [];
  for (const c of cases) {
    const curriculumRes = await fetch(
      `${BASE}/api/curriculum?grade=${c.grade}&subject=${c.subject}`
    );
    const curriculumJson = await curriculumRes.json();
    if (!curriculumJson.success) {
      results.push({ ...c, stage: "curriculum", error: JSON.stringify(curriculumJson) });
      continue;
    }
    const data = curriculumJson.data;
    const picked = firstIndicator(data);
    if (!picked) {
      results.push({ ...c, stage: "curriculum", error: "no indicator found" });
      continue;
    }
    const { strand, sub, ind } = picked;

    const genBody = {
      indicatorCode: ind.code,
      indicatorText: ind.text,
      subject: data.subject,
      grade: data.grade,
      curriculumSlug: data.curriculumSlug,
      levelCode: data.level?.code,
      levelName: data.level?.name,
      gradeName: data.gradeName,
      typicalAgeMin: data.typicalAgeMin,
      typicalAgeMax: data.typicalAgeMax,
      exemplars: ind.exemplars ?? [],
      exemplarRevision: data.revision,
      strand: strand.name,
      subStrand: sub.name,
      bloomsLevel: ind.bloomsLevel ?? null,
      contentStandardCode: sub.contentStandards?.[0]?.code,
      contentStandardText: sub.contentStandards?.[0]?.text,
      guidance: sub.contentStandards?.[0]?.guidance ?? [],
      duration: "40",
      classSize: "35",
      difficultyLevel: "core",
    };

    const start = Date.now();
    try {
      const genRes = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genBody),
      });
      const elapsedMs = Date.now() - start;
      const genJson = await genRes.json();
      const payload = genJson.data ?? genJson;
      results.push({
        ...c,
        stage: "generate",
        status: genRes.status,
        elapsedMs,
        indicatorCode: ind.code,
        indicatorTextExcerpt: ind.text.slice(0, 80),
        success: genJson.success !== false && !!payload.teacherNotes,
        teacherNotesLen: payload.teacherNotes?.length ?? 0,
        visualPromptsLen: payload.visualPrompts?.length ?? 0,
        studentReadingLen: payload.studentReading?.length ?? 0,
        citations: payload.citations?.map((c) => ({ type: c.type, source: c.source })) ?? [],
        foundryContextPresent: !!payload.foundryContext,
        error: genJson.error,
        teacherNotesExcerpt: payload.teacherNotes?.slice(0, 300),
      });
    } catch (e) {
      results.push({ ...c, stage: "generate", error: String(e), elapsedMs: Date.now() - start });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
