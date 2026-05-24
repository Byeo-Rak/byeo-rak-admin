import type { Question } from '../types';

export function hasExplanationError(q: Question): boolean {
  const exp = q.explanation?.trim() ?? '';
  return exp === '' || exp.includes('ai 해설 오류');
}

export function countExplanationErrors(questions: Record<string, Question>): number {
  return Object.values(questions).filter(hasExplanationError).length;
}

export function padQuestionNo(n: number): string {
  return String(n).padStart(3, '0');
}
