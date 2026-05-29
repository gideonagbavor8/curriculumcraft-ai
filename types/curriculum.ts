export type BloomsLevel =
  | "Remember"
  | "Understand"
  | "Apply"
  | "Analyse"
  | "Evaluate"
  | "Create";

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
}

export interface SavedLesson {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  createdAt: Date;
}

// Nested shape returned by /api/curriculum
export interface CurriculumSubStrand {
  name: string;
  indicators: Pick<Indicator, "code" | "text" | "bloomsLevel">[];
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

// Lesson generation
export interface GenerateRequest {
  indicatorCode: string;
  indicatorText: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  bloomsLevel: BloomsLevel;
  duration: "40" | "60" | "80";
  classSize: "25" | "35" | "45" | "60";
}

export interface GenerateResponse {
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
}

// Activity generation
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