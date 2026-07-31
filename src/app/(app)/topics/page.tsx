'use client';

import { addDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import Link from 'next/link';
import React from 'react';

import { useAuth } from '@/lib/auth-context';
import { topicsCollection, PRIMARY_COUNTRY_CODE } from '@/lib/content';
import { functions } from '@/lib/firebase';
import type { Topic } from '@/lib/types';

interface TopicRow extends Topic {
  id: string;
}

export default function TopicsPage() {
  const { role } = useAuth();
  const [topics, setTopics] = React.useState<TopicRow[] | null>(null);
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [icon, setIcon] = React.useState('book-open');
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [publishMessage, setPublishMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query(topicsCollection(), where('deletedAt', '==', null), orderBy('sortOrder'));
    return onSnapshot(q, (snap) => {
      setTopics(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Topic) })));
    });
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      const sortOrder = topics ? topics.length : 0;
      await addDoc(topicsCollection(), {
        name: name.trim(),
        slug: slug.trim(),
        icon: icon.trim() || 'book-open',
        sortOrder,
        color: null,
        deletedAt: null,
      });
      setName('');
      setSlug('');
    } finally {
      setSaving(false);
    }
  };

  const onRename = async (topic: TopicRow) => {
    const next = window.prompt('Topic name', topic.name);
    if (!next || next === topic.name) return;
    await updateDoc(doc(topicsCollection(), topic.id), { name: next });
  };

  const onDelete = async (topic: TopicRow) => {
    if (!window.confirm(`Soft-delete "${topic.name}"? Its questions stay in Firestore but won't publish.`)) return;
    await updateDoc(doc(topicsCollection(), topic.id), { deletedAt: new Date().toISOString() });
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!topics) return;
    const other = index + dir;
    if (other < 0 || other >= topics.length) return;
    const a = topics[index];
    const b = topics[other];
    await Promise.all([
      updateDoc(doc(topicsCollection(), a.id), { sortOrder: b.sortOrder }),
      updateDoc(doc(topicsCollection(), b.id), { sortOrder: a.sortOrder }),
    ]);
  };

  const onPublish = async () => {
    setPublishing(true);
    setPublishMessage(null);
    try {
      const publishTestSet = httpsCallable(functions, 'publishTestSet');
      const result = await publishTestSet({ countryCode: PRIMARY_COUNTRY_CODE });
      const data = result.data as { versionHash: string; questionCount: number; topicCount: number };
      setPublishMessage(`Published ${data.questionCount} questions across ${data.topicCount} topics (${data.versionHash}).`);
    } catch (err) {
      setPublishMessage(err instanceof Error ? `Publish failed: ${err.message}` : 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Topics</h1>
        {role === 'admin' ? (
          <button
            onClick={() => void onPublish()}
            disabled={publishing}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        ) : null}
      </div>

      {publishMessage ? <p className="rounded-md bg-black/5 p-3 text-sm">{publishMessage}</p> : null}

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3 rounded-xl border border-black/10 p-4">
        <label className="text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 block rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Icon
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="mt-1 block rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add topic
        </button>
      </form>

      <div className="divide-y divide-black/10 rounded-xl border border-black/10">
        {topics === null ? (
          <div className="p-4 text-sm text-black/50">Loading…</div>
        ) : topics.length === 0 ? (
          <div className="p-4 text-sm text-black/50">No topics yet.</div>
        ) : (
          topics.map((topic, i) => (
            <div key={topic.id} className="flex items-center justify-between gap-3 p-4">
              <Link href={`/topics/${topic.id}`} className="flex-1 hover:underline">
                <span className="font-medium">{topic.name}</span>
                <span className="ml-2 text-sm text-black/50">/{topic.slug}</span>
              </Link>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => void move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                  ↑
                </button>
                <button
                  onClick={() => void move(i, 1)}
                  disabled={i === topics.length - 1}
                  className="disabled:opacity-30"
                >
                  ↓
                </button>
                <button onClick={() => void onRename(topic)} className="underline">
                  Rename
                </button>
                <button onClick={() => void onDelete(topic)} className="text-red-600 underline">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
