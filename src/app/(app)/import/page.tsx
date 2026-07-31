'use client';

import { doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';
import React from 'react';

import { topicsCollection, questionsCollection } from '@/lib/content';
import { db } from '@/lib/firebase';
import type { AnswerOption, QuestionType, Topic } from '@/lib/types';

/** Matches docs/03-content-pipeline.md §3. */
interface CsvRow {
  topic_slug?: string;
  question_id?: string;
  type?: string;
  question_en?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct?: string;
  explanation_en?: string;
  media_filename?: string;
  subtopic?: string;
  source_ref?: string;
}

interface ParsedQuestion {
  topicSlug: string;
  questionId: string;
  type: QuestionType;
  text: string;
  options: AnswerOption[];
  correctOptionId: string;
  explanation: string;
  subtopic: string | null;
  sourceRef: string;
}

const VALID_TYPES: QuestionType[] = ['single_choice', 'case_study', 'hazard_video'];
const REQUIRED = ['topic_slug', 'question_id', 'type', 'question_en', 'option_a', 'option_b', 'correct', 'explanation_en', 'source_ref'] as const;

function validateRows(rows: CsvRow[]): { questions: ParsedQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, i) => {
    const line = i + 2; // header is line 1
    for (const field of REQUIRED) {
      if (!row[field]?.trim()) errors.push(`Line ${line}: missing "${field}".`);
    }
    if (errors.some((e) => e.startsWith(`Line ${line}:`))) return;

    const type = row.type!.trim() as QuestionType;
    if (!VALID_TYPES.includes(type)) {
      errors.push(`Line ${line}: type "${row.type}" must be one of ${VALID_TYPES.join(', ')}.`);
      return;
    }

    const options: AnswerOption[] = [
      { id: 'A', text: row.option_a!.trim() },
      { id: 'B', text: row.option_b!.trim() },
    ];
    if (row.option_c?.trim()) options.push({ id: 'C', text: row.option_c.trim() });
    if (row.option_d?.trim()) options.push({ id: 'D', text: row.option_d.trim() });

    const correctLetter = row.correct!.trim().toUpperCase();
    if (!options.some((o) => o.id === correctLetter)) {
      errors.push(`Line ${line}: correct "${row.correct}" does not match any option (${options.map((o) => o.id).join('/')}).`);
      return;
    }

    const questionId = row.question_id!.trim();
    if (seenIds.has(questionId)) {
      errors.push(`Line ${line}: question_id "${questionId}" is duplicated within this file.`);
      return;
    }
    seenIds.add(questionId);

    questions.push({
      topicSlug: row.topic_slug!.trim(),
      questionId,
      type,
      text: row.question_en!.trim(),
      options,
      correctOptionId: correctLetter,
      explanation: row.explanation_en!.trim(),
      subtopic: row.subtopic?.trim() || null,
      sourceRef: row.source_ref!.trim(),
    });
  });

  return { questions, errors };
}

export default function ImportPage() {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);

  const onFile = async (file: File) => {
    setErrors([]);
    setResult(null);

    const text = await file.text();
    const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`));
      return;
    }

    const { questions, errors: validationErrors } = validateRows(parsed.data);
    if (validationErrors.length > 0) {
      // No partial import (docs/03-content-pipeline.md §3): report and write nothing.
      setErrors(validationErrors);
      return;
    }

    setImporting(true);
    try {
      // Resolve topic_slug -> topicId, creating any topic that doesn't exist yet.
      const existingTopics = await getDocs(topicsCollection());
      const slugToId = new Map<string, string>();
      existingTopics.docs.forEach((d) => slugToId.set((d.data() as Topic).slug, d.id));

      const newSlugs = [...new Set(questions.map((q) => q.topicSlug))].filter((s) => !slugToId.has(s));
      let nextSortOrder = existingTopics.size;
      for (const slug of newSlugs) {
        const ref = doc(topicsCollection());
        await setDoc(ref, {
          name: slug,
          slug,
          icon: 'book-open',
          sortOrder: nextSortOrder++,
          color: null,
          deletedAt: null,
        });
        slugToId.set(slug, ref.id);
      }

      // Upsert questions, batched (question_id is the doc ID — re-import
      // updates in place, per §3).
      let batch = writeBatch(db);
      let ops = 0;
      let created = 0;
      const byTopic = new Map<string, number>();

      for (const q of questions) {
        const topicId = slugToId.get(q.topicSlug)!;
        const sortOrder = byTopic.get(topicId) ?? 0;
        byTopic.set(topicId, sortOrder + 1);

        batch.set(
          doc(questionsCollection(topicId), q.questionId),
          {
            type: q.type,
            text: q.text,
            options: q.options,
            correctOptionId: q.correctOptionId,
            explanation: q.explanation,
            mediaId: null,
            subtopic: q.subtopic,
            sourceRef: q.sourceRef,
            sortOrder,
            deletedAt: null,
          },
          { merge: true },
        );
        created += 1;
        ops += 1;
        if (ops >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();

      setResult(`Imported ${created} questions across ${slugToId.size} topics (${newSlugs.length} new) into the draft test-set.`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">CSV import</h1>
      <p className="text-sm text-black/60">
        Columns: topic_slug, question_id, type, question_en, option_a, option_b, option_c, option_d, correct,
        explanation_en, media_filename, subtopic, source_ref. All rows must pass validation — nothing is written
        if any row fails.
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = '';
        }}
        disabled={importing}
      />

      {importing ? <p className="text-sm text-black/50">Importing…</p> : null}

      {errors.length > 0 ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-medium">Import rejected — fix these and re-upload:</div>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result ? <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">{result}</p> : null}
    </div>
  );
}
