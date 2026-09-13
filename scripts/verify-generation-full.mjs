const subjects = [
  { grade: 'B7', subject: 'mathematics' },
  { grade: 'B8', subject: 'science' },
  { grade: 'B9', subject: 'computing' },
  { grade: 'B1', subject: 'mathematics' },
  { grade: 'B1', subject: 'english' },
  { grade: 'B1', subject: 'science' },
  { grade: 'B4', subject: 'french' },
  { grade: 'B4', subject: 'computing' },
  { grade: 'B1', subject: 'ghanaian-language' },
  { grade: 'B1', subject: 'history' },
  { grade: 'B1', subject: 'physical-education' },
  { grade: 'B1', subject: 'our-world-our-people' },
  { grade: 'B1', subject: 'religious-and-moral-education' },
];

async function run() {
  const results = [];
  for (const { grade, subject } of subjects) {
    const curriculumRes = await fetch(`http://localhost:3000/api/curriculum?grade=${grade}&subject=${subject}`).then((r) => r.json());
    if (!curriculumRes.success || !curriculumRes.data.strands?.length) {
      results.push({ grade, subject, curriculumSuccess: false });
      continue;
    }
    const strand = curriculumRes.data.strands[0];
    const subStrand = strand.subStrands[0];
    const indicator = subStrand.indicators[0];

    const genRes = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade,
        subject,
        indicatorCode: indicator.code,
        indicatorText: indicator.text,
        strand: strand.name,
        subStrand: subStrand.name,
      }),
    }).then((r) => r.json());

    results.push({
      grade,
      subject,
      code: indicator.code,
      revision: curriculumRes.data.revision,
      strands: curriculumRes.data.strands.length,
      genSuccess: genRes.success,
      hasNotes: Boolean(genRes.data?.teacherNotes),
      hasVisual: Boolean(genRes.data?.visualPrompts),
      hasReading: Boolean(genRes.data?.studentReading),
      citationTypes: (genRes.data?.citations ?? []).map((c) => c.type),
      error: genRes.error,
    });
  }
  console.log(JSON.stringify(results, null, 2));
}
run();
