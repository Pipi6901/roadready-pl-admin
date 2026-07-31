// One-time seed: imports the mobile app's current content.json export into
// Firestore, so the admin starts populated instead of empty.
//
// Usage: node scripts/seed.js
// Reads: ../roadready/content.json (regenerate first via
//   `npx tsx scripts/export-content-json.ts` in the roadready repo if stale)

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../serviceAccountKey.json');
const contentPath = path.resolve(__dirname, '../../roadready/content.json');

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function main() {
  const raw = fs.readFileSync(contentPath, 'utf8');
  const data = JSON.parse(raw);

  const primaryCountry = data.country;
  const countries = data.countries;
  const locales = data.locales;
  const topics = data.topics;
  const questions = data.questions;

  console.log(
    `Seeding: ${countries.length} countries, ${locales.length} locales, ${topics.length} topics, ${questions.length} questions`,
  );

  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  const set = (ref, value) => {
    batch.set(ref, value, { merge: true });
    ops += 1;
  };

  // --- locales ---------------------------------------------------------
  for (const [i, locale] of locales.entries()) {
    set(db.collection('locales').doc(locale.code), {
      code: locale.code,
      nameNative: locale.nameNative,
      nameEnglish: locale.nameEnglish,
      direction: locale.direction,
      flagEmoji: locale.flagEmoji,
      status: 'active',
      sortOrder: i,
    });
  }

  // --- countries ---------------------------------------------------------
  for (const [i, country] of countries.entries()) {
    set(db.collection('countries').doc(country.code), {
      code: country.code,
      name: country.name,
      flagEmoji: country.flagEmoji,
      authority: country.authority,
      legalNotice: country.legalNotice,
      testTypes: ['car'],
      status: country.status,
      questionCount: country.questionCount,
      mockTest: country.mockTest,
      currency: country.currency,
      defaultLocale: 'en',
      sortOrder: i,
      deletedAt: null,
    });
  }

  // --- draft testset for the primary (content-bearing) country ----------
  const testsetRef = db
    .collection('countries')
    .doc(primaryCountry.code)
    .collection('testsets')
    .doc('draft');
  set(testsetRef, {
    version: data.versionHash,
    status: 'draft',
    effectiveFrom: null,
    archivedAt: null,
    versionHash: null,
    bundleUrl: null,
    bundleSize: null,
    publishedAt: null,
    publishedBy: null,
    deletedAt: null,
  });

  await flush();

  // --- topics --------------------------------------------------------
  for (const [i, topic] of topics.entries()) {
    set(testsetRef.collection('topics').doc(topic.id), {
      name: topic.name,
      slug: topic.slug,
      icon: topic.icon,
      sortOrder: topic.sortOrder ?? i,
      color: null,
      deletedAt: null,
    });
  }
  await flush();

  // --- questions (batched, 400 at a time to stay under the 500-op limit) -
  let sortOrderByTopic = {};
  for (const question of questions) {
    const n = (sortOrderByTopic[question.topicId] ?? -1) + 1;
    sortOrderByTopic[question.topicId] = n;

    const qRef = testsetRef
      .collection('topics')
      .doc(question.topicId)
      .collection('questions')
      .doc(question.id);
    set(qRef, {
      type: question.type,
      text: question.text,
      options: question.options,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      mediaId: question.mediaId,
      subtopic: question.subtopic,
      sourceRef: question.sourceRef,
      sortOrder: n,
      deletedAt: null,
    });
    if (ops >= 400) await flush();
  }
  await flush();

  console.log('Seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
