export const LESSON_SYSTEM_PROMPT = `You are an expert instructional designer specialising in Ghana's NaCCA Standards-Based Curriculum (SBC) for Junior High School.

Your role is to help Ghanaian JHS teachers by transforming NaCCA curriculum indicators into complete, classroom-ready lesson materials.

## Cultural Context Rules — ALWAYS follow these:
- Use Ghanaian names: Ama, Kofi, Adjoa, Kwame, Abena, Yaw, Akosua, Fiifi
- Use Ghanaian settings: Kumasi Central Market, Cape Coast fishing harbour, Ashanti cocoa farms, Accra streets, Makola Market, Tamale, Bolgatanga
- Use Ghana Cedis (GHS) for all monetary examples
- Reference Ghanaian foods: kenkey, banku, fufu, waakye, jollof rice, kelewele
- Reference Ghanaian culture and values: communal living, respect for elders, hard work (obra), honesty
- Use relatable local scenarios: trotro fares, market trading, mobile money (MoMo), football, school farming

## Formatting Rules — ALWAYS follow these:
- Use **bold** for key terms, section headings, and important concepts
- Use - for bullet point lists
- Use 1. 2. 3. for numbered/sequential steps
- Use ### for major section headings
- Never use asterisks (*) as bullet points — use - only
- Write in clear, professional English appropriate for trained teachers

## Output Structure:
Always return EXACTLY three sections separated by these exact markers:
---TEACHER NOTES---
---VISUAL CONTENT PROMPTS---
---STUDENT READING MATERIAL---

Do not add anything before ---TEACHER NOTES--- or after the student reading material.`;

export function buildLessonUserPrompt({
  indicatorCode,
  indicatorText,
  subject,
  grade,
  strand,
  subStrand,
  bloomsLevel,
  duration,
  classSize,
  foundryContext,
}: {
  indicatorCode: string;
  indicatorText: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  bloomsLevel: string;
  duration: string;
  classSize: string;
  foundryContext?: string;
}): string {
  return `Generate complete lesson materials for the following NaCCA indicator:

**Subject:** ${subject}
**Grade:** ${grade} (Junior High School)
**Strand:** ${strand}
**Sub-strand:** ${subStrand}
**Indicator Code:** ${indicatorCode}
**Indicator:** ${indicatorText}
**Bloom's Taxonomy Level:** ${bloomsLevel}
**Lesson Duration:** ${duration} minutes
**Class Size:** ${classSize} students

${foundryContext ? `**Curriculum Grounding from NaCCA Documents:**\n${foundryContext}\n` : ""}

---TEACHER NOTES---
Write detailed teacher notes including:
- **Learning Objectives** — 3 bullet points aligned to the ${bloomsLevel} level of Bloom's Taxonomy
- **Prior Knowledge** — what students should already know before this lesson
- **Lesson Plan** — step-by-step with timings:
  - Starter Activity (5-10 mins)
  - Main Instruction (${Math.round(parseInt(duration) * 0.4)} mins)
  - Group Work / Practice (${Math.round(parseInt(duration) * 0.3)} mins)
  - Plenary / Wrap-up (5-10 mins)
- **Key Vocabulary** — 4-5 terms with brief, student-friendly definitions
- **Common Misconceptions** — 2-3 mistakes students typically make and how to address them
- **Differentiation Tips** — how to support weaker students and challenge stronger ones in a class of ${classSize}
- **Ghanaian Values Link** — connect the lesson to a Ghanaian value or real-life context

---VISUAL CONTENT PROMPTS---
Write 4 specific visual content prompts a teacher can create with minimal resources:

1. **Classroom Poster / Anchor Chart** — describe exactly what it should show, including layout and key content
2. **Board Worked Example** — describe a step-by-step worked example to write on the board using a Ghanaian context
3. **Real-World Photograph Prompt** — describe a specific Ghanaian scene the teacher could photograph, draw, or find online to illustrate the concept
4. **Student Notebook Diagram** — describe exactly what students should draw or complete in their exercise books

Each prompt must be 2-3 sentences and practical for a resource-limited Ghanaian classroom.

---STUDENT READING MATERIAL---
Write a student-facing reading passage including:
- An opening Ghanaian story or scenario that introduces the concept (use local names and settings)
- A clear explanation of the key concept in simple JHS-level language
- **Worked Example 1** — using a Ghanaian context with full solution
- **Worked Example 2** — using a different Ghanaian context, slightly more challenging
- **Check Your Understanding** — 3 questions at increasing difficulty:
  - Question 1: Knowledge/recall level
  - Question 2: Application level  
  - Question 3: Analysis/evaluation level

Use a warm, encouraging tone. Address the student directly as "you". Total length: 300-350 words.`;
}