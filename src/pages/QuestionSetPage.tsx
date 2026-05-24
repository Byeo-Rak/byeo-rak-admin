import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { fetchQuestionSet, updateQuestion, writeAuditLog } from '../firebase/firestore';
import {
  getQuestionImages,
  listUnknownImages,
  assignUnknownImage,
  type UnknownImage,
} from '../firebase/storage';
import type { Question, QuestionSet } from '../types';

// ── 상수 ────────────────────────────────────────────────────────────────────
const SLOT_LABELS: Record<string, string> = {
  question: '문제',
  option1: '①',
  option2: '②',
  option3: '③',
  option4: '④',
};
const SLOTS = ['question', 'option1', 'option2', 'option3', 'option4'] as const;
type Slot = (typeof SLOTS)[number];

// ── 오류 판정 ────────────────────────────────────────────────────────────────
function hasExplanationError(q: Question): boolean {
  const exp = q.explanation?.trim() ?? '';
  return exp === '' || exp.includes('ai 해설 오류');
}

// ── Unknown 이미지 모달 ────────────────────────────────────────────────────────
function UnknownImageModal({
  questionNo,
  question,
  certificationId,
  companyId,
  docId,
  onAssigned,
  onClose,
}: {
  questionNo: string;
  question: Question;
  certificationId: string;
  companyId: string;
  docId: string;
  onAssigned: (slot: Slot, url: string, newCount: number) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<UnknownImage[]>([]);
  const [selected, setSelected] = useState<UnknownImage | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot>('question');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUnknownImages()
      .then(setImages)
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      const existingCount = question[targetSlot].Image;
      const url = await assignUnknownImage({
        unknownPath: selected.path,
        certId: certificationId,
        companyId,
        docId,
        questionNo,
        slot: targetSlot,
        existingCount,
      });
      onAssigned(targetSlot, url, existingCount + 1);
      setImages((prev) => prev.filter((img) => img.path !== selected.path));
      setSelected(null);
      toast.success('이미지가 배정되었습니다.');
    } catch (e) {
      console.error(e);
      toast.error('이미지 배정에 실패했습니다.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Unknown 이미지 배정</h2>
            <p className="text-xs text-gray-400 mt-0.5">문제 {questionNo} · 이미지 선택 후 슬롯 지정</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Unknown 이미지가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <button
                  key={img.path}
                  onClick={() => setSelected(img)}
                  className={`border-2 rounded-xl overflow-hidden text-left transition ${
                    selected?.path === img.path
                      ? 'border-brand-500 ring-2 ring-brand-200'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-36 object-contain bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 px-2 py-1.5 truncate">{img.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              선택됨: <span className="font-normal text-gray-500">{selected.name}</span>
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                {SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTargetSlot(slot)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      targetSlot === slot
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-brand-400'
                    }`}
                  >
                    {SLOT_LABELS[slot]}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="ml-auto px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
              >
                {assigning ? '배정 중...' : '배정하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 슬롯 에디터 (텍스트 + 이미지) ────────────────────────────────────────────
function SlotEditor({
  slot,
  text,
  imageUrls,
  onChange,
}: {
  slot: Slot;
  text: string;
  imageUrls: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {SLOT_LABELS[slot]}
      </label>
      <textarea
        rows={slot === 'question' ? 3 : 2}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
      />
      {imageUrls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${slot} 이미지 ${i + 1}`}
              className="max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 문제 카드 ─────────────────────────────────────────────────────────────────
type EditableQuestion = Question & { _no: string };

function QuestionCard({
  q,
  certificationId,
  companyId,
  docId,
  userId,
  userEmail,
  onSaved,
}: {
  q: EditableQuestion;
  certificationId: string;
  companyId: string;
  docId: string;
  userId: string;
  userEmail: string;
  onSaved: (no: string, updated: Question) => void;
}) {
  const [draft, setDraft] = useState<Question>({ ...q });
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [imagesLoading, setImagesLoading] = useState(false);
  const [showUnknownModal, setShowUnknownModal] = useState(false);

  const error = hasExplanationError(q);
  const isDirty =
    JSON.stringify({
      question: draft.question,
      option1: draft.option1,
      option2: draft.option2,
      option3: draft.option3,
      option4: draft.option4,
      answer: draft.answer,
      explanation: draft.explanation,
    }) !==
    JSON.stringify({
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      answer: q.answer,
      explanation: q.explanation,
    });

  // 이미지가 있는 슬롯이 있을 때 Storage에서 로드
  useEffect(() => {
    const hasImages = SLOTS.some((s) => q[s].Image > 0);
    if (!hasImages) return;
    setImagesLoading(true);
    getQuestionImages(certificationId, companyId, docId, q._no)
      .then(setImages)
      .finally(() => setImagesLoading(false));
  }, [certificationId, companyId, docId, q._no]);

  const handleSlotText = useCallback((slot: Slot, value: string) => {
    setDraft((prev) => ({ ...prev, [slot]: { ...prev[slot], text: value } }));
  }, []);

  const handleAssigned = (slot: Slot, url: string, newCount: number) => {
    setImages((prev) => ({ ...prev, [slot]: [...(prev[slot] ?? []), url] }));
    setDraft((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], Image: newCount },
    }));
    setShowUnknownModal(false);
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
      for (const slot of SLOTS) {
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
          before: (q as Record<string, unknown>)[field],
          after: (draft as Record<string, unknown>)[field],
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
    <>
      {showUnknownModal && (
        <UnknownImageModal
          questionNo={q._no}
          question={draft}
          certificationId={certificationId}
          companyId={companyId}
          docId={docId}
          onAssigned={handleAssigned}
          onClose={() => setShowUnknownModal(false)}
        />
      )}

      <div
        className={`bg-white rounded-xl border-2 overflow-hidden ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        {/* 카드 헤더 */}
        <div
          className={`flex items-center gap-3 px-5 py-3 border-b ${
            error ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
          }`}
        >
          <span
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shrink-0 ${
              error ? 'bg-red-500 text-white' : 'bg-brand-100 text-brand-700'
            }`}
          >
            {q.number}
          </span>
          <span className="text-xs text-gray-500">{q.course.name}</span>
          {error && (
            <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
              해설 오류
            </span>
          )}
          {isDirty && (
            <span className={`${error ? '' : 'ml-auto'} text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full`}>
              미저장
            </span>
          )}
          {imagesLoading && (
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin ml-auto" />
          )}
        </div>

        {/* 카드 본문 */}
        <div className="px-5 py-4 space-y-4">
          {SLOTS.map((slot) => (
            <SlotEditor
              key={slot}
              slot={slot}
              text={draft[slot].text}
              imageUrls={images[slot] ?? []}
              onChange={(v) => handleSlotText(slot, v)}
            />
          ))}

          {/* 정답 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">정답</label>
            <div className="flex gap-2">
              {['1', '2', '3', '4'].map((n) => (
                <button
                  key={n}
                  onClick={() => setDraft((prev) => ({ ...prev, answer: n }))}
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

          {/* 해설 */}
          <div>
            <label
              className={`block text-xs font-semibold mb-1 ${
                error ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              해설 {error && '⚠ 오류'}
            </label>
            <textarea
              rows={4}
              value={draft.explanation}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, explanation: e.target.value }))
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${
                error
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-brand-500'
              }`}
            />
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setShowUnknownModal(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 border border-gray-300 hover:border-brand-400 px-3 py-1.5 rounded-lg transition"
            >
              <span>🖼</span> Unknown 이미지 추가
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setDraft({ ...q })}
                disabled={!isDirty || saving}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                되돌리기
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="px-5 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg font-semibold transition"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function QuestionSetPage() {
  const { certificationId, docId } = useParams<{
    certificationId: string;
    docId: string;
  }>();
  const { user } = useAuth();
  const [qSet, setQSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);

  useEffect(() => {
    if (!certificationId || !docId) return;
    fetchQuestionSet(certificationId, docId)
      .then(setQSet)
      .finally(() => setLoading(false));
  }, [certificationId, docId]);

  const handleSaved = (no: string, updated: Question) => {
    setQSet((prev) => {
      if (!prev) return prev;
      return { ...prev, questions: { ...prev.questions, [no]: updated } };
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
    return <div className="p-8 text-gray-500">문제 세트를 찾을 수 없습니다.</div>;
  }

  const sortedKeys = Object.keys(qSet.questions).sort();
  const errorKeys = sortedKeys.filter((no) => hasExplanationError(qSet.questions[no]));

  const filteredKeys = sortedKeys.filter((no) => {
    const q = qSet.questions[no];
    if (onlyErrors && !hasExplanationError(q)) return false;
    if (!filter) return true;
    return (
      q.question.text.includes(filter) ||
      no.includes(filter) ||
      String(q.number).includes(filter)
    );
  });

  const companyId = qSet.companyId ?? 'CBT';

  return (
    <div className="p-8 max-w-4xl">
      {/* 브레드크럼 */}
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <Link to="/" className="hover:text-brand-600 transition">자격증 목록</Link>
        <span>/</span>
        <Link to={`/certifications/${certificationId}`} className="hover:text-brand-600 transition">
          {certificationId}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{docId}</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5 mt-2 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{docId}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {qSet.course.name} · {qSet.year}년 {qSet.round}회차 · {sortedKeys.length}문제
            {errorKeys.length > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                ⚠ 해설 오류 {errorKeys.length}개
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setOnlyErrors((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
              onlyErrors
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-red-400'
            }`}
          >
            오류만 보기 {errorKeys.length > 0 && `(${errorKeys.length})`}
          </button>
          <input
            type="text"
            placeholder="문제 검색..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* 문제 목록 */}
      <div className="space-y-5">
        {filteredKeys.map((no) => (
          <QuestionCard
            key={no}
            q={{ ...qSet.questions[no], _no: no }}
            certificationId={certificationId!}
            companyId={companyId}
            docId={docId!}
            userId={user?.uid ?? ''}
            userEmail={user?.email ?? ''}
            onSaved={handleSaved}
          />
        ))}
        {filteredKeys.length === 0 && (
          <p className="text-center text-gray-400 py-12">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
