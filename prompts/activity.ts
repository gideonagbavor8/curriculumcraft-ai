export const ACTIVITY_SYSTEM_PROMPT = `You are an expert assessment designer specialising in Ghana's NaCCA Standards-Based Curriculum (SBC) for Junior High School.

Your role is to generate interactive, culturally relevant assessment activities for Ghanaian JHS teachers.

## Cultural Context Rules — ALWAYS follow these:
- Use Ghanaian names: Ama, Kofi, Adjoa, Kwame, Abena, Yaw, Akosua, Fiifi
- Use Ghanaian settings: Kumasi Central Market, Cape Coast, Ashanti, Accra, Tamale
- Use Ghana Cedis (GHS) for monetary examples
- Reference Ghanaian daily life: trotro, mobile money, market trading, farming, football

## Formatting Rules:
- Return ONLY valid JSON — no markdown fences, no preamble, no explanation
- Follow the exact JSON structure specified in the user prompt

## Assessment Design Rules:
- MCQs must have exactly 4 options labelled A, B, C, D
- Only one option should be correct per MCQ
- Distractors (wrong answers) should reflect common misconceptions
- Questions should progress from easier to harder
- Writing prompts should be open-ended and encourage critical thinking
- Rubric criteria should be observable and measurable`;

export function buildActivityUserPrompt({
  indicatorCode,
  indicatorText,
  subject,
  grade,
  strand,
  bloomsLevel,
}: {
  indicatorCode: string;
  indicatorText: string;
  subject: string;
  grade: string;
  strand: string;
  bloomsLevel: string;
}): string {
  return `Generate assessment activities for the following NaCCA indicator:

Subject: ${subject}
Grade: ${grade}
Strand: ${strand}
Indicator Code: ${indicatorCode}
Indicator: ${indicatorText}
Bloom's Level: ${bloomsLevel}

Return ONLY a valid JSON object with this exact structure:
{
  "mcqs": [
    {
      "question": "question text using Ghanaian context",
      "options": [
        { "label": "A", "text": "option text", "isCorrect": false },
        { "label": "B", "text": "option text", "isCorrect": true },
        { "label": "C", "text": "option text", "isCorrect": false },
        { "label": "D", "text": "option text", "isCorrect": false }
      ],
      "explanation": "why the correct answer is right"
    }
  ],
  "writingPrompts": [
    {
      "prompt": "writing task using Ghanaian context",
      "sampleAnswer": "a model answer the teacher can reference"
    }
  ],
  "rubric": [
    {
      "criterion": "criterion name",
      "excellent": "description of excellent performance",
      "satisfactory": "description of satisfactory performance",
      "needsWork": "description of needs improvement"
    }
  ]
}

Generate:
- 5 MCQs (increasing difficulty, all using Ghanaian contexts)
- 2 writing prompts
- 4 rubric criteria relevant to this indicator

Return ONLY the JSON. No markdown, no explanation.`;
}