async function run() {
  const curriculumRes = await fetch('http://localhost:3000/api/curriculum?grade=B1&subject=mathematics').then((r) => r.json());
  const strand = curriculumRes.data.strands[0];
  const subStrand = strand.subStrands[0];
  const indicator = subStrand.indicators[0];

  const genRes = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grade: 'B1', subject: 'mathematics', indicatorCode: indicator.code, indicatorText: indicator.text,
      strand: strand.name, subStrand: subStrand.name, duration: '60', classSize: '35', difficultyLevel: 'average',
    }),
  }).then((r) => r.json());
  if (!genRes.success) throw new Error(genRes.error);

  const saveRes = await fetch('http://localhost:3000/api/lessons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      indicatorCode: indicator.code, subject: 'mathematics', grade: 'B1', strand: strand.name, subStrand: subStrand.name,
      lessonPlan: genRes.data.lessonPlan, teacherNotes: genRes.data.lessonNote,
      visualPrompts: genRes.data.visualPrompts, studentReading: genRes.data.studentReading,
      lessonHeader: genRes.data.header,
    }),
  }).then((r) => r.json());
  console.log('save success:', saveRes.success);

  const listRes = await fetch('http://localhost:3000/api/lessons').then((r) => r.json());
  const found = listRes.data.find((l) => l.id === saveRes.data.id);
  console.log('round-trip lessonPlan present:', Boolean(found?.lessonPlan), 'len:', found?.lessonPlan?.length);
  console.log('round-trip lessonHeader present:', Boolean(found?.lessonHeader));

  const delRes = await fetch(`http://localhost:3000/api/lessons?id=${saveRes.data.id}`, { method: 'DELETE' }).then((r) => r.json());
  console.log('cleanup delete success:', delRes.success);
}
run();
