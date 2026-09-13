const regions = ["Volta", "Greater Accra", "Ashanti", "Northern", "Upper East"];

async function run() {
  const curriculumRes = await fetch('http://localhost:3000/api/curriculum?grade=B1&subject=mathematics').then((r) => r.json());
  const strand = curriculumRes.data.strands[0];
  const subStrand = strand.subStrands[0];
  const indicator = subStrand.indicators[0];

  const results = [];
  for (const region of regions) {
    const genRes = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: 'B1', subject: 'mathematics', indicatorCode: indicator.code, indicatorText: indicator.text,
        strand: strand.name, subStrand: subStrand.name, duration: '60', classSize: '35', difficultyLevel: 'average',
        locationProfile: { region },
      }),
    }).then((r) => r.json());

    if (!genRes.success) {
      results.push({ region, success: false, error: genRes.error });
      continue;
    }
    const d = genRes.data;
    results.push({
      region,
      resolvedRegion: d.resolvedLocalContext?.regionName,
      isFallback: d.resolvedLocalContext?.isFallback,
      examples: d.resolvedLocalContext?.examples,
      performanceIndicator: d.header.performanceIndicator,
      lessonNoteSnippet: d.lessonNote.slice(0, 400),
    });
  }
  console.log(JSON.stringify(results, null, 2));
}
run();
