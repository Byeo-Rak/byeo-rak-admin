import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchQuestionSets } from '../firebase/firestore';
import { countExplanationErrors } from '../utils/questionUtils';
import type { QuestionSet } from '../types';

interface EnrichedSet extends QuestionSet {
  _expErrors: number;
  _countError: boolean;
  _hasError: boolean;
}

function enrich(s: QuestionSet): EnrichedSet {
  const expErrors = countExplanationErrors(s.questions ?? {});
  const countError = s.questionCount !== 20;
  return { ...s, _expErrors: expErrors, _countError: countError, _hasError: expErrors > 0 || countError };
}

export default function CertificationPage() {
  const { certificationId } = useParams<{ certificationId: string }>();
  const [sets, setSets] = useState<EnrichedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);

  useEffect(() => {
    if (!certificationId) return;
    fetchQuestionSets(certificationId)
      .then((data) => {
        const enriched = data.map(enrich);
        // 오류 있는 세트 먼저, 그 다음 연도 내림차순/회차 오름차순
        enriched.sort((a, b) => {
          if (a._hasError !== b._hasError) return a._hasError ? -1 : 1;
          const errA = a._expErrors + (a._countError ? 100 : 0);
          const errB = b._expErrors + (b._countError ? 100 : 0);
          if (errA !== errB) return errB - errA;
          return b.year - a.year || a.round - b.round;
        });
        setSets(enriched);
      })
      .finally(() => setLoading(false));
  }, [certificationId]);

  const filtered = useMemo(() => {
    return sets.filter((s) => {
      if (onlyErrors && !s._hasError) return false;
      return (
        s.docId.toLowerCase().includes(filter.toLowerCase()) ||
        s.course.name.includes(filter)
      );
    });
  }, [sets, filter, onlyErrors]);

  const totalErrors = sets.filter((s) => s._hasError).length;
  const totalExpErrors = sets.reduce((acc, s) => acc + s._expErrors, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-brand-600 transition text-sm">
          ← 자격증 목록
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{certificationId}</h1>
      </div>

      {/* 오류 요약 배너 */}
      {totalErrors > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <span className="text-red-500 text-lg">⚠</span>
          <div className="flex-1 text-sm text-red-700">
            <span className="font-semibold">오류 발견:</span>{' '}
            문제 수 오류 {sets.filter((s) => s._countError).length}건 ·{' '}
            해설 오류 {totalExpErrors}개 (세트 {sets.filter((s) => s._expErrors > 0).length}건)
          </div>
          <button
            onClick={() => setOnlyErrors((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
              onlyErrors
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-red-300 text-red-600 hover:bg-red-100'
            }`}
          >
            {onlyErrors ? '전체 보기' : '오류만 보기'}
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="과목명 또는 문서 ID로 검색..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-xs text-gray-400 ml-auto">{filtered.length}건</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="text-left px-5 py-3 font-semibold">문서 ID</th>
              <th className="text-left px-5 py-3 font-semibold">과목</th>
              <th className="text-left px-5 py-3 font-semibold">연도</th>
              <th className="text-left px-5 py-3 font-semibold">회차</th>
              <th className="text-left px-5 py-3 font-semibold">문제 수</th>
              <th className="text-left px-5 py-3 font-semibold">해설 오류</th>
              <th className="text-left px-5 py-3 font-semibold">시험일</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr
                key={s.docId}
                className={`border-b transition ${
                  s._hasError
                    ? 'bg-red-50 border-red-100 hover:bg-red-100'
                    : idx % 2 === 0
                    ? 'border-gray-100 hover:bg-brand-50'
                    : 'bg-gray-50/50 border-gray-100 hover:bg-brand-50'
                }`}
              >
                <td className="px-5 py-3 font-mono text-xs text-gray-600">
                  {s.docId}
                </td>
                <td className="px-5 py-3 text-gray-800">{s.course.name}</td>
                <td className="px-5 py-3 text-gray-700">{s.year}</td>
                <td className="px-5 py-3 text-gray-700">{s.round}회</td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s._countError
                        ? 'bg-red-100 text-red-600'
                        : 'bg-brand-100 text-brand-700'
                    }`}
                  >
                    {s.questionCount}문제{s._countError && ' ⚠'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {s._expErrors > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                      {s._expErrors}개 ⚠
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">없음</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {s.examDate
                    ? `${s.examDate.slice(0, 4)}-${s.examDate.slice(4, 6)}-${s.examDate.slice(6, 8)}`
                    : '-'}
                </td>
                <td className="px-5 py-3">
                  <Link
                    to={`/certifications/${certificationId}/sets/${s.docId}`}
                    className="text-brand-600 hover:text-brand-800 font-medium text-xs"
                  >
                    편집 →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-12">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
