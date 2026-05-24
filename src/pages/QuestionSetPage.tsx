import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { fetchQuestionSet, updateQuestion, writeAuditLog } from '../firebase/firestore';
import type { Question, QuestionSet } from '../types';

const SLOT_LABELS: Record<string, string> = {
  question: '문제',
  option1: '①',
  option2: '②',
  option3: '③',
  option4: '④',
};

type EditableQuestion = Question & { _no: string };

function QuestionCard({
  q,
  certificationId,
  docId,
  userEmail,
  userId,
  onSaved,
}: {
  q: EditableQuestion;
  certificationId: string;
  docId: string;
  userEmail: string;
  userId: string;
  onSaved: (no: string, updated: Question) => void;
}) {
  const [draft, setDraft] = useState<Question>({ ...q });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(q);

  const handleSlotText = (
    slot: 'question' | 'option1' | 'option2' | 'option3' | 'option4',
    value: string
  ) => {
    setDraft((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], text: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: Partial<Question> = {
        question: draft.question,
        option1: draft.option1,
        option2: draft.option2,
        option3: draft.option3,
        option4: draft.option4,
        answer: draft.answer,
        explanation: draft.explanation,
      };

      await updateQuestion(certificationId, docId, q._no, patch);

      const changedFields: string[] = [];
      const slots = ['question', 'option1', 'option2', 'option3', 'option4'] as const;
      for (const slot of slots) {
        if (draft[slot].text !== q[slot].text) changedFields.push(slot);
      }
      if (draft.answer !== q.answer) changedFields.push('answer');
      if (draft.explanation !== q.explanation) changedFields.push('explanation');

      for (const field of changedFields) {
        await writeAuditLog({
          userId,
          userEmail,
          action: 'UPDATE_QUESTION',
          certificationId,
          docId,
          questionNo: q._no,
          field,
          before:
            field === 'answer' || field === 'explanation'
              ? (q as Record<string, unknown>)[field]
              : (q as Record<string, unknown>)[field],
          after:
            field === 'answer' || field === 'explanation'
              ? (draft as Record<string, unknown>)[field]
              : (draft as Record<string, unknown>)[field],
          timestamp: new Date().toISOString(),
        });
      }

      toast.success(`${q._no}번 문제가 저장되었습니다.`);
      onSaved(q._no, { ...draft, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error(e);
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center bg-brand-100 text-brand-700 rounded-lg font-bold text-sm">
            {q.number}
          </span>
          <span className="text-gray-800 text-sm line-clamp-1 text-left max-w-xl">
            {q.question.text || '(내용 없음)'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              미저장
            </span>
          )}
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
          {(['question', 'option1', 'option2', 'option3', 'option4'] as const).map(
            (slot) => (
              <div key={slot}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {SLOT_LABELS[slot]}
                </label>
                <textarea
                  rows={slot === 'question' ? 3 : 2}
                  value={draft[slot].text}
                  onChange={(e) => handleSlotText(slot, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            )
          )}

          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                정답
              </label>
              <div className="flex gap-2">
                {['1', '2', '3', '4'].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, answer: n }))
                    }
                    className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition ${
                      draft.answer === n
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-300 text-gray-500 hover:border-brand-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              해설
            </label>
            <textarea
              rows={4}
              value={draft.explanation}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, explanation: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDraft({ ...q })}
              disabled={!isDirty || saving}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >
              되돌리기
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg font-semibold transition"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionSetPage() {
  const { certificationId, docId } = useParams<{
    certificationId: string;
    docId: string;
  }>();
  const { user } = useAuth();
  const [qSet, setQSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!certificationId || !docId) return;
    fetchQuestionSet(certificationId, docId)
      .then(setQSet)
      .finally(() => setLoading(false));
  }, [certificationId, docId]);

  const handleSaved = (no: string, updated: Question) => {
    setQSet((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: { ...prev.questions, [no]: updated },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!qSet) {
    return (
      <div className="p-8 text-gray-500">문제 세트를 찾을 수 없습니다.</div>
    );
  }

  const sortedKeys = Object.keys(qSet.questions).sort();
  const filteredKeys = sortedKeys.filter((no) => {
    const q = qSet.questions[no];
    if (!filter) return true;
    return (
      q.question.text.includes(filter) ||
      no.includes(filter) ||
      String(q.number).includes(filter)
    );
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <Link to="/" className="hover:text-brand-600 transition">
          자격증 목록
        </Link>
        <span>/</span>
        <Link
          to={`/certifications/${certificationId}`}
          className="hover:text-brand-600 transition"
        >
          {certificationId}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{docId}</span>
      </div>

      <div className="flex items-start justify-between mb-6 mt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{docId}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {qSet.course.name} · {qSet.year}년 {qSet.round}회차 ·{' '}
            {sortedKeys.length}문제
          </p>
        </div>
        <input
          type="text"
          placeholder="문제 검색..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="space-y-3">
        {filteredKeys.map((no) => (
          <QuestionCard
            key={no}
            q={{ ...qSet.questions[no], _no: no }}
            certificationId={certificationId!}
            docId={docId!}
            userId={user?.uid ?? ''}
            userEmail={user?.email ?? ''}
            onSaved={handleSaved}
          />
        ))}
        {filteredKeys.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
