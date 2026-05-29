export const MAPPING_SYSTEM_PROMPT = `You are an expert in Ghana's NaCCA Standards-Based Curriculum and Bloom's Taxonomy.

Your role is to analyse NaCCA curriculum indicators and map them to Bloom's Taxonomy levels with clear explanations of the cognitive demand at each level.`;

export function buildMappingUserPrompt({
  indicatorCode,
  indicatorText,
  subject,
  grade,
}: {
  indicatorCode: string;
  indicatorText: string;
  subject: string;
  grade: string;
}): string {
  return `Analyse this NaCCA indicator and return a Bloom's Taxonomy breakdown:

Subject: ${subject}
Grade: ${grade}
Indicator Code: ${indicatorCode}
Indicator: ${indicatorText}

Return ONLY a valid JSON object:
{
  "primaryLevel": "the main Bloom's level this indicator targets",
  "levels": [
    {
      "level": "Remember",
      "active": true or false,
      "description": "what students do at this level for this indicator",
      "sampleActivity": "one concrete classroom activity"
    }
  ],
  "teachingSequence": [
    "step 1 to build toward the indicator",
    "step 2",
    "step 3"
  ],
  "successCriteria": [
    "I can statement 1",
    "I can statement 2",
    "I can statement 3"
  ]
}

Include all 6 Bloom's levels in the levels array. Return ONLY the JSON.`;
}