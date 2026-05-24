export interface SlotPayload {
  text: string;
  Image: number;
}

export interface Question {
  number: number;
  question: SlotPayload;
  option1: SlotPayload;
  option2: SlotPayload;
  option3: SlotPayload;
  option4: SlotPayload;
  answer: string;
  explanation: string;
  course: { id: string; name: string };
  updatedAt: string;
}

export interface QuestionSet {
  docId: string;
  displayId: string;
  certificationId: string;
  certificationName: string;
  companyId: string;
  roundId: string;
  year: number;
  round: number;
  examDate: string;
  sourceStem: string;
  course: { id: string; name: string };
  questionCount: number;
  questions: Record<string, Question>;
  updatedAt: string;
}

export interface CompanyInfo {
  companyName: string;
  rounds: string[];
  questionSets: string[];
}

export interface Certification {
  certificationId: string;
  name: string;
  subjectList: string[];
  subjectNameMap: Record<string, string>;
  companyList: Record<string, CompanyInfo>;
  updatedAt: string;
}

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: string;
  certificationId: string;
  docId: string;
  questionNo: string;
  field: string;
  before: unknown;
  after: unknown;
  timestamp: string;
}
