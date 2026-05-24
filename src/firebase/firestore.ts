import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Certification, QuestionSet, AuditLog } from '../types';

// ── 어드민 권한 확인 ───────────────────────────────────────────────────────────
export async function checkIsAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists();
}

// ── 자격증 목록 조회 ──────────────────────────────────────────────────────────
export async function fetchCertifications(): Promise<Certification[]> {
  const snap = await getDocs(collection(db, 'certifications'));
  return snap.docs.map((d) => d.data() as Certification);
}

// ── 문제 세트 목록 조회 ────────────────────────────────────────────────────────
export async function fetchQuestionSets(
  certificationId: string
): Promise<QuestionSet[]> {
  const snap = await getDocs(
    collection(db, 'certifications', certificationId, 'CBT')
  );
  return snap.docs.map((d) => d.data() as QuestionSet);
}

// ── 문제 세트 단건 조회 ────────────────────────────────────────────────────────
export async function fetchQuestionSet(
  certificationId: string,
  docId: string
): Promise<QuestionSet | null> {
  const ref = doc(db, 'certifications', certificationId, 'CBT', docId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as QuestionSet) : null;
}

// ── 문제 1개 업데이트 ──────────────────────────────────────────────────────────
export async function updateQuestion(
  certificationId: string,
  docId: string,
  questionNo: string,
  patch: Partial<QuestionSet['questions'][string]>
): Promise<void> {
  const ref = doc(db, 'certifications', certificationId, 'CBT', docId);
  await setDoc(
    ref,
    {
      questions: {
        [questionNo]: {
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// ── Audit Log 기록 ─────────────────────────────────────────────────────────────
export async function writeAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  await addDoc(collection(db, 'auditLogs'), {
    ...log,
    timestamp: Timestamp.now(),
  });
}

// ── Audit Log 조회 ─────────────────────────────────────────────────────────────
export async function fetchAuditLogs(limitCount = 100): Promise<AuditLog[]> {
  const q = query(
    collection(db, 'auditLogs'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp:
        data.timestamp instanceof Timestamp
          ? data.timestamp.toDate().toISOString()
          : data.timestamp,
    } as AuditLog;
  });
}
