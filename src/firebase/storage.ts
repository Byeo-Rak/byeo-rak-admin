import {
  ref,
  listAll,
  getDownloadURL,
  getBlob,
  uploadBytes,
  deleteObject,
} from 'firebase/storage';
import { storage } from './config';

// ── 문제 슬롯 이미지 URL 목록 조회 ────────────────────────────────────────────
export async function getQuestionImages(
  certId: string,
  companyId: string,
  docId: string,
  questionNo: string
): Promise<Record<string, string[]>> {
  try {
    const folderRef = ref(
      storage,
      `certifications/${certId}/${companyId}/${docId}/${questionNo}`
    );
    const result = await listAll(folderRef);

    // 파일명 기준 중복 제거 (동일 이름 파일이 여러 번 등록된 경우 방지)
    const seen = new Set<string>();
    const uniqueItems = result.items.filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });

    const entries: { slot: string; idx: number; url: string }[] = [];
    await Promise.all(
      uniqueItems.map(async (item) => {
        const match = item.name.match(/^(\w+)-(\d+)\./);
        if (match) {
          const url = await getDownloadURL(item);
          entries.push({ slot: match[1], idx: parseInt(match[2]), url });
        }
      })
    );

    const urlMap: Record<string, string[]> = {};
    entries
      .sort((a, b) => a.idx - b.idx)
      .forEach(({ slot, url }) => {
        if (!urlMap[slot]) urlMap[slot] = [];
        // URL 기준으로도 중복 제거 (혹시 다른 이름이지만 같은 파일인 경우)
        if (!urlMap[slot].includes(url)) {
          urlMap[slot].push(url);
        }
      });

    return urlMap;
  } catch {
    return {};
  }
}

// ── Unknown 이미지 목록 조회 ──────────────────────────────────────────────────
export interface UnknownImage {
  name: string;
  path: string;
  url: string;
}

export async function listUnknownImages(): Promise<UnknownImage[]> {
  try {
    const folderRef = ref(storage, 'certifications/unknown');
    const result = await listAll(folderRef);
    return Promise.all(
      result.items.map(async (item) => ({
        name: item.name,
        path: item.fullPath,
        url: await getDownloadURL(item),
      }))
    );
  } catch {
    return [];
  }
}

// ── Unknown 이미지 → 문제 슬롯으로 이동 및 배정 ───────────────────────────────
export async function assignUnknownImage(params: {
  unknownPath: string;
  certId: string;
  companyId: string;
  docId: string;
  questionNo: string;
  slot: string;
  existingCount: number;
}): Promise<string> {
  const { unknownPath, certId, companyId, docId, questionNo, slot, existingCount } =
    params;
  const ext = unknownPath.split('.').pop() ?? 'jpg';
  const idx = existingCount + 1;

  const srcRef = ref(storage, unknownPath);
  const destPath = `certifications/${certId}/${companyId}/${docId}/${questionNo}/${slot}-${idx}.${ext}`;
  const destRef = ref(storage, destPath);

  const blob = await getBlob(srcRef);
  await uploadBytes(destRef, blob);
  await deleteObject(srcRef);

  return getDownloadURL(destRef);
}
