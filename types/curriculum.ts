export type BloomsLevel =
  | "Remember"
  | "Understand"
  | "Apply"
  | "Analyse"
  | "Evaluate"
  | "Create";

export type DifficultyLevel = "struggling" | "average" | "advanced";

export interface CurriculumGrade {
  code: string;
  name: string;
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
  bloomsLevel: BloomsLevel;
  grade: string;
  exemplars: IndicatorExemplar[];
}

export interface IndicatorExemplar {
  code: string;
  text: string;
  sortOrder: number;
  revision: string;
  sourceReference?: string | null;
}

export interface SavedLesson {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  difficultyLevel: string;
  createdAt: Date;
}

export interface CurriculumSubStrand {
  name: string;
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
  bloomsLevel: BloomsLevel;
  duration: "40" | "60" | "80";
  classSize: "25" | "35" | "45" | "60";
  difficultyLevel: DifficultyLevel;
}

export interface Citation {
  id: string;
  text: string;
  source: string;
  type: "foundry" | "curriculum";
}

export interface GenerateResponse {
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