const cases = [
  { grade: 'B1', subject: 'mathematics' },
  { grade: 'B4', subject: 'english' },
  { grade: 'B5', subject: 'science' },
  { grade: 'B7', subject: 'mathematics' },
  { grade: 'B8', subject: 'science' },
  { grade: 'B9', subject: 'computing' },
];

function countHeadings(md, heading) {
  return new RegExp(`### ${heading}`, 'i').test(md);
}
const PHASES = ['Performance Indicator', 'Core Competencies', 'Teaching and Learning Resources', 'Reference Prior Knowledge', 'Starter', 'Main Activity', 'Guided Practice', 'Independent Practice', 'Plenary', 'Assessment', 'Homework', 'Differentiation', 'Key Vocabulary'];

async function run() {
  const results = [];
  for (const { grade, subject } of cases) {
    const curriculumRes = await fetch(`http://localhost:3000/api/curriculum?grade=${grade}&subject=${subject}`).then((r) => r.json());
    if (!curriculumRes.success || !curriculumRes.data.strands?.length) {
      results.push({ grade, subject, curriculumSuccess: false, error: curriculumRes.error });
      continue;
    }
    const strand = curriculumRes.data.strands[0];
    const subStrand = strand.subStrands[0];
    const indicator = subStrand.indicators[0];

    const genRes = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade, subject, indicatorCode: indicator.code, indicatorText: indicator.text,
        strand: strand.name, subStrand: subStrand.name, bloomsLevel: indicator.bloomsLevel,
        duration: '60', classSize: '35', difficultyLevel: 'average',
        schoolName: 'Test School', teacherName: 'Test Teacher', weekEnding: '2026-09-18', day: 'Monday',
      }),
    }).then((r) => r.json());

    if (!genRes.success) {
      results.push({ grade, subject, code: indicator.code, genSuccess: false, error: genRes.error });
      continue;
    }
    const d = genRes.data;
    const planMissing = PHASES.filter((h) => !countHeadings(d.lessonPlan, h));
    const noteMissing = PHASES.filter((h) => !countHeadings(d.lessonNote, h));
    const planShorterThanNote = d.lessonPlan.length < d.lessonNote.length;

    results.push({
      grade, subject, code: indicator.code,
      genSuccess: true,
      lessonPlanLen: d.lessonPlan.length,
      lessonNoteLen: d.lessonNote.length,
      planShorterThanNote,
      planMissingHeadings: planMissing,
      noteMissingHeadings: noteMissing,
      header: {
        performanceIndicator: Boolean(d.header.performanceIndicator),
        coreCompetencies: Boolean(d.header.coreCompetencies),
        tlrs: Boolean(d.header.teachingLearningResources),
        contentStandard: Boolean(d.header.contentStandardText),
        sourceNeedsReview: d.header.sourceNeedsReview,
      },
      citationTypes: (d.citations ?? []).map((c) => c.type),
    });
  }
  console.log(JSON.stringify(results, null, 2));
}
run();
