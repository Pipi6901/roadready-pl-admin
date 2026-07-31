import Link from 'next/link';

const CARDS = [
  { href: '/topics', title: 'Topics & questions', desc: 'Create, edit, and soft-delete the question bank.' },
  { href: '/import', title: 'CSV import', desc: 'Bulk-load or update questions from a spreadsheet.' },
  { href: '/users', title: 'Users', desc: 'Invite editors and admins.' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-black/10 p-4 hover:border-black/30"
          >
            <div className="font-medium">{c.title}</div>
            <div className="mt-1 text-sm text-black/60">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
