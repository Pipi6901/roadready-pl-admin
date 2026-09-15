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

/**
 * Polish exam class. Basic sections are answered TAK/NIE, specialist ones
 * A/B/C, and the paper takes a fixed number of each — so the class has to be
 * on the topic, where the app reads it from.
 */
export type QuestionCategory = 'basic' | 'specialist';

export interface Topic {
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  color: string | null;
  category?: QuestionCategory;
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
  /**
   * 1, 2 or 3. The Polish paper is scored in points, not answers (74 in
   * total, 68 to pass), and it draws a fixed number of each weight — a
   * question without a weight cannot be placed on a paper at all. The mobile
   * app treats a missing value as 1.
   */
  points?: number;
  /** Normally inherited from the topic; stored so a question can be read alone. */
  category?: QuestionCategory;
  /**
   * Licence categories the question is asked for — the ministry's codes (AM,
   * A1, A2, A, B1, B, C1, C, D1, D, T, PT), as listed per question in the
   * official catalogue. Empty or missing means every category. The app
   * filters its whole bank by the learner's chosen licence.
   */
  licences?: string[];
  /**
   * File name of the picture or clip the official catalogue attaches to this
   * question (e.g. "1a15_00001.jpg"). Read-only here: it is what the media
   * import matches against when the ministry's archive is uploaded.
   */
  sourceMedia?: string | null;
  sortOrder: number;
  deletedAt: string | null;
}

/** All licence codes in the order the catalogue and the app list them. */
export const LICENCE_CODES = ['AM', 'A1', 'A2', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D', 'T', 'PT'] as const;

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
