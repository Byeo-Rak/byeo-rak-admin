import { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../firebase/firestore';
import type { AuditLog } from '../types';

const FIELD_LABELS: Record<string, string> = {
  question: '문제',
  option1: '선택지①',
  option2: '선택지②',
  option3: '선택지③',
  option4: '선택지④',
  answer: '정답',
  explanation: '해설',
};

function formatTs(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
}

function truncate(v: unknown, max = 40): string {
  const str =
    typeof v === 'object' && v !== null
      ? (v as Record<string, unknown>).text
        ? String((v as Record<string, unknown>).text)
        : JSON.stringify(v)
      : String(v ?? '');
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs(200)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">수정 이력</h1>
        <p className="text-sm text-gray-500 mt-1">
          최근 200건 표시 · 최신순 정렬
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="text-left px-4 py-3 font-semibold">일시</th>
              <th className="text-left px-4 py-3 font-semibold">수정자</th>
              <th className="text-left px-4 py-3 font-semibold">자격증</th>
              <th className="text-left px-4 py-3 font-semibold">문서</th>
              <th className="text-left px-4 py-3 font-semibold">문제번호</th>
              <th className="text-left px-4 py-3 font-semibold">필드</th>
              <th className="text-left px-4 py-3 font-semibold">이전값</th>
              <th className="text-left px-4 py-3 font-semibold">변경값</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr
                key={log.id ?? idx}
                className={`border-b border-gray-100 hover:bg-brand-50 transition ${
                  idx % 2 === 0 ? '' : 'bg-gray-50/40'
                }`}
              >
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {formatTs(log.timestamp)}
                </td>
                <td className="px-4 py-2.5 text-gray-700 max-w-[140px] truncate text-xs">
                  {log.userEmail}
                </td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">
                  {log.certificationId}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                  {log.docId}
                </td>
                <td className="px-4 py-2.5 text-center text-gray-700">
                  {log.questionNo}
                </td>
                <td className="px-4 py-2.5">
                  <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs">
                    {FIELD_LABELS[log.field] ?? log.field}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[160px]">
                  <span title={truncate(log.before, 200)}>
                    {truncate(log.before)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-800 text-xs max-w-[160px]">
                  <span title={truncate(log.after, 200)}>
                    {truncate(log.after)}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-12">
                  수정 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
