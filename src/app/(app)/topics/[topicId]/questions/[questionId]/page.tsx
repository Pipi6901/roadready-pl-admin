'use client';

import { addDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React from 'react';

import { questionsCollection } from '@/lib/content';
import type { AnswerOption, Question, QuestionType } from '@/lib/types';

const EMPTY_OPTIONS: AnswerOption[] = [
  { id: 'A', text: '' },
  { id: 'B', text: '' },
];

export default function QuestionEditPage() {
  const router = useRouter();
  const { topicId, questionId } = useParams<{ topicId: string; questionId: string }>();
  const isNew = questionId === 'new';

  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [type, setType] = React.useState<QuestionType>('single_choice');
  const [text, setText] = React.useState('');
  const [options, setOptions] = React.useState<AnswerOption[]>(EMPTY_OPTIONS);
  const [correctOptionId, setCorrectOptionId] = React.useState('A');
  const [explanation, setExplanation] = React.useState('');
  const [subtopic, setSubtopic] = React.useState('');
  const [sourceRef, setSourceRef] = React.useState('');

  React.useEffect(() => {
    if (isNew) return;
    void (async () => {
      const snap = await getDoc(doc(questionsCollection(topicId), questionId));
      if (snap.exists()) {
        const q = snap.data() as Question;
        setType(q.type);
        setText(q.text);
        setOptions(q.options);
        setCorrectOptionId(q.correctOptionId);
        setExplanation(q.explanation);
        setSubtopic(q.subtopic ?? '');
        setSourceRef(q.sourceRef);
      }
      setLoading(false);
    })();
  }, [isNew, topicId, questionId]);

  const updateOption = (id: string, value: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text: value } : o)));
  };

  const addOption = () => {
    const nextId = String.fromCharCode(65 + options.length); // A, B, C, D…
    setOptions((prev) => [...prev, { id: nextId, text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
    if (correctOptionId === id) setCorrectOptionId(options[0].id === id ? options[1].id : options[0].id);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type,
        text: text.trim(),
        options,
        correctOptionId,
        explanation: explanation.trim(),
        mediaId: null,
        subtopic: subtopic.trim() || null,
        sourceRef: sourceRef.trim(),
        deletedAt: null,
      };

      if (isNew) {
        const existing = await getDocs(questionsCollection(topicId));
        await addDoc(questionsCollection(topicId), { ...payload, sortOrder: existing.size });
      } else {
        await updateDoc(doc(questionsCollection(topicId), questionId), payload);
      }
      router.push(`/topics/${topicId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-black/50">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/topics/${topicId}`} className="text-sm text-black/50 hover:underline">
        ← Back
      </Link>
      <h1 className="text-xl font-semibold">{isNew ? 'New question' : 'Edit question'}</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2"
          >
            <option value="single_choice">single_choice</option>
            <option value="case_study">case_study</option>
            <option value="hazard_video">hazard_video</option>
          </select>
        </label>

        <label className="block text-sm">
          Question text
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>

        <div className="space-y-2">
          <div className="text-sm font-medium">Options — correct one selected</div>
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correctOptionId === opt.id}
                onChange={() => setCorrectOptionId(opt.id)}
              />
              <span className="w-5 text-sm text-black/50">{opt.id}</span>
              <input
                required
                value={opt.text}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                className="flex-1 rounded-md border border-black/15 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                disabled={options.length <= 2}
                className="text-sm text-red-600 underline disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="text-sm underline">
            + Add option
          </button>
        </div>

        <label className="block text-sm">
          Explanation
          <textarea
            required
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Subtopic (optional)
          <input
            value={subtopic}
            onChange={(e) => setSubtopic(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Source ref
          <input
            required
            value={sourceRef}
            onChange={(e) => setSourceRef(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
