export type BloomsLevel =
  | "Remember"
  | "Understand"
  | "Apply"
  | "Analyse"
  | "Evaluate"
  | "Create";

export type DifficultyLevel = "struggling" | "average" | "advanced";
export type ReviewStatus = "pending" | "needs-review" | "approved" | "rejected";
export type ExtractionConfidence = "low" | "medium" | "high";

export interface CurriculumProvenance {
  documentId?: string | null;
  pdfPage?: number | null;
  printedPage?: string | null;
  sourceReference?: string | null;
  extractionConfidence?: ExtractionConfidence | null;
  reviewStatus?: ReviewStatus;
  ambiguityFlag?: boolean;
  rawSourceText?: string | null;
}

export interface CurriculumGrade {
  code: string;
  name: string;
  aliases?: string[];
  sortOrder: number;
  typicalAgeMin: number | null;
  typicalAgeMax: number | null;
}

export interface EducationLevel {
  code: string;
  name: string;
  sortOrder: number;
  grades: CurriculumGrade[];
}

export interface CurriculumCatalog {
  curriculum: {
    name: string;
    slug: string;
    countryCode: string;
    authority: string;
    version: string;
  };
  levels: EducationLevel[];
  subjects: Pick<Subject, "id" | "name" | "slug">[];
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
}

export interface Strand {
  id: string;
  subjectId: string;
  name: string;
}

export interface SubStrand {
  id: string;
  strandId: string;
  name: string;
}

export interface Indicator {
  id: string;
  subStrandId: string;
  code: string;
  text: string;
  bloomsLevel: BloomsLevel | null;
  grade: string;
  contentStandard?: ContentStandard | null;
  exemplars: IndicatorExemplar[];
}

export interface IndicatorExemplar extends CurriculumProvenance {
  code: string | null;
  label?: string | null;
  text: string;
  sortOrder: number;
  revision: string;
  sourceReference?: string | null;
}

export interface CurriculumGuidance extends CurriculumProvenance {
  kind:
    | "enquiry_route"
    | "core_competency"
    | "subject_specific_practice"
    | "note"
    | "media_reference"
    | string;
  text: string;
  sortOrder: number;
}

export interface ContentStandard extends CurriculumProvenance {
  code: string;
  text: string;
  displayText?: string | null;
  sortOrder: number;
  guidance?: CurriculumGuidance[];
}

export interface SavedLesson {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  lessonPlan?: string | null;
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  difficultyLevel: string;
  createdAt: Date;
  lessonHeader?: LessonHeader | null;
}

export interface CurriculumSubStrand {
  name: string;
  displayName?: string | null;
  contentStandards?: Array<ContentStandard & {
    indicators: Pick<
      Indicator,
      "code" | "text" | "bloomsLevel" | "grade" | "exemplars"
    >[];
  }>;
  indicators: Pick<
    Indicator,
    "code" | "text" | "bloomsLevel" | "grade" | "exemplars"
  >[];
}

export interface CurriculumStrand {
  name: string;
  subStrands: CurriculumSubStrand[];
}

export interface CurriculumResponse {
  subject: string;
  grade: string;
  strands: CurriculumStrand[];
}

export interface GenerateRequest {
  indicatorCode: string;
  indicatorText: string;
  subject: string;
  grade: string;
  curriculumSlug?: string;
  levelCode?: string;
  levelName?: string;
  gradeName?: string;
  typicalAgeMin?: number;
  typicalAgeMax?: number;
  exemplars?: IndicatorExemplar[];
  exemplarRevision?: string;
  strand: string;
  subStrand: string;
  bloomsLevel?: BloomsLevel | null;
  contentStandardCode?: string;
  contentStandardText?: string;
  guidance?: CurriculumGuidance[];
  duration: "40" | "60" | "80";
  classSize: "25" | "35" | "45" | "60";
  difficultyLevel: DifficultyLevel;
  // Optional GES lesson-plan header fields - teacher/school identity, not curriculum data.
  schoolName?: string;
  teacherName?: string;
  weekEnding?: string;
  day?: string;
  // Optional local-context personalisation (see lib/localContext).
  locationProfile?: import("@/lib/localContext/types").LocationProfile;
  exampleHistory?: Partial<Record<import("@/lib/localContext/types").LocalExampleCategory, string[]>>;
}

export interface Citation {
  id: string;
  text: string;
  source: string;
  type: "foundry" | "curriculum";
}

// The GES/NaCCA standard lesson-plan header block. Curriculum fields are always
// derived server-side from the selected indicator; school/teacher/week/day are
// optional teacher-supplied identity fields, never invented by the model.
export interface LessonHeader {
  schoolName?: string;
  teacherName?: string;
  weekEnding?: string;
  day?: string;
  curriculumSlug: string;
  levelName: string;
  subject: string;
  gradeName: string;
  grade: string;
  classSize: string;
  duration: string;
  strand: string;
  subStrand: string;
  contentStandardCode?: string;
  contentStandardText?: string;
  indicatorCode: string;
  indicatorText: string;
  performanceIndicator?: string;
  coreCompetencies?: string;
  teachingLearningResources?: string;
  reference: string;
  // True when the source indicator/content-standard text is flagged as
  // needing human review (e.g. extraction ambiguity) - never silently hidden.
  sourceNeedsReview?: boolean;
}

export interface GenerateResponse {
  lessonPlan: string;
  lessonNote: string;
  // Alias of lessonNote, kept for backward compatibility with the saved_lessons
  // schema and any older consumers that read teacherNotes directly.
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  difficultyLevel: string;
  citations?: Citation[];
  foundryContext?: string;
  header: LessonHeader;
  // The resolved local-context examples actually used, so the client can
  // update its rotation history to avoid repeating them next time.
  resolvedLocalContext?: import("@/lib/localContext/types").ResolvedLocalContext;
}

export interface MCQOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQuestion {
  question: string;
  options: MCQOption[];
  explanation: string;
}

export interface WritingPrompt {
  prompt: string;
  sampleAnswer: string;
}

export interface RubricCriterion {
  criterion: string;
  excellent: string;
  satisfactory: string;
  needsWork: string;
}

export interface ActivityResponse {
  mcqs: MCQuestion[];
  writingPrompts: WritingPrompt[];
  rubric: RubricCriterion[];
}

export interface QuizSession {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  questions: MCQuestion[];
  createdAt: string;
}