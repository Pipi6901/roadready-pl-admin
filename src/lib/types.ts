/** Mirrors the Firestore schema in roadready's docs/02-architecture.md §2. */

export type Role = 'content_editor' | 'admin';

export interface AdminUser {
  email: string;
  role: Role;
  invitedAt: string;
}

export type CountryStatus = 'active' | 'coming_soon' | 'archived';

export interface Country {
  code: string;
  name: string;
  flagEmoji: string;
  authority: string;
  legalNotice: string;
  testTypes: string[];
  status: CountryStatus;
  questionCount: number;
  mockTest: { questionCount: number; timeLimitMinutes: number; passMark: number };
  currency: string;
  defaultLocale: string;
  sortOrder: number;
  deletedAt: string | null;
}

export type TestSetStatus = 'draft' | 'published' | 'archived';

export interface TestSet {
  version: string;
  status: TestSetStatus;
  effectiveFrom: string | null;
  archivedAt: string | null;
  versionHash: string | null;
  bundleUrl: string | null;
  bundleSize: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
  deletedAt: string | null;
}

export interface Topic {
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  color: string | null;
  deletedAt: string | null;
}

export type QuestionType = 'single_choice' | 'case_study' | 'hazard_video';

export interface AnswerOption {
  id: string;
  text: string;
}

export interface Question {
  type: QuestionType;
  text: string;
  options: AnswerOption[];
  correctOptionId: string;
  explanation: string;
  mediaId: string | null;
  subtopic: string | null;
  sourceRef: string;
  sortOrder: number;
  deletedAt: string | null;
}

export interface Locale {
  code: string;
  nameNative: string;
  nameEnglish: string;
  direction: 'ltr' | 'rtl';
  flagEmoji: string;
  status: 'active' | 'hidden';
  sortOrder: number;
}

export interface Media {
  type: 'image' | 'video';
  filename: string;
  storagePath: string;
  cdnUrl: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  hazardWindow: { startMs: number; endMs: number } | null;
  usedByQuestions: string[];
  licence: 'DVSA' | 'OGL-v3' | 'own';
  deletedAt: string | null;
}
