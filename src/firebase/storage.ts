import {
  ref,
  listAll,
  getDownloadURL,
  getBlob,
  uploadBytes,
  deleteObject,
} from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, storage } from './config';

async function ensureAuthReady(): Promise<void> {
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        reject(new Error('Not authenticated'));
        return;
      }
      await user.getIdToken(true);
      resolve();
    });
  });
}

export interface QuestionSlotImage {
  url: string;
  path: string;
  name: string;
}

// ── 문제 슬롯 이미지 URL 목록 조회 ────────────────────────────────────────────
export async function getQuestionImages(
  certId: string,
  companyId: string,
  docId: string,
  questionNo: string
): Promise<Record<string, QuestionSlotImage[]>> {
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

    const entries: { slot: string; idx: number; image: QuestionSlotImage }[] = [];
    await Promise.all(
      uniqueItems.map(async (item) => {
        const match = item.name.match(/^(\w+)-(\d+)\./);
        if (match) {
          const url = await getDownloadURL(item);
          entries.push({
            slot: match[1],
            idx: parseInt(match[2]),
            image: { url, path: item.fullPath, name: item.name },
          });
        }
      })
    );

    const urlMap: Record<string, QuestionSlotImage[]> = {};
    entries
      .sort((a, b) => a.idx - b.idx)
      .forEach(({ slot, image }) => {
        if (!urlMap[slot]) urlMap[slot] = [];
        if (!urlMap[slot].some((img) => img.url === image.url)) {
          urlMap[slot].push(image);
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
  await ensureAuthReady();
  const folderRef = ref(storage, 'certifications/unknown');
  const result = await listAll(folderRef);
  return Promise.all(
    result.items.map(async (item) => ({
      name: item.name,
      path: item.fullPath,
      url: await getDownloadURL(item),
    }))
  );
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
}): Promise<QuestionSlotImage> {
  await ensureAuthReady();
  const { unknownPath, certId, companyId, docId, questionNo, slot, existingCount } =
    params;
  const ext = unknownPath.split('.').pop() ?? 'jpg';
  const idx = existingCount + 1;
  const fileName = `${slot}-${idx}.${ext}`;

  const srcRef = ref(storage, unknownPath);
  const destPath = `certifications/${certId}/${companyId}/${docId}/${questionNo}/${fileName}`;
  const destRef = ref(storage, destPath);

  const blob = await getBlob(srcRef);
  await uploadBytes(destRef, blob);
  await deleteObject(srcRef);

  return {
    url: await getDownloadURL(destRef),
    path: destPath,
    name: fileName,
  };
}

// ── 문제 슬롯 이미지 → Unknown으로 이동 ─────────────────────────────────────
export async function moveQuestionImageToUnknown(params: {
  imagePath: string;
  certId: string;
  companyId: string;
  docId: string;
  questionNo: string;
  slot: string;
}): Promise<{ newCount: number; unknownPath: string }> {
  await ensureAuthReady();
  const { imagePath, certId, companyId, docId, questionNo, slot } = params;

  const fileName = imagePath.split('/').pop() ?? `image-${Date.now()}.jpg`;
  const unknownName = `${Date.now()}-${fileName}`;

  const srcRef = ref(storage, imagePath);
  const unknownPath = `certifications/unknown/${unknownName}`;
  const destRef = ref(storage, unknownPath);

  const blob = await getBlob(srcRef);
  await uploadBytes(destRef, blob);
  await deleteObject(srcRef);

  const folderRef = ref(
    storage,
    `certifications/${certId}/${companyId}/${docId}/${questionNo}`
  );
  const result = await listAll(folderRef);
  const slotPattern = new RegExp(`^${slot}-\\d+\\.`);
  const newCount = result.items.filter((item) => slotPattern.test(item.name)).length;

  return { newCount, unknownPath };
}
