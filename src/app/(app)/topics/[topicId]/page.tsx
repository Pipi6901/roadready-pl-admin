'use client';

import { doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';

import { questionsCollection, topicsCollection } from '@/lib/content';
import type { Question, Topic } from '@/lib/types';

interface QuestionRow extends Question {
  id: string;
}

export default function TopicQuestionsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = React.useState<Topic | null>(null);
  const [questions, setQuestions] = React.useState<QuestionRow[] | null>(null);

  React.useEffect(() => {
    return onSnapshot(doc(topicsCollection(), topicId), (snap) => {
      setTopic(snap.exists() ? (snap.data() as Topic) : null);
    });
  }, [topicId]);

  React.useEffect(() => {
    const q = query(questionsCollection(topicId), where('deletedAt', '==', null), orderBy('sortOrder'));
    return onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Question) })));
    });
  }, [topicId]);

  const onDelete = async (question: QuestionRow) => {
    if (!window.confirm('Soft-delete this question?')) return;
    await updateDoc(doc(questionsCollection(topicId), question.id), { deletedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/topics" className="text-sm text-black/50 hover:underline">
          ← Topics
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{topic?.name ?? topicId}</h1>
          <Link
            href={`/topics/${topicId}/questions/new`}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add question
          </Link>
        </div>
      </div>

      <div className="divide-y divide-black/10 rounded-xl border border-black/10">
        {questions === null ? (
          <div className="p-4 text-sm text-black/50">Loading…</div>
        ) : questions.length === 0 ? (
          <div className="p-4 text-sm text-black/50">No questions yet.</div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 p-4">
              <Link href={`/topics/${topicId}/questions/${q.id}`} className="flex-1 hover:underline">
                {q.text}
              </Link>
              <button onClick={() => void onDelete(q)} className="text-sm text-red-600 underline">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
