import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCertifications } from '../firebase/firestore';
import type { Certification } from '../types';

const CERT_ICONS: Record<string, string> = {
  InfoProcessEngineer: '💻',
  ComputSkillsLV1: '📊',
  ComputSkillsLV2: '📈',
  IndustrySafetyEnginner: '🦺',
};

export default function DashboardPage() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertifications()
      .then(setCerts)
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
        <h1 className="text-2xl font-bold text-gray-900">자격증 목록</h1>
        <p className="text-gray-500 mt-1 text-sm">수정할 자격증을 선택하세요.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {certs.map((cert) => {
          const totalSets = Object.values(cert.companyList ?? {}).reduce(
            (acc, c) => acc + (c.questionSets?.length ?? 0),
            0
          );
          return (
            <Link
              key={cert.certificationId}
              to={`/certifications/${cert.certificationId}`}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-brand-400 transition group"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">
                  {CERT_ICONS[cert.certificationId] ?? '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 group-hover:text-brand-700 transition truncate">
                    {cert.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cert.certificationId}
                  </p>
                  <div className="flex gap-3 mt-3 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                      과목 {cert.subjectList?.length ?? 0}개
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                      문제 세트 {totalSets}개
                    </span>
                  </div>
                </div>
                <span className="text-gray-300 group-hover:text-brand-400 text-xl transition">
                  →
                </span>
              </div>
            </Link>
          );
        })}

        {certs.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-16">
            등록된 자격증이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
