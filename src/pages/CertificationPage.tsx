import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchQuestionSets } from '../firebase/firestore';
import type { QuestionSet } from '../types';

export default function CertificationPage() {
  const { certificationId } = useParams<{ certificationId: string }>();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!certificationId) return;
    fetchQuestionSets(certificationId)
      .then((data) =>
        setSets(data.sort((a, b) => b.year - a.year || a.round - b.round))
      )
      .finally(() => setLoading(false));
  }, [certificationId]);

  const filtered = sets.filter(
    (s) =>
      s.docId.toLowerCase().includes(filter.toLowerCase()) ||
      s.course.name.includes(filter)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="text-gray-400 hover:text-brand-600 transition text-sm"
        >
          ← 자격증 목록
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{certificationId}</h1>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="과목명 또는 문서 ID로 검색..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
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
              <th className="text-left px-5 py-3 font-semibold">시험일</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr
                key={s.docId}
                className={`border-b transition ${
                  s.questionCount !== 20
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
                      s.questionCount !== 20
                        ? 'bg-red-100 text-red-600'
                        : 'bg-brand-100 text-brand-700'
                    }`}
                  >
                    {s.questionCount}문제{s.questionCount !== 20 && ' ⚠'}
                  </span>
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
                <td
                  colSpan={7}
                  className="text-center text-gray-400 py-12"
                >
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
