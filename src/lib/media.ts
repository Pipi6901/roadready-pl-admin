import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import type { Media } from './types';

export function mediaCollection() {
  return collection(db, 'media');
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export async function uploadMedia(file: File, licence: Media['licence']) {
  const mediaId = crypto.randomUUID();
  const storagePath = `media/${mediaId}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const cdnUrl = await getDownloadURL(storageRef);
  const dimensions = await readImageDimensions(file);

  const media: Media = {
    type: file.type.startsWith('video/') ? 'video' : 'image',
    filename: file.name,
    storagePath,
    cdnUrl,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    durationMs: null,
    hazardWindow: null,
    usedByQuestions: [],
    licence,
    deletedAt: null,
  };

  await setDoc(doc(mediaCollection(), mediaId), media);
  return { id: mediaId, ...media };
}

export async function deleteMedia(mediaId: string, storagePath: string) {
  await deleteObject(ref(storage, storagePath));
  await deleteDoc(doc(mediaCollection(), mediaId));
}
