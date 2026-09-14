import assert from "node:assert/strict";
import test from "node:test";
import { extractLessonPhases } from "../lib/lessonPhases";

const PLAN = `### Performance Indicator
- Learners can model number quantities up to 1000.

### Core Competencies
- Critical Thinking and Problem Solving

### Starter
**Time:** 5 mins
**Learner Activity:** Ask learners to count bottle tops in twos; Guide learners to say the number names aloud.
**TLM:** Bottle tops, number cards

### Main Activity
**Time:** 25 mins
**Learner Activity:** Guide learners to group bottle tops into tens and hundreds
- Let learners record each grouping on their slates
**TLM:** Bundles of sticks, manila card place-value chart

### Guided Practice
**Time:** 10 mins
**Learner Activity:** Learners in pairs build a given number with counters.
**TLM:** Counters

### Independent Practice
**Time:** 12 mins
**Learner Activity:** Ask learners to complete five place-value questions in their exercise books.
**TLM:** Exercise books

### Plenary
**Time:** 8 mins
**Learner Activity:** Discuss with learners what was easy and what was hard today.
**TLM:** Chalkboard

### Key Vocabulary
- ones, tens, hundreds, place value
`;

test("parses each delivery phase into Time / Learner Activity / TLM", () => {
  const phases = extractLessonPhases(PLAN);

  assert.deepEqual(
    phases.map((phase) => phase.phase),
    ["Starter", "Main Activity", "Guided Practice", "Independent Practice", "Plenary"]
  );
  assert.equal(phases[0].time, "5 mins");
  assert.equal(
    phases[0].learnerActivity,
    "Ask learners to count bottle tops in twos; Guide learners to say the number names aloud."
  );
  assert.equal(phases[0].resources, "Bottle tops, number cards");
});

test("a phase whose activity wraps onto bullet lines keeps every line", () => {
  const [, main] = extractLessonPhases(PLAN);
  // The bulleted continuation is a second instruction, so it is separated
  // rather than run on to the end of the first.
  assert.equal(
    main.learnerActivity,
    "Guide learners to group bottle tops into tens and hundreds; Let learners record each grouping on their slates"
  );
  assert.equal(main.resources, "Bundles of sticks, manila card place-value chart");
});

test("a phase written as plain bullets still becomes a row, carrying its prose", () => {
  const phases = extractLessonPhases(`### Starter
- Ask learners to recall yesterday's counting song
- Guide learners to clap in twos

### Plenary
**Time:** 5 mins
**Learner Activity:** Ask learners to name one new thing they learnt.
**TLM:** Chalkboard
`);

  assert.equal(phases.length, 2);
  assert.equal(phases[0].phase, "Starter");
  assert.equal(phases[0].time, "");
  // Two bulleted sentences are joined with a semicolon, not run together.
  assert.equal(
    phases[0].learnerActivity,
    "Ask learners to recall yesterday's counting song; Guide learners to clap in twos"
  );
  assert.equal(phases[1].time, "5 mins");
});

test("tolerates the colon written inside the bold markers", () => {
  const [starter] = extractLessonPhases(`### Starter
**Time:** 6 mins
**Learner Activity:** Ask learners to sort leaves by shape.
**TLM:** Fresh leaves
`);
  assert.equal(starter.time, "6 mins");
  assert.equal(starter.resources, "Fresh leaves");
});

test("a bulleted keyword list becomes a comma-separated cell, not one run-on phrase", () => {
  const [starter] = extractLessonPhases(`### Starter
**Time:** 5 mins
**Learner Activity:** Ask learners to name the parts of a plant.
**TLM:**
- Leaves
- Stems
- Roots
`);
  assert.equal(starter.resources, "Leaves, Stems, Roots");
});
